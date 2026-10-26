import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * 极简文件日志：agent 以隐藏进程运行，没有控制台，
 * 把工具调用/预算/错误落到 logs/agent.log，方便排查问题。
 */
const dir = process.env.AGENT_LOG_DIR || 'logs';
const file = join(dir, 'agent.log');
const MAX_SIZE = 5 * 1024 * 1024;

let queue: Promise<void> = Promise.resolve();

export function logLine(line: string): void {
  const text = `${new Date().toISOString()} ${line}\n`;
  queue = queue.then(async () => {
    try {
      await mkdir(dir, { recursive: true });
      const info = await stat(file).catch(() => null);
      if (info && info.size > MAX_SIZE) {
        await rename(file, `${file}.1`).catch(() => {});
      }
      await appendFile(file, text, 'utf8');
    } catch {
      /* 日志失败不影响主流程 */
    }
  });
}

/** 回答反馈单独落 JSONL，便于后续做采纳率/差评原因分析。 */
export function logFeedback(payload: unknown): Promise<void> {
  const text = JSON.stringify(payload) + '\n';
  queue = queue.then(async () => {
    try {
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, 'feedback.jsonl'), text, 'utf8');
    } catch {
      /* 反馈落盘失败不影响主流程 */
    }
  });
  return queue;
}

export async function flushLog(): Promise<void> {
  await queue;
}
