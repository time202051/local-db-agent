import Fastify from 'fastify';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { serverConfig, describeDb, resolveRequestConfig } from './config.js';
import { getRuntime, pingModel } from './runtime.js';
import { closeAllPools, pingDatabase } from './db.js';
import { decryptConfigPayload, handshake } from './crypto.js';
const app = Fastify({ logger: true });
app.addHook('onRequest', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    reply.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
});
app.options('/*', async (_request, reply) => {
    reply.code(204).send();
});
// 健康检查：仅表示服务存活，不含任何配置/密钥
app.get('/health', async () => ({ status: 'ok' }));
// 传输加密公钥：前端用它加密 config（含数据库密码 / API Key）
app.get('/handshake', async () => handshake);
function toMessage(message) {
    if (message.role === 'assistant')
        return new AIMessage(message.content);
    if (message.role === 'system')
        return new SystemMessage(message.content);
    return new HumanMessage(message.content);
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
let activeStreams = 0;
app.post('/chat/stream', async (request, reply) => {
    const body = request.body;
    if (!body || !Array.isArray(body.messages)) {
        reply.code(400).send({ error: 'messages 必须是数组' });
        return;
    }
    // 合并前端下发配置（不传则回落 .env 默认）
    let resolved;
    try {
        resolved = resolveOrThrow(configFromBody(body));
    }
    catch (e) {
        reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
        return;
    }
    request.log.info({ db: describeDb(resolved.db), model: resolved.llm.model }, 'chat/stream config');
    // 并发上限：防止同时发起大量对话放大 token 与数据库压力
    if (activeStreams >= resolved.maxConcurrent) {
        reply.code(429).send({ error: '当前会话过多，请稍后再试' });
        return;
    }
    // 历史直接交给 agent；上下文优化由 LangChain 的 summarizationMiddleware 负责
    const messages = body.messages.map(toMessage);
    const agent = getRuntime(resolved);
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    const send = (payload) => {
        raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    // 单轮总时长上限 + 客户端断开即中止（避免挂起、持续烧 token / 占着数据库）
    const controller = new AbortController();
    let timedOut = false;
    let finished = false;
    const turnTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, resolved.turnTimeoutMs);
    // 仅当客户端提前断开时才中止（正常结束时 finished=true）
    const onClientClose = () => {
        if (!finished)
            controller.abort();
    };
    reply.raw.on('close', onClientClose);
    activeStreams += 1;
    try {
        const stream = await agent.streamEvents({ messages }, { version: 'v2', recursionLimit: resolved.recursionLimit, signal: controller.signal });
        for await (const event of stream) {
            if (event.event === 'on_chat_model_stream') {
                const chunk = event.data?.chunk;
                const text = extractText(chunk?.content);
                if (text)
                    send({ type: 'token', content: text });
            }
            else if (event.event === 'on_tool_start') {
                send({
                    type: 'tool_start',
                    name: event.name,
                    input: event.data?.input,
                });
            }
            else if (event.event === 'on_tool_end') {
                send({
                    type: 'tool_result',
                    name: event.name,
                    output: extractText(event.data?.output),
                });
            }
        }
        send({ type: 'done' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        request.log.error({ err: error }, 'agent stream failed');
        send({ type: 'error', message: timedOut ? '处理超时，已中断' : message });
    }
    finally {
        finished = true;
        clearTimeout(turnTimer);
        reply.raw.off('close', onClientClose);
        activeStreams -= 1;
        raw.end();
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
    };
    try {
        const ping = await withTimeout(pingDatabase(resolved.db), 12000, '数据库连接超时');
        result.db = {
            ok: true,
            target: describeDb(resolved.db),
            database: ping.database,
            tableCount: ping.tableCount,
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
    result.ok = Boolean(result.db.ok) && Boolean(result.llm.ok);
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
