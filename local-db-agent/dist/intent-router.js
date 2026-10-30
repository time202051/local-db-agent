import { extractUsage } from './usage.js';
const REPORT_RE = /报告|日报|周报|月报|年报|年度|汇报|大屏|看板|面板|可视化页面|可视化报告|网页报告|html/i;
const ANALYSIS_RE = /分析|趋势|同比|环比|对比|分布|排名|异常|原因|诊断|拆解|建议|预测|画像|漏斗|结构|占比|贡献|归因|波动/i;
const MULTI_DIM_RE = /按.*(?:分组|维度|仓库|物料|分类|状态|月份|日期)|各.*(?:仓库|物料|分类|状态)|分别|多个|逐|分项|拆开|维度/i;
const SIMPLE_RE = /多少|总数|合计|总计|统计|查询|查一下|查下|列出|显示|平均|最大|最小|最近|top\s*\d+|前\s*\d+|明细|列表/i;
const CHAT_RE = /^(你好|您好|hi|hello|嗨|在吗|谢谢|感谢|辛苦了|你是谁|你能做什么|你可以做什么)[\s!！。,.?？]*$/i;
export function isChatQuestion(text) {
    return CHAT_RE.test(String(text || '').trim());
}
export function chatReply(question) {
    if (/谢谢|感谢|辛苦/.test(question)) {
        return '不客气。需要查数据、做分析或生成报告时，直接告诉我就行。';
    }
    if (/你是谁|你能做什么|你可以做什么/.test(question)) {
        return ('我是数据库分析助手。你可以直接问数据、分析趋势、查看当前页面表格，' +
            '或者让我生成 HTML 报告。');
    }
    return '你好，我是数据库分析助手。需要查数据、做分析或生成报告时，直接告诉我就行。';
}
function decision(mode, reason, confidence, overrides = {}) {
    return {
        mode,
        needsSql: mode !== 'quick',
        needsPlan: mode !== 'quick',
        needsReflection: true,
        needsCritic: mode !== 'quick',
        needsReport: mode === 'report',
        maxSteps: mode === 'quick' ? 1 : mode === 'report' ? 6 : 5,
        reason,
        confidence,
        ...overrides,
    };
}
export function routeExecutionMode(question, options = {}) {
    const text = String(question || '').trim();
    const wantsReport = options.wantsReport === true || REPORT_RE.test(text);
    if (wantsReport) {
        return decision('report', '用户要求报告/HTML/看板，需要完整 Plan 和报告生成', 0.98, {
            needsSql: true,
            needsReport: true,
            needsCritic: true,
        });
    }
    if (ANALYSIS_RE.test(text) || MULTI_DIM_RE.test(text)) {
        return decision('analyze', '问题包含分析、趋势、对比或多维拆解，需要多步计划', 0.9, {
            needsSql: true,
            needsCritic: true,
        });
    }
    // 短问题、单指标、单表查询，不需要 Planner，但仍然保留步骤反思和重试。
    if (text.length <= 60 && (SIMPLE_RE.test(text) || options.pageContext)) {
        return decision('quick', '问题较简单，走单步查询并保留轻量反思，不生成完整计划', 0.82, {
            needsSql: SIMPLE_RE.test(text),
            needsPlan: false,
            needsCritic: false,
            maxSteps: 1,
        });
    }
    // 无法可靠判断时，不用快速模式冒险。
    return decision('analyze', '问题不够明确或可能涉及多步，保守使用完整 Plan', 0.55, {
        needsSql: true,
        needsCritic: true,
    });
}
export function modeLabel(mode) {
    if (mode === 'quick')
        return '快速问答';
    if (mode === 'report')
        return '报告生成';
    return '分析模式';
}
export const INTENT_GATE_SYSTEM_PROMPT = `你是对话意图路由器，服务于一个通用数据库查询与可视化分析助手（可连接 SQL Server / KingbaseES，能力：用 SQL 查真实数据、看表结构、做趋势/对比/占比/异常等分析、生成可视化卡片和 HTML 报告）。

你的任务：判断用户最新一句消息"想干什么"，输出路由决策；闲聊时顺便替助手作答。

判定规则：
- chat：与数据无关的社交/咨询类话语——问候寒暄、感谢夸奖、询问助手身份/能力/自我介绍、查天气讲笑话等闲谈，或仅就助手使用方式发问 → mode=chat，并在 reply 用 2~4 句简短友好的中文作答，可自然结合下面的环境信息；reply 禁止杜撰数据值。
- quick：能用 0~2 条只读 SQL 直接答完的具体数据问题（单指标、单表、简单列表、"当前库有哪些表"之类） → mode=quick，reply 留空串。
- analyze：多口径、多维度、趋势/对比/分布/排名/归因、需要澄清口径，或要求日报/周报/大屏/HTML 报告等成型的产出 → mode=analyze，reply 留空串。
- 拿不准是否需要查数据库时倾向 quick/analyze，宁可多干活也不要把数据问题误判成 chat。

只输出 JSON：{"mode":"chat|quick|analyze","reply":"chat 时的中文回答，否则空串","confidence":0~1}`;
export function intentGateFallbackResult(durationMs = 0) {
    return {
        mode: 'analyze',
        reply: '',
        confidence: 0,
        byFallback: true,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
        durationMs,
    };
}
function gateExtractText(content) {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (typeof part === 'string')
                return part;
            if (part && typeof part === 'object' && 'text' in part) {
                return String(part.text || '');
            }
            return '';
        })
            .join('');
    }
    if (content && typeof content === 'object' && 'content' in content) {
        return gateExtractText(content.content);
    }
    return '';
}
function parseIntentGate(text) {
    const raw = String(text || '').trim();
    if (!raw)
        return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    const candidates = [
        raw,
        fenced && fenced[1] ? fenced[1] : '',
        first >= 0 && last > first ? raw.slice(first, last + 1) : '',
    ].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const mode = parsed.mode === 'chat' || parsed.mode === 'quick' || parsed.mode === 'analyze'
                ? parsed.mode
                : null;
            if (!mode)
                continue;
            const reply = String(parsed.reply ?? '').trim().slice(0, 2000);
            const confidenceRaw = Number(parsed.confidence);
            const confidence = Number.isFinite(confidenceRaw)
                ? Math.min(1, Math.max(0, confidenceRaw))
                : 0.6;
            return { mode, reply, confidence };
        }
        catch {
            continue;
        }
    }
    return null;
}
/**
 * 意图门：1 次轻量 LLM 调用决定本轮路由。
 * 超时（整体看门狗 + 中止 HTTP 调用）或解析失败 → 回落 analyze，行为不比没有意图门更差。
 */
export async function routeIntentByModel(invoke, input) {
    const startedAt = Date.now();
    const controller = new AbortController();
    let timer = null;
    const fallback = () => ({
        ...intentGateFallbackResult(Date.now() - startedAt),
    });
    const userParts = [
        input.contextNote ? `【环境】${input.contextNote}` : '',
        input.history?.trim() ? `【最近对话】\n${input.history.trim().slice(0, 1200)}` : '',
        `【用户最新消息】\n${String(input.question || '').slice(0, 600)}`,
        '请输出 JSON。',
    ].filter(Boolean);
    const messages = [
        { role: 'system', content: INTENT_GATE_SYSTEM_PROMPT },
        { role: 'user', content: userParts.join('\n\n') },
    ];
    try {
        const raced = await Promise.race([
            invoke(messages, { signal: controller.signal }),
            new Promise((resolve) => {
                timer = setTimeout(() => resolve(null), Math.max(500, input.timeoutMs));
            }),
        ]);
        if (raced === null) {
            controller.abort();
            return fallback();
        }
        const response = raced;
        const parsed = parseIntentGate(gateExtractText(response?.content));
        if (!parsed)
            return fallback();
        const usage = extractUsage(response?.usage_metadata);
        return {
            mode: parsed.mode,
            reply: parsed.mode === 'chat' ? parsed.reply : '',
            confidence: parsed.confidence,
            byFallback: false,
            usage: usage.inputTokens || usage.outputTokens
                ? usage
                : { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 },
            durationMs: Date.now() - startedAt,
        };
    }
    catch {
        return fallback();
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
