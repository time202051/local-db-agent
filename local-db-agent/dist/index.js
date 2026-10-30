import Fastify from 'fastify';
import { Command } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { countTokensApproximately } from 'langchain';
import { serverConfig, describeDb, resolveRequestConfig } from './config.js';
import { buildSystemPrompt, createChatModel, getRuntime, pingModel } from './runtime.js';
import { createTools, isTerminalVisualTool, VISUAL_TOOL_NAMES } from './tools.js';
import { closeAllPools, pingDatabase } from './db.js';
import { decryptConfigPayload, handshake } from './crypto.js';
import { TurnBudget, runWithBudget } from './budget.js';
import { BudgetExceededError } from './cost-guard.js';
import { logFeedback, logLine } from './log.js';
import { estimateCost, extractUsage, getUsageLedger } from './usage.js';
import { buildVariantHint, guessTemplateFromText, pickReportVariant } from './report-variant.js';
import { generateSuggestions } from './suggest.js';
import { getKnowledgeStatus } from './knowledge.js';
import { getSkillStatus } from './skills.js';
import { formatTableCandidates, retrieveTables } from './schema-cache.js';
import { runPlanTurn } from './plan-graph.js';
import { createModelActivityTracker } from './model-activity.js';
import { formatPageContextAnswer, isPageContextRelevant, isTableIdentificationQuestion, resolvePageContext, } from './page-context.js';
import { chatReply, isChatQuestion, modeLabel, routeIntentByModel, } from './intent-router.js';
// 图片以 dataURL 随消息上传，默认 1MB body 限制不够用
const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });
app.addHook('onRequest', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    reply.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
});
app.options('/*', async (_request, reply) => {
    reply.code(204).send();
});
// 健康检查：仅表示服务存活，不含任何配置/密钥
const bootedAt = new Date().toISOString();
app.get('/health', async () => ({
    status: 'ok',
    pid: process.pid,
    startedAt: bootedAt,
    uptimeSec: Math.round(process.uptime()),
}));
// 传输加密公钥：前端用它加密 config（含数据库密码 / API Key）
app.get('/handshake', async () => handshake);
function shortText(value, max) {
    return String(value == null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}
// 回答反馈：落 logs/feedback.jsonl，前端也可只监听组件事件不调用此接口
app.post('/chat/feedback', async (request, reply) => {
    const body = request.body;
    const rating = body?.rating === 'up' || body?.rating === 'down' ? body.rating : '';
    if (!rating) {
        reply.code(400);
        return { ok: false, error: 'rating 必须是 up 或 down' };
    }
    const reasons = Array.isArray(body?.reasons)
        ? body.reasons.map((item) => shortText(item, 40)).filter(Boolean).slice(0, 10)
        : [];
    let metaText = '';
    try {
        metaText = JSON.stringify(body?.meta || null);
    }
    catch {
        metaText = '';
    }
    await logFeedback({
        ts: new Date().toISOString(),
        conversationId: shortText(body?.conversationId, 120),
        messageId: shortText(body?.messageId, 160),
        rating,
        reasons,
        comment: shortText(body?.comment, 500),
        question: shortText(body?.question, 1000),
        answer: shortText(body?.answer, 4000),
        model: shortText(body?.model, 120),
        meta: metaText.length <= 8000 ? metaText : metaText.slice(0, 8000),
    });
    return { ok: true };
});
const MAX_MESSAGE_IMAGES = 3;
const MAX_IMAGE_DATA_URL_CHARS = 8 * 1024 * 1024;
function sanitizeImageUrls(input) {
    if (!Array.isArray(input))
        return [];
    return input
        .map((item) => String(item || ''))
        .filter((url) => /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url))
        .filter((url) => url.length <= MAX_IMAGE_DATA_URL_CHARS)
        .slice(0, MAX_MESSAGE_IMAGES);
}
function toMessage(message) {
    if (message.role === 'assistant')
        return new AIMessage(message.content);
    if (message.role === 'system')
        return new SystemMessage(message.content);
    const images = sanitizeImageUrls(message.images);
    if (!images.length)
        return new HumanMessage(message.content);
    const text = String(message.content || '').trim() || '请分析这张图片，提取关键信息并给出结论。';
    const content = [
        { type: 'text', text },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    return new HumanMessage({ content });
}
function resolveOrThrow(input) {
    return resolveRequestConfig(input);
}
/** 优先使用加密配置 configEnc（解密后），否则回落明文 config。 */
function configFromBody(body) {
    if (body.configEnc) {
        return decryptConfigPayload(body.configEnc);
    }
    return body.config;
}
const SSE_HEADERS = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
};
// /chat/stream 任何情况下都必须返回 SSE（包括 body 解析失败），
// 否则前端的 SSE 客户端只会报 content-type 不匹配，看不到真正的错误。
app.setErrorHandler((error, request, reply) => {
    if (request.url.split('?')[0] === '/chat/stream') {
        if (!reply.raw.headersSent)
            reply.raw.writeHead(200, SSE_HEADERS);
        if (!reply.raw.writableEnded) {
            const message = error instanceof Error ? error.message : String(error);
            reply.raw.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
            reply.raw.end();
        }
        return;
    }
    reply.send(error);
});
let activeStreams = 0;
const activeRunControls = new Map();
const noKnowledgeNotified = new Set();
let anonymousKnowledgeNotified = false;
app.post('/chat/stream', async (request, reply) => {
    const body = request.body;
    // 一开始就切到 SSE，校验失败也用 SSE 返回错误。
    // 否则前端 SSE 客户端会先报 "Expected content-type to be text/event-stream,
    // Actual: application/json"，真正的原因（缺配置、解密失败等）反而看不到。
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, SSE_HEADERS);
    const send = (payload) => {
        if (raw.writableEnded || raw.destroyed)
            return;
        raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    const fail = (message) => {
        send({ type: 'error', message });
        raw.end();
    };
    if (!body || !Array.isArray(body.messages)) {
        fail('messages 必须是数组');
        return;
    }
    // 合并前端下发配置（不传则回落 .env 默认）
    let resolved;
    try {
        resolved = resolveOrThrow(configFromBody(body));
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        request.log.warn({ err: e }, 'chat/stream config error');
        fail(message);
        return;
    }
    request.log.info({ db: describeDb(resolved.db), model: resolved.llm.model }, 'chat/stream config');
    // 并发上限：防止同时发起大量对话放大 token 与数据库压力
    if (activeStreams >= resolved.maxConcurrent) {
        fail('当前会话过多，请稍后再试');
        return;
    }
    const conversationKey = body.conversationId || 'anonymous';
    const ledger = getUsageLedger();
    const dailyDeny = ledger.check(conversationKey, resolved.maxDailyTokens);
    if (dailyDeny) {
        fail(dailyDeny);
        return;
    }
    const knowledgeStatus = getKnowledgeStatus();
    if (!knowledgeStatus.loaded) {
        const key = body.conversationId || '';
        const notified = key ? noKnowledgeNotified.has(key) : anonymousKnowledgeNotified;
        if (!notified) {
            send({ type: 'status', message: '未加载知识包，将按表结构分析' });
            if (key) {
                if (noKnowledgeNotified.size > 500)
                    noKnowledgeNotified.clear();
                noKnowledgeNotified.add(key);
            }
            else {
                anonymousKnowledgeNotified = true;
            }
            logLine(`knowledge pack: none (${knowledgeStatus.reason || 'generic mode'})`);
        }
    }
    // 历史直接交给 agent；上下文优化由 LangChain 的 summarizationMiddleware 负责
    const messages = body.messages.map(toMessage);
    // 报告版式轮换：在模型选模板前先按用户措辞推断类型，再结合上一份版式避开重复。
    const lastUserText = [...body.messages].reverse().find((message) => message.role === 'user')?.content || '';
    if (isChatQuestion(lastUserText)) {
        send({ type: 'token', content: chatReply(lastUserText) });
        send({ type: 'done' });
        raw.end();
        return;
    }
    let pageContext = resolvePageContext(body.pageContext);
    if (!pageContext) {
        const inlineUrl = lastUserText.match(/(?:https?:\/\/[^\s，。]+|\/?api\/[^\s，。]+)/i)?.[0];
        if (inlineUrl)
            pageContext = resolvePageContext({ apiUrl: inlineUrl });
    }
    const pageContextRelevant = Boolean(pageContext && (isPageContextRelevant(lastUserText) || /api\//i.test(lastUserText)));
    if (pageContext && pageContextRelevant) {
        const resolvedTable = pageContext.primaryTable
            ? `主表：${pageContext.primaryTable}${pageContext.tables.length > 1 ? `；候选：${pageContext.tables.slice(1).join('、')}` : ''}`
            : '未识别到表';
        send({
            type: 'trace',
            id: `trace-page-context-${Date.now()}`,
            phase: 'planning',
            kind: 'page_context',
            title: '识别当前页面',
            detail: `${pageContext.method} ${pageContext.apiUrl} → ${resolvedTable}`,
            status: pageContext.tables.length ? 'success' : 'error',
            data: {
                apiUrl: pageContext.apiUrl,
                method: pageContext.method,
                tables: pageContext.tables,
                primaryTable: pageContext.primaryTable,
                confidence: pageContext.confidence,
                source: pageContext.source,
                reason: pageContext.reason || '',
            },
        });
        if (!pageContext.tables.length) {
            send({
                type: 'status',
                message: `未识别当前页面接口对应的表：${pageContext.reason || '接口不在 api-map 中'}；将按普通问题继续。`,
            });
            logLine(`page context unresolved: ${pageContext.apiUrl} ${pageContext.reason || ''}`);
        }
        else {
            logLine(`page context ${pageContext.method} ${pageContext.apiUrl} -> ` +
                `${pageContext.primaryTable} (${pageContext.source})`);
        }
    }
    // 只问“当前页面接口对应哪张表”时，直接用本地映射回答。
    // 不进入 planner / SQL / 反思 / critic，避免简单问表消耗大量 token。
    if (isTableIdentificationQuestion(lastUserText)) {
        const answer = formatPageContextAnswer(pageContext);
        logLine(`page context direct answer: ${pageContext?.primaryTable || 'unresolved'}`);
        send({ type: 'token', content: answer });
        send({ type: 'done' });
        raw.end();
        return;
    }
    const wantsReport = /报告|日报|周报|月报|年报|年度|汇报|大屏|看板|面板|可视化页面|可视化报告|网页报告|html/i.test(lastUserText);
    // ---- 相关表检索先行发起（不 await）：与意图门并行，数据类问题里互相吸收耗时 ----
    const turnClockStart = Date.now();
    const retrievalPromise = withTimeout(retrieveTables(resolved.db, lastUserText, 8, {
        focusTables: pageContextRelevant ? pageContext?.tables || [] : [],
    }), 12000, '相关表检索超时')
        .then((tables) => ({ candidates: tables }))
        .catch((error) => {
        logLine(`table retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
        return { candidates: [] };
    });
    let candidates = [];
    // ---- 意图门：由模型判断本句想干什么，决定 chat/quick/analyze ----
    // 判断交给模型，不做词表枚举；超时/失败回落 analyze，行为不比没有意图门更差。
    // 每轮固定先走意图门（无开关）；与相关表检索并行，数据类问题里互相吸收耗时。
    const gateModel = createChatModel(resolved, { maxTokens: 300 });
    const gateInvoke = (messages, options) => Promise.resolve(gateModel.invoke(messages, { signal: options?.signal }));
    const gateResult = await routeIntentByModel(gateInvoke, {
        question: lastUserText,
        history: recentHistoryText(body.messages),
        contextNote: `接入数据库：${describeDb(resolved.db)}；业务口径与技能以知识包/技能包为准。`,
        timeoutMs: resolved.intentGateTimeoutMs,
    });
    logLine(`intent gate mode=${gateResult.mode} fallback=${gateResult.byFallback} ` +
        `confidence=${gateResult.confidence} ms=${gateResult.durationMs}`);
    send({
        type: 'trace',
        id: `trace-intent-${turnClockStart}`,
        phase: 'planning',
        kind: 'intent_gate',
        title: '识别意图',
        detail: gateResult.byFallback
            ? '意图门超时/失败，按分析模式继续'
            : `${gateResult.mode}（置信度 ${Math.round(gateResult.confidence * 100)}%）`,
        status: gateResult.byFallback ? 'error' : 'success',
        durationMs: gateResult.durationMs,
        data: {
            mode: gateResult.mode,
            byFallback: gateResult.byFallback,
            confidence: gateResult.confidence,
        },
    });
    // ---- chat 轮零管线：门生成的回答直接下发，记账后结束 ----
    if (gateResult.mode === 'chat' && !gateResult.byFallback && gateResult.reply.trim()) {
        const chatBudget = buildTurnBudget(resolved, false, false);
        if (gateResult.usage.inputTokens || gateResult.usage.outputTokens) {
            chatBudget.recordModelUsage(gateResult.usage, resolved.tokenPrices);
        }
        const reply = gateResult.reply.trim();
        send({ type: 'token', content: reply });
        send({
            type: 'usage',
            model: resolved.llm.model,
            inputTokens: chatBudget.usage.inputTokens,
            outputTokens: chatBudget.usage.outputTokens,
            cacheReadTokens: chatBudget.usage.cacheReadTokens,
            cacheCreationTokens: chatBudget.usage.cacheCreationTokens,
            estimatedCost: chatBudget.usage.cost,
            calls: chatBudget.usage.modelCalls,
            maxInputTokens: 0,
            elapsedMs: Date.now() - turnClockStart,
        });
        logLine(`intent gate chat reply chars=${reply.length}`);
        send({ type: 'done' });
        raw.end();
        return;
    }
    // ---- 执行模式决策：意图门判定优先；失败回落统一按 analyze 保守处理 ----
    const routeConfidence = gateResult.confidence;
    const routeReason = gateResult.byFallback
        ? '意图门超时/失败，保守使用完整分析'
        : `意图门判定：${gateResult.mode}`;
    let executionMode = gateResult.byFallback
        ? 'analyze'
        : gateResult.mode === 'chat'
            ? 'quick'
            : gateResult.mode;
    // 报告词命中时仍抬为报告轮，与既有行为一致；意图门只负责 chat/quick/analyze 边界
    if (wantsReport)
        executionMode = 'report';
    send({
        type: 'trace',
        id: `trace-route-${Date.now()}`,
        phase: 'planning',
        kind: 'route',
        title: '选择执行模式',
        detail: `${modeLabel(executionMode)}：${routeReason}`,
        status: 'success',
        durationMs: 0,
        data: {
            mode: executionMode,
            needsSql: executionMode !== 'quick',
            needsPlan: executionMode !== 'quick',
            needsCritic: executionMode !== 'quick',
            needsReport: executionMode === 'report',
            confidence: routeConfidence,
        },
    });
    if (wantsReport) {
        const userTurns = body.messages.filter((message) => message.role === 'user').length;
        const variant = pickReportVariant({
            template: guessTemplateFromText(lastUserText),
            userText: lastUserText,
            lastLayout: body.lastLayout,
            lastVisualStyle: body.lastVisualStyle,
            lastElements: Array.isArray(body.lastElements) ? body.lastElements : [],
            seed: `${body.conversationId || 'anonymous'}|${userTurns}`,
        });
        const hint = buildVariantHint(variant, {
            layout: body.lastLayout,
            visualStyle: body.lastVisualStyle,
            elements: Array.isArray(body.lastElements) ? body.lastElements : [],
        });
        const lastUserIndex = messages.reduce((index, message, i) => (message._getType() === 'human' ? i : index), -1);
        if (lastUserIndex >= 0) {
            messages.splice(lastUserIndex, 0, new SystemMessage(hint));
        }
        request.log.info({
            layout: variant.layout,
            visualStyle: variant.visualStyle,
            elements: variant.featureElements,
            reason: variant.reason,
        }, 'report variant');
        logLine(`report variant ${variant.reason} style=${variant.visualStyle} ` +
            `elements=${variant.featureElements.join(',')}`);
    }
    // 轻量分析：带上上一份组件结构，提示模型换一种组织方式，避免每份长得一样。
    if (!wantsReport) {
        const lastStructure = Array.isArray(body.lastStructure)
            ? body.lastStructure
                .map((item) => String(item || '').trim().slice(0, 40))
                .filter(Boolean)
                .slice(0, 20)
            : [];
        if (lastStructure.length) {
            const hint = `【版式去重】上一份可视化结构：${lastStructure.join(' → ')}。` +
                '本次请按数据重新设计组件顺序与分栏，不要复用同一套骨架；除非用户明确要求沿用。';
            const lastUserIndex = messages.reduce((index, message, i) => (message._getType() === 'human' ? i : index), -1);
            if (lastUserIndex >= 0) {
                messages.splice(lastUserIndex, 0, new SystemMessage(hint));
            }
            logLine(`visual structure dedupe=${lastStructure.join(',')}`);
        }
    }
    // 相关表检索：本轮先给 Top 8 紧凑目录，模型不需要全量 list_tables。
    // 检索已在意图门之前并行发起，这里只是收结果。
    {
        const retrievalResult = await retrievalPromise;
        candidates = retrievalResult.candidates;
        const block = formatTableCandidates(candidates);
        if (block) {
            const lastUserIndex = messages.reduce((index, message, i) => (message._getType() === 'human' ? i : index), -1);
            if (lastUserIndex >= 0) {
                messages.splice(lastUserIndex, 0, new SystemMessage(block));
            }
            logLine(`table retrieval candidates=${candidates.length}`);
        }
    }
    // 单轮总时长上限 + 客户端断开即中止（避免挂起、持续烧 token / 占着数据库）
    const usePlanMode = executionMode === 'quick' ||
        (resolved.enablePlanMode && !resolved.requireSqlApproval);
    const deepPlan = executionMode !== 'quick' && usePlanMode;
    if (!usePlanMode && pageContextRelevant && pageContext?.tables.length) {
        const pageHint = `【当前页面】${pageContext.method} ${pageContext.apiUrl}，主表：${pageContext.primaryTable || pageContext.tables[0]}。` +
            (pageContext.tables.length > 1
                ? `候选表：${pageContext.tables.join('、')}。`
                : '') +
            '用户说“当前页面/当前表格/当前数据”时默认指这张表。';
        const lastUserIndex = messages.reduce((index, message, i) => (message._getType() === 'human' ? i : index), -1);
        if (lastUserIndex >= 0)
            messages.splice(lastUserIndex, 0, new SystemMessage(pageHint));
    }
    const turnLimitMs = wantsReport || deepPlan ? resolved.planTurnTimeoutMs : resolved.turnTimeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    let finished = false;
    let turnTimer = null;
    let waitTimer = null;
    let continueResolver = null;
    let currentDeadline = Date.now() + turnLimitMs;
    const runId = `${conversationKey}:${Date.now().toString(36)}:${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    const resolveContinue = (ok) => {
        if (waitTimer) {
            clearTimeout(waitTimer);
            waitTimer = null;
        }
        const resolve = continueResolver;
        continueResolver = null;
        if (resolve)
            resolve(ok);
    };
    const armTurnTimer = (ms) => {
        if (turnTimer)
            clearTimeout(turnTimer);
        turnTimer = setTimeout(() => {
            timedOut = true;
            resolveContinue(false);
            controller.abort();
        }, ms);
    };
    const control = {
        runId,
        get deadline() {
            return currentDeadline;
        },
        waitForContinue: () => new Promise(resolve => {
            continueResolver = resolve;
            waitTimer = setTimeout(() => resolveContinue(false), 120_000);
        }),
        extendDeadline: () => {
            currentDeadline = Date.now() + turnLimitMs;
            armTurnTimer(turnLimitMs);
            send({ type: 'status', message: '已延长本轮分析时间' });
        },
    };
    armTurnTimer(turnLimitMs);
    activeRunControls.set(runId, { resolve: (ok) => resolveContinue(ok) });
    // 仅当客户端提前断开时才中止（正常结束时 finished=true）
    const onClientClose = () => {
        if (!finished) {
            resolveContinue(false);
            controller.abort();
        }
    };
    raw.on('close', onClientClose);
    activeStreams += 1;
    const budget = buildTurnBudget(resolved, wantsReport, deepPlan);
    let turnError = '';
    const turnStartedAt = Date.now();
    const activity = createModelActivityTracker({ send });
    const bridge = createTurnBridge({
        send,
        activity,
        resolved,
        budget,
        turnStartedAt,
        knowledge: knowledgeStatus,
        skills: getSkillStatus(),
    });
    const threadId = resolved.requireSqlApproval
        ? `${body.conversationId || 'anonymous'}:${Date.now().toString(36)}:${Math.random()
            .toString(36)
            .slice(2, 8)}`
        : undefined;
    logLine(`turn start model=${resolved.llm.model}`);
    const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', ts: Date.now() });
        activity.tick();
    }, 15000);
    let agent = null;
    await runWithBudget(budget, async () => {
        try {
            const runtime = getRuntime(resolved, wantsReport);
            agent = runtime;
            // 用 LangChain 自带的近似 token 统计判断本轮是否会触发摘要。
            // 只用于给前端一个轻量提示，不参与上下文裁剪。
            const approxTokens = countTokensApproximately([new SystemMessage(buildSystemPrompt(resolved, wantsReport)), ...messages], createTools(resolved.db, {
                batchQueries: !resolved.requireSqlApproval,
                reportMode: wantsReport,
                clarify: resolved.enableClarify,
            }));
            if (approxTokens >= resolved.summaryTriggerTokens) {
                logLine(`context summary expected tokens~${approxTokens}`);
                send({ type: 'status', message: '上下文较长，正在压缩…' });
            }
            // LangChain 的 summarizationMiddleware 会给内部摘要调用打 nostream 标签；
            // 用 streamEvents 自带的 excludeTags 过滤，不把内部摘要转发给用户。
            if (usePlanMode) {
                const result = await runPlanTurn({
                    cfg: resolved,
                    agent: runtime,
                    budget,
                    messages,
                    question: lastUserText,
                    candidates,
                    pageContext: pageContextRelevant ? pageContext : null,
                    executionMode,
                    reportMode: wantsReport,
                    bridge,
                    send,
                    controller,
                    control,
                });
                if (result.clarified) {
                    bridge.sendEnrichment();
                    send({ type: 'done' });
                    return;
                }
                if (result.stopped) {
                    if (bridge.visualGenerated()) {
                        send({ type: 'token', content: '报告已生成。' });
                    }
                    else {
                        send({ type: 'status', message: '已停止，保留已完成的分析结果' });
                    }
                    bridge.sendEnrichment();
                    send({ type: 'done' });
                    return;
                }
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            const streamConfig = {
                version: 'v2',
                recursionLimit: resolved.recursionLimit,
                signal: controller.signal,
            };
            if (threadId)
                streamConfig.configurable = { thread_id: threadId };
            const stream = await agent.streamEvents({ messages }, streamConfig, {
                excludeTags: ['nostream'],
            });
            for await (const event of stream) {
                bridge.handle(event);
                if (bridge.shouldStop()) {
                    controller.abort();
                    break;
                }
            }
            if (bridge.clarifyPending()) {
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (bridge.shouldStop()) {
                send({ type: 'token', content: '报告已生成。' });
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (agent && threadId) {
                const interrupts = await collectInterrupts(agent, threadId);
                if (interrupts.length) {
                    bridge.sendEnrichment();
                    send({ type: 'interrupt', threadId, interrupts });
                    return;
                }
            }
            bridge.sendEnrichment();
            send({ type: 'done' });
        }
        catch (error) {
            if (bridge.clarifyPending()) {
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (bridge.shouldStop()) {
                send({ type: 'token', content: '报告已生成。' });
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (agent && threadId) {
                const interrupts = await collectInterrupts(agent, threadId);
                if (interrupts.length) {
                    bridge.sendEnrichment();
                    send({ type: 'interrupt', threadId, interrupts });
                    return;
                }
            }
            const rawMessage = error instanceof Error ? error.message : String(error);
            const message = timedOut
                ? '处理超时，已中断'
                : error instanceof BudgetExceededError
                    ? rawMessage
                    : /recursion limit/i.test(rawMessage)
                        ? '本次分析步骤过多已中断。请缩小时间范围、减少指标，或把问题拆成几步再问。'
                        : rawMessage;
            turnError = rawMessage;
            request.log.error({ err: error }, 'agent stream failed');
            logLine(`turn error ${rawMessage}`);
            bridge.sendEnrichment();
            send({ type: 'error', message });
        }
        finally {
            finished = true;
            if (turnTimer)
                clearTimeout(turnTimer);
            resolveContinue(false);
            activeRunControls.delete(runId);
            clearInterval(heartbeat);
            raw.off('close', onClientClose);
            activeStreams -= 1;
            ledger.record(conversationKey, {
                inputTokens: budget.usage.inputTokens,
                outputTokens: budget.usage.outputTokens,
                cacheReadTokens: budget.usage.cacheReadTokens,
                cacheCreationTokens: budget.usage.cacheCreationTokens,
            }, budget.usage.cost);
            logLine(`turn end ${budget.summary()} ${bridge.stats()}` +
                `${bridge.clarifyPending()
                    ? ' stop=clarify'
                    : bridge.shouldStop()
                        ? ' stop=visual'
                        : ''}${turnError ? ' error=1' : ''}` +
                `${budget.usage.exceeded.length ? ' exceeded=1' : ''}`);
            raw.end();
        }
    });
});
// SQL 审批恢复：配合 /chat/stream 的 interrupt 事件，用 LangChain Command 继续执行
app.post('/chat/continue', async (request, reply) => {
    const body = request.body;
    const entry = body?.runId ? activeRunControls.get(body.runId) : null;
    if (!entry) {
        reply.code(404).send({ ok: false, error: '分析已结束或已过期，请重新发起' });
        return;
    }
    entry.resolve(true);
    reply.send({ ok: true });
});
app.post('/chat/resume', async (request, reply) => {
    const body = request.body;
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, SSE_HEADERS);
    const send = (payload) => {
        if (raw.writableEnded || raw.destroyed)
            return;
        raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    const fail = (message) => {
        send({ type: 'error', message });
        raw.end();
    };
    if (!body || typeof body.threadId !== 'string' || !body.threadId.trim()) {
        fail('缺少 threadId，无法恢复审批');
        return;
    }
    if (!Array.isArray(body.decisions) || !body.decisions.length) {
        fail('缺少审批结果 decisions');
        return;
    }
    let resolved;
    try {
        resolved = resolveOrThrow(configFromBody(body));
    }
    catch (e) {
        fail(e instanceof Error ? e.message : String(e));
        return;
    }
    if (!resolved.requireSqlApproval) {
        fail('当前未启用 SQL 审批');
        return;
    }
    if (activeStreams >= resolved.maxConcurrent) {
        fail('当前会话过多，请稍后再试');
        return;
    }
    const resumeKey = body.threadId;
    const resumeLedger = getUsageLedger();
    const resumeDeny = resumeLedger.check(resumeKey, resolved.maxDailyTokens);
    if (resumeDeny) {
        fail(resumeDeny);
        return;
    }
    const controller = new AbortController();
    let timedOut = false;
    let finished = false;
    const turnTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, resolved.turnTimeoutMs);
    const onClientClose = () => {
        if (!finished)
            controller.abort();
    };
    raw.on('close', onClientClose);
    activeStreams += 1;
    const budget = new TurnBudget({
        maxSqlQueries: resolved.maxSqlQueries,
        maxSchemaCalls: resolved.maxSchemaCalls,
        maxResultChars: Math.max(resolved.maxResultChars, 20000),
        maxTotalToolChars: Math.max(resolved.maxTotalToolChars, 120000),
        maxTurnTokens: resolved.maxReportTurnTokens,
        maxModelCalls: resolved.maxReportModelCalls,
        strictNumberCheck: resolved.strictNumberCheck,
    }, { unlimitedQueries: true });
    const activity = createModelActivityTracker({ send });
    const bridge = createTurnBridge({
        send,
        activity,
        resolved,
        budget,
        turnStartedAt: Date.now(),
        knowledge: getKnowledgeStatus(),
        skills: getSkillStatus(),
    });
    const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', ts: Date.now() });
        activity.tick();
    }, 15000);
    let turnError = '';
    await runWithBudget(budget, async () => {
        try {
            const agent = getRuntime(resolved);
            const stream = await agent.streamEvents(new Command({ resume: { decisions: body.decisions } }), {
                version: 'v2',
                recursionLimit: resolved.recursionLimit,
                signal: controller.signal,
                configurable: { thread_id: body.threadId },
            }, { excludeTags: ['nostream'] });
            for await (const event of stream) {
                bridge.handle(event);
                if (bridge.shouldStop()) {
                    controller.abort();
                    break;
                }
            }
            if (bridge.clarifyPending()) {
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (bridge.shouldStop()) {
                send({ type: 'token', content: '报告已生成。' });
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            const interrupts = await collectInterrupts(agent, body.threadId);
            bridge.sendEnrichment();
            if (interrupts.length) {
                send({ type: 'interrupt', threadId: body.threadId, interrupts });
            }
            else {
                send({ type: 'done' });
            }
        }
        catch (error) {
            if (bridge.clarifyPending()) {
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            if (bridge.shouldStop()) {
                send({ type: 'token', content: '报告已生成。' });
                bridge.sendEnrichment();
                send({ type: 'done' });
                return;
            }
            const interrupts = await collectInterrupts(getRuntime(resolved), body.threadId).catch(() => []);
            if (interrupts.length) {
                bridge.sendEnrichment();
                send({ type: 'interrupt', threadId: body.threadId, interrupts });
                return;
            }
            const rawMessage = error instanceof Error ? error.message : String(error);
            const message = timedOut
                ? '处理超时，已中断'
                : error instanceof BudgetExceededError
                    ? rawMessage
                    : /recursion limit/i.test(rawMessage)
                        ? '本次分析步骤过多已中断。请缩小时间范围、减少指标，或把问题拆成几步再问。'
                        : rawMessage;
            turnError = rawMessage;
            request.log.error({ err: error }, 'agent resume failed');
            logLine(`resume error ${rawMessage}`);
            bridge.sendEnrichment();
            send({ type: 'error', message });
        }
        finally {
            finished = true;
            clearTimeout(turnTimer);
            clearInterval(heartbeat);
            raw.off('close', onClientClose);
            activeStreams = Math.max(0, activeStreams - 1);
            resumeLedger.record(resumeKey, {
                inputTokens: budget.usage.inputTokens,
                outputTokens: budget.usage.outputTokens,
                cacheReadTokens: budget.usage.cacheReadTokens,
                cacheCreationTokens: budget.usage.cacheCreationTokens,
            }, budget.usage.cost);
            logLine(`resume end ${budget.summary()} ${bridge.stats()}` +
                `${bridge.clarifyPending()
                    ? ' stop=clarify'
                    : bridge.shouldStop()
                        ? ' stop=visual'
                        : ''}${turnError ? ' error=1' : ''}`);
            raw.end();
        }
    });
});
// 追问建议：只调用大模型，不连接数据库；失败时返回空数组，前端保留本地兜底推荐
app.post('/chat/suggest', async (request, reply) => {
    const body = request.body;
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
    const meta = body?.meta || null;
    if (!question || !answer) {
        reply.send({ items: [] });
        return;
    }
    const hasData = Number(meta?.queries) > 0 ||
        Number(meta?.rowCount) > 0 ||
        (Array.isArray(meta?.tables) && meta.tables.length > 0) ||
        Boolean(meta?.report);
    if (!hasData) {
        reply.send({ items: [] });
        return;
    }
    let resolved;
    try {
        resolved = resolveOrThrow(configFromBody(body ?? {}));
    }
    catch (e) {
        request.log.warn({ err: e }, 'chat/suggest config error');
        reply.send({ items: [] });
        return;
    }
    if (!resolved.enableSuggestions) {
        reply.send({ items: [] });
        return;
    }
    const suggestKey = body?.conversationId || 'anonymous';
    const ledger = getUsageLedger();
    if (ledger.check(suggestKey, resolved.maxDailyTokens)) {
        reply.send({ items: [] });
        return;
    }
    try {
        const { items, usage } = await generateSuggestions(resolved.llm, {
            question,
            answer,
            meta,
        });
        const cost = estimateCost(usage, resolved.tokenPrices);
        ledger.record(suggestKey, usage, cost);
        logLine(`suggest usage input=${usage.inputTokens} output=${usage.outputTokens} ` +
            `cache=${usage.cacheReadTokens} cost=${cost.toFixed(4)}`);
        reply.send({
            items,
            usage: {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                cacheReadTokens: usage.cacheReadTokens,
                estimatedCost: cost,
            },
        });
    }
    catch (e) {
        request.log.warn({ err: e }, 'chat/suggest failed');
        reply.send({ items: [] });
    }
});
// 连接自检：真实连一下数据库 + 轻量探一下大模型；用于前端打开组件时友好提示
app.post('/config/check', async (request, reply) => {
    const body = request.body;
    let resolved;
    try {
        resolved = resolveOrThrow(configFromBody(body ?? {}));
    }
    catch (e) {
        reply.send({ ok: false, error: e instanceof Error ? e.message : String(e) });
        return;
    }
    const result = {
        ok: false,
        db: { ok: false, target: describeDb(resolved.db) },
        llm: { ok: false, model: resolved.llm.model },
        knowledge: getKnowledgeStatus(),
        skills: getSkillStatus(),
    };
    try {
        const ping = await withTimeout(pingDatabase(resolved.db), 12000, '数据库连接超时');
        result.db = {
            ok: true,
            type: resolved.db.type,
            target: describeDb(resolved.db),
            database: ping.database,
            tableCount: ping.tableCount,
            ...(ping.version ? { version: ping.version } : {}),
            ...(ping.readOnly !== undefined ? { readOnly: ping.readOnly } : {}),
        };
    }
    catch (e) {
        result.db = {
            ok: false,
            target: describeDb(resolved.db),
            error: e instanceof Error ? e.message : String(e),
        };
    }
    try {
        await withTimeout(pingModel(resolved.llm), 20000, '大模型响应超时');
        result.llm = { ok: true, model: resolved.llm.model };
    }
    catch (e) {
        result.llm = {
            ok: false,
            model: resolved.llm.model,
            error: e instanceof Error ? e.message : String(e),
        };
    }
    result.ok =
        Boolean(result.db.ok) && Boolean(result.llm.ok);
    request.log.info({ db: result.db.ok, llm: result.llm.ok, target: describeDb(resolved.db) }, 'config/check');
    reply.send(result);
});
function withTimeout(p, ms, message) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        p.then((value) => {
            clearTimeout(timer);
            resolve(value);
        }, (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
/** 取最近几轮对话的纯文本摘要，供意图门识别上下文（不含图片）。 */
function recentHistoryText(messages, maxTurns = 3) {
    const parts = [];
    for (const message of messages.slice(-6)) {
        if (message.role === 'system')
            continue;
        const text = shortText(message.content, 160);
        if (!text)
            continue;
        parts.push(`${message.role === 'user' ? '用户' : '助手'}：${text}`);
    }
    return parts.slice(-maxTurns * 2).join('\n');
}
/** 单轮预算：报告/计划轮放宽 SQL 条数与 token 上限（原内联逻辑抽公共函数）。 */
function buildTurnBudget(resolved, wantsReport, deepPlan) {
    return new TurnBudget({
        // 普通问答仍用前端 limits；报告轮不按 SQL/Schema 条数限制
        maxSqlQueries: resolved.maxSqlQueries,
        maxSchemaCalls: resolved.maxSchemaCalls,
        // 报告/计划轮需要完整聚合结果；普通问答保持原样
        maxResultChars: wantsReport || deepPlan ? Math.max(resolved.maxResultChars, 20000) : resolved.maxResultChars,
        maxTotalToolChars: wantsReport || deepPlan
            ? Math.max(resolved.maxTotalToolChars, 120000)
            : resolved.maxTotalToolChars,
        maxTurnTokens: wantsReport
            ? resolved.maxReportTurnTokens
            : deepPlan
                ? resolved.maxPlanTurnTokens
                : resolved.maxTurnTokens,
        maxModelCalls: wantsReport
            ? resolved.maxReportModelCalls
            : deepPlan
                ? resolved.maxPlanModelCalls
                : resolved.maxModelCalls,
        strictNumberCheck: resolved.strictNumberCheck,
    }, { unlimitedQueries: wantsReport || deepPlan });
}
function toRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
/** 把工具返回的 JSON 字符串解析成对象；失败返回 null。 */
function safeParseObject(text) {
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
function safeParseArray(text) {
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
const TOOL_LABELS = {
    list_tables: '浏览数据表',
    get_table_schema: '查看表结构',
    run_sql: '执行查询',
    ask_clarification: '请求补充信息',
    render_report: '生成分析报表',
    render_html_report: '生成 HTML 报告',
    render_chart: '生成图表',
    search_tables: '检索相关表',
    search_knowledge: '搜索知识包',
    read_knowledge: '读取知识文档',
    run_saved_query: '执行预置查询',
    list_skills: '浏览技能',
    read_skill: '读取技能',
    read_skill_file: '读取技能文件',
};
function toolLabel(name) {
    return TOOL_LABELS[name] || name;
}
/** 工具入参里可能带整份 HTML/CSS，SSE 只下发页面真正需要的轻量字段。 */
/** 从 SQL 里粗略提取 from/join 的表名，用于回答引用标签。 */
function extractTablesFromSql(sql) {
    const text = String(sql || '');
    const result = [];
    const seen = new Set();
    const ident = '(`[^`]+`|"[^"]+"|\\[[^\\]]+\\]|[\\w$]+)';
    const re = new RegExp(`\\b(?:from|join)\\s+${ident}(?:\\s*\\.\\s*${ident})?`, 'gi');
    let match;
    while ((match = re.exec(text))) {
        const first = match[1] || '';
        const second = match[2] || '';
        const table = (second ? first + '.' + second : first)
            .replace(/[`"[\]]/g, '')
            .replace(/\s*\.\s*/g, '.')
            .trim();
        if (!table || seen.has(table))
            continue;
        seen.add(table);
        result.push(table);
    }
    return result;
}
function compactToolInput(name, input) {
    if (!input || typeof input !== 'object')
        return undefined;
    const raw = input;
    if (name === 'run_sql') {
        const queries = Array.isArray(raw.queries)
            ? raw.queries.map((item) => String(item || '')).filter(Boolean)
            : [];
        if (queries.length) {
            return { sql: queries.join(';\n'), queries, count: queries.length };
        }
        return { sql: raw.sql };
    }
    if (name === 'get_table_schema') {
        const tableList = Array.isArray(raw.tables)
            ? raw.tables.map((item) => String(item || '')).filter(Boolean)
            : [];
        const base = tableList.length
            ? { tables: tableList, count: tableList.length }
            : { table: raw.table };
        return {
            ...base,
            ...(typeof raw.detail === 'string' && raw.detail ? { detail: raw.detail } : {}),
            ...(Array.isArray(raw.columns) && raw.columns.length ? { columns: raw.columns } : {}),
        };
    }
    if (name === 'list_tables')
        return { keyword: raw.keyword || '' };
    if (name === 'search_tables' || name === 'search_knowledge')
        return { query: raw.query };
    if (name === 'read_knowledge')
        return { path: raw.path };
    if (name === 'run_saved_query')
        return { key: raw.key, params: raw.params };
    if (name === 'list_skills')
        return { keyword: raw.keyword || '' };
    if (name === 'read_skill')
        return { name: raw.name };
    if (name === 'read_skill_file')
        return { name: raw.name, path: raw.path };
    if (name === 'ask_clarification') {
        return {
            question: raw.question,
            fields: Array.isArray(raw.fields) ? raw.fields : [],
        };
    }
    return undefined;
}
function summarizeToolOutput(name, output) {
    const parsed = safeParseObject(output) || {};
    const warnings = Array.isArray(parsed.warnings)
        ? parsed.warnings.map((item) => String(item)).filter(Boolean)
        : [];
    const summary = {
        success: parsed.success !== false,
        rowCount: 0,
        truncated: parsed.truncated === true,
        columns: 0,
        tableCount: 0,
        table: '',
        component: '',
        title: '',
        template: '',
        layout: '',
        visualStyle: '',
        warnings,
        error: typeof parsed.error === 'string' ? parsed.error : '',
        detail: '',
        hitCount: 0,
        hits: [],
        skillCount: 0,
        skills: [],
        chars: 0,
        path: '',
        skillName: '',
    };
    if (name === 'run_sql' || name === 'run_saved_query') {
        summary.rowCount =
            Number(parsed.rowCount) || (Array.isArray(parsed.rows) ? parsed.rows.length : 0);
        summary.columns = Array.isArray(parsed.columns) ? parsed.columns.length : 0;
        summary.truncated = parsed.truncated === true;
    }
    else if (name === 'get_table_schema') {
        const schemas = Array.isArray(parsed.schemas) ? parsed.schemas : [];
        if (schemas.length) {
            summary.tableCount = schemas.length;
            // 批量时不要拼成一个 "A, B" 的假表名；单表仍保留原名给 tool_end 展示
            summary.table =
                schemas.length === 1 && schemas[0] && typeof schemas[0] === 'object'
                    ? String(schemas[0].table || '')
                    : '';
            summary.columns = schemas.reduce((sum, item) => {
                const columns = item && typeof item === 'object' ? item.columns : undefined;
                return sum + (Array.isArray(columns) ? columns.length : 0);
            }, 0);
        }
        else {
            summary.table = typeof parsed.table === 'string' ? parsed.table : '';
            summary.columns = Array.isArray(parsed.columns) ? parsed.columns.length : 0;
        }
    }
    else if (name === 'list_tables') {
        summary.tableCount = Number(parsed.tableCount) || 0;
    }
    else if (name === 'ask_clarification') {
        summary.title = '等待补充信息';
    }
    else if (name === 'render_report' || name === 'render_html_report' || name === 'render_chart') {
        summary.component = typeof parsed.component === 'string' ? parsed.component : '';
        summary.title = typeof parsed.title === 'string' ? parsed.title : '';
        summary.template = typeof parsed.template === 'string' ? parsed.template : '';
        summary.layout = typeof parsed.layout === 'string' ? parsed.layout : '';
        summary.visualStyle = typeof parsed.visualStyle === 'string' ? parsed.visualStyle : '';
    }
    else if (name === 'search_knowledge') {
        const list = safeParseArray(output);
        summary.hitCount = list.length;
        summary.hits = list
            .map(item => {
            const row = item && typeof item === 'object' ? item : {};
            return typeof row.title === 'string' ? row.title : String(row.path || '');
        })
            .filter(Boolean)
            .slice(0, 5);
        summary.detail = list.length
            ? `命中 ${list.length} 篇：${summary.hits.slice(0, 3).join('、')}`
            : '未命中知识文档';
    }
    else if (name === 'list_skills') {
        const list = Array.isArray(parsed.skills) ? parsed.skills : [];
        summary.skillCount = list.length;
        summary.skills = list
            .map(item => {
            const row = item && typeof item === 'object' ? item : {};
            return typeof row.name === 'string' ? row.name : '';
        })
            .filter(Boolean)
            .slice(0, 8);
        summary.detail = list.length
            ? `${list.length} 个技能：${summary.skills.slice(0, 4).join('、')}`
            : '没有匹配的技能';
    }
    else if (name === 'read_knowledge') {
        summary.path = typeof parsed.path === 'string' ? parsed.path : '';
        summary.chars = typeof parsed.content === 'string' ? parsed.content.length : 0;
        summary.detail = summary.path ? `${summary.path}（${summary.chars} 字）` : `${summary.chars} 字`;
    }
    else if (name === 'read_skill') {
        summary.skillName = typeof parsed.name === 'string' ? parsed.name : '';
        summary.chars = typeof parsed.content === 'string' ? parsed.content.length : 0;
        summary.detail = summary.skillName
            ? `${summary.skillName}（${summary.chars} 字）`
            : `${summary.chars} 字`;
    }
    else if (name === 'read_skill_file') {
        summary.skillName = typeof parsed.name === 'string' ? parsed.name : '';
        summary.path = typeof parsed.path === 'string' ? parsed.path : '';
        summary.chars = typeof parsed.content === 'string' ? parsed.content.length : 0;
        summary.detail = [summary.skillName, summary.path, `${summary.chars} 字`]
            .filter(Boolean)
            .join(' · ');
    }
    else if (name === 'search_tables') {
        const list = safeParseArray(output);
        summary.tableCount = list.length;
        summary.detail = list.length ? `${list.length} 张候选表` : '未命中表';
    }
    return summary;
}
function extractText(content) {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (typeof part === 'string')
                return part;
            if (part && typeof part === 'object' && 'text' in part) {
                return String(part.text ?? '');
            }
            return '';
        })
            .join('');
    }
    if (content && typeof content === 'object' && 'content' in content) {
        return extractText(content.content);
    }
    return '';
}
/** 把 LangChain 的 streamEvents 统一映射成前端 SSE 事件（普通对话与 HITL 恢复共用）。 */
function createTurnBridge({ send, activity, resolved, budget, turnStartedAt, knowledge, skills, }) {
    const toolStarts = new Map();
    const citations = [];
    const tablesUsed = new Set();
    const dataWarnings = new Set();
    let maxInputTokens = 0;
    let observedModelCalls = 0;
    let totalRowCount = 0;
    let anyTruncated = false;
    let lastReportSpec = null;
    /** HTML 报告已成功下发：无需再让模型补最后一句，省一次完整上下文调用。 */
    let stopAfterVisual = false;
    /** 已请求用户补充信息：本轮暂停，等待前端表单提交后重新发起。 */
    let clarifyPending = false;
    const addUsage = (usage) => {
        if (!usage)
            return;
        observedModelCalls += 1;
        maxInputTokens = Math.max(maxInputTokens, usage.input_tokens || 0);
        // 兜底：某些 provider/流式路径下 cost-guard 可能拿不到 usage_metadata，
        // 这里只在中间件没有记录到本次调用时补记，避免重复计数。
        if (budget.usage.modelCalls < observedModelCalls) {
            budget.recordModelUsage(extractUsage(usage), resolved.tokenPrices);
        }
    };
    /** 便于日志判断 token 是“单次上下文大”还是“模型调用次数多”。 */
    const stats = () => `calls=${budget.usage.modelCalls} input=${budget.usage.inputTokens} ` +
        `output=${budget.usage.outputTokens} maxInput=${maxInputTokens} ` +
        `cache=${budget.usage.cacheReadTokens} cost=${budget.usage.cost.toFixed(4)}`;
    const reportMeta = () => {
        if (!lastReportSpec)
            return null;
        return {
            component: lastReportSpec.component,
            title: lastReportSpec.title,
            template: lastReportSpec.template,
            layout: lastReportSpec.layout,
            visualStyle: lastReportSpec.visualStyle,
            period: lastReportSpec.period,
            scope: lastReportSpec.scope,
            sources: lastReportSpec.sources,
            warnings: lastReportSpec.warnings,
        };
    };
    const sendEnrichment = () => {
        const elapsedMs = Date.now() - turnStartedAt;
        send({
            type: 'usage',
            model: resolved.llm.model,
            inputTokens: budget.usage.inputTokens,
            outputTokens: budget.usage.outputTokens,
            cacheReadTokens: budget.usage.cacheReadTokens,
            cacheCreationTokens: budget.usage.cacheCreationTokens,
            estimatedCost: budget.usage.cost,
            calls: budget.usage.modelCalls,
            maxInputTokens,
            elapsedMs,
        });
        send({
            type: 'meta',
            elapsedMs,
            queries: budget.usage.sqlQueries,
            schemaCalls: budget.usage.schemaCalls,
            rowCount: totalRowCount,
            truncated: anyTruncated,
            tables: Array.from(tablesUsed),
            citations,
            warnings: Array.from(dataWarnings),
            report: reportMeta(),
            knowledge,
            skills,
            usage: {
                inputTokens: budget.usage.inputTokens,
                outputTokens: budget.usage.outputTokens,
                cacheReadTokens: budget.usage.cacheReadTokens,
                estimatedCost: budget.usage.cost,
                modelCalls: budget.usage.modelCalls,
            },
        });
    };
    const handle = (event, options = {}) => {
        if (event.event === 'on_chat_model_stream') {
            if (options.emitTokens === false) {
                // 步骤内部生成（用户看不到 token 流）：期间脉冲播报模型动态，
                // 避免长窗口（整份报告吐字 / 慢首字）被当成卡死。
                activity.onChunk(event, options.stepId);
                return;
            }
            const chunk = event.data?.chunk;
            const text = extractText(chunk?.content);
            if (text)
                send({ type: 'token', content: text });
            return;
        }
        if (event.event === 'on_chat_model_start') {
            // 内部生成的模型调用开始：先在时间线挂一条“模型生成”进行中
            if (options.emitTokens === false)
                activity.open(options.stepId);
            return;
        }
        if (event.event === 'on_tool_start') {
            // 模型已产出工具调用、开始执行：内部生成窗口结束
            activity.close();
            const name = event.name || 'tool';
            const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
            const input = event.data?.input;
            const startedAt = Date.now();
            const compactInput = compactToolInput(name, input);
            toolStarts.set(runId, {
                name,
                startedAt,
                input: compactInput && typeof compactInput === 'object'
                    ? compactInput
                    : undefined,
            });
            if (name === 'get_table_schema') {
                const schemaInput = input;
                const tableList = Array.isArray(schemaInput?.tables)
                    ? schemaInput.tables
                    : [schemaInput?.table];
                tableList.forEach((item) => {
                    if (typeof item === 'string' && item.trim())
                        tablesUsed.add(item.trim());
                });
            }
            send({
                type: 'tool_start',
                id: runId,
                stepId: options.stepId,
                name,
                label: toolLabel(name),
                input: compactToolInput(name, input),
                startedAt,
            });
            return;
        }
        if (event.event === 'on_tool_end') {
            const name = event.name || 'tool';
            const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
            const rawOutput = event.data?.output;
            const output = extractText(rawOutput);
            // 可视化工具把完整 spec 放在 ToolMessage.artifact，content 只有轻量确认；
            // 不能再用 content 解析 spec，否则前端拿不到 HTML/CSS/charts。
            const artifact = toRecord(toRecord(rawOutput)?.artifact);
            const summary = summarizeToolOutput(name, output);
            const started = toolStarts.get(runId);
            if (summary.table)
                tablesUsed.add(summary.table);
            if (name === 'run_sql') {
                totalRowCount += summary.rowCount;
                if (summary.truncated)
                    anyTruncated = true;
                const rawInput = started?.input || {};
                const queryList = Array.isArray(rawInput.queries)
                    ? rawInput.queries.map((item) => String(item || '')).filter(Boolean)
                    : [];
                const sqlText = queryList.length
                    ? queryList.join(';\n')
                    : String(rawInput.sql || '');
                if (sqlText.trim()) {
                    citations.push({
                        index: citations.length + 1,
                        id: runId,
                        sql: sqlText,
                        tables: extractTablesFromSql(sqlText),
                        rowCount: summary.rowCount,
                        truncated: summary.truncated,
                        durationMs: started ? Date.now() - started.startedAt : undefined,
                    });
                }
            }
            summary.warnings.forEach((item) => dataWarnings.add(item));
            let clarifyEvent = null;
            if (name === 'ask_clarification') {
                const parsedClarify = safeParseObject(output) || {};
                const fields = Array.isArray(parsedClarify.fields)
                    ? parsedClarify.fields.slice(0, 5)
                    : [];
                if (fields.length) {
                    clarifyEvent = {
                        question: typeof parsedClarify.question === 'string'
                            ? parsedClarify.question
                            : '请补充以下信息，以便更准确地分析',
                        fields,
                        allowSkip: parsedClarify.allow_skip !== false,
                        toolId: runId,
                    };
                }
            }
            const isVisual = VISUAL_TOOL_NAMES.has(name);
            const parsedOutput = safeParseObject(output);
            const rawSpec = isVisual ? artifact || parsedOutput : null;
            // success:false 是覆盖率门禁/参数错误的工具结果，不能当成 visual 下发
            const spec = rawSpec && rawSpec.success !== false ? rawSpec : null;
            if (spec) {
                lastReportSpec = spec;
                const specWarnings = Array.isArray(spec.warnings) ? spec.warnings : [];
                specWarnings.forEach((item) => dataWarnings.add(String(item)));
            }
            const visualError = isVisual && !spec
                ? typeof parsedOutput?.error === 'string'
                    ? parsedOutput.error
                    : '可视化结果解析失败'
                : '';
            send({
                type: 'tool_end',
                id: runId,
                stepId: options.stepId,
                name,
                label: toolLabel(name),
                ok: summary.success && !visualError,
                durationMs: started ? Date.now() - started.startedAt : undefined,
                summary: {
                    rowCount: summary.rowCount,
                    truncated: summary.truncated,
                    columns: summary.columns,
                    tableCount: summary.tableCount,
                    table: summary.table,
                    component: summary.component,
                    title: summary.title,
                    template: summary.template,
                    layout: summary.layout,
                    visualStyle: summary.visualStyle,
                    warnings: summary.warnings,
                    error: summary.error || visualError,
                    detail: summary.detail,
                    hitCount: summary.hitCount,
                    hits: summary.hits,
                    skillCount: summary.skillCount,
                    skills: summary.skills,
                    chars: summary.chars,
                    path: summary.path,
                    skillName: summary.skillName,
                },
            });
            if (clarifyEvent) {
                clarifyPending = true;
                send({ type: 'clarify', ...clarifyEvent, stepId: options.stepId });
            }
            if (spec) {
                send({ type: 'visual', ...spec, toolId: runId, stepId: options.stepId });
                // 报告已是本轮最终产物：不再让模型重新读取整份 HTML 参数去补一句结尾
                if (isTerminalVisualTool(name))
                    stopAfterVisual = true;
            }
            else if (isVisual) {
                send({
                    type: 'tool_result',
                    id: runId,
                    stepId: options.stepId,
                    name,
                    output: output || JSON.stringify({ success: false, error: visualError }),
                });
            }
            else {
                send({ type: 'tool_result', id: runId, stepId: options.stepId, name, output });
            }
            return;
        }
        if (event.event === 'on_tool_error') {
            const name = event.name || 'tool';
            const runId = event.run_id || `tool-${Date.now()}-${toolStarts.size}`;
            const started = toolStarts.get(runId);
            const rawError = event.data?.error;
            const message = rawError instanceof Error
                ? rawError.message || '工具执行失败'
                : typeof rawError === 'string' && rawError
                    ? rawError
                    : '工具执行失败';
            send({
                type: 'tool_end',
                id: runId,
                stepId: options.stepId,
                name,
                label: toolLabel(name),
                ok: false,
                durationMs: started ? Date.now() - started.startedAt : undefined,
                summary: { error: message },
            });
            return;
        }
        if (event.event === 'on_chat_model_end') {
            activity.close();
            addUsage(event.data?.output?.usage_metadata);
        }
    };
    return {
        handle,
        sendEnrichment,
        stats,
        shouldStop: () => stopAfterVisual || clarifyPending,
        clarifyPending: () => clarifyPending,
        visualGenerated: () => stopAfterVisual,
    };
}
async function collectInterrupts(agent, threadId) {
    try {
        const graph = agent.graph;
        const state = await graph.getState({ configurable: { thread_id: threadId } });
        const tasks = Array.isArray(state.tasks) ? state.tasks : [];
        const interrupts = tasks.flatMap((task) => Array.isArray(task.interrupts) ? task.interrupts : []);
        return interrupts.map((item) => ({ id: item.id, value: item.value }));
    }
    catch {
        return [];
    }
}
async function shutdown(signal) {
    app.log.info(`收到 ${signal}，正在关闭 ...`);
    await app.close().catch(() => { });
    await closeAllPools();
    process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
app
    .listen({ port: serverConfig.port, host: serverConfig.host })
    .then((address) => app.log.info(`agent-local 已启动: ${address}`))
    .catch((error) => {
    app.log.error(error);
    process.exit(1);
});
