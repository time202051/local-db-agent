import { describe, expect, it } from 'vitest';
import {
  createModelActivityTracker,
  generationLabel,
} from './model-activity.js';
import type { ModelStreamEvent } from './model-activity.js';

function collect(): { sent: Array<Record<string, unknown>>; send: (p: unknown) => void } {
  const sent: Array<Record<string, unknown>> = [];
  return { sent, send: (payload) => sent.push(payload as Record<string, unknown>) };
}

function modelClock() {
  let t = 0;
  return { now: () => t, at: (ms: number) => (t = ms) };
}

function chunk(
  opts: { content?: string; name?: string; args?: string } = {},
): ModelStreamEvent {
  return {
    data: {
      chunk: {
        content: opts.content,
        tool_call_chunks:
          opts.name !== undefined || opts.args !== undefined
            ? [{ name: opts.name, args: opts.args }]
            : undefined,
      },
    },
  };
}

describe('generationLabel', () => {
  it('工具名映射为人话标签，未知给“正在分析思考”', () => {
    expect(generationLabel('render_html_report')).toBe('正在编写 HTML 报告');
    expect(generationLabel('run_sql')).toBe('正在组织 SQL 查询');
    expect(generationLabel('get_table_schema')).toBe('正在查看表结构');
    expect(generationLabel('read_skill')).toBe('正在读取执行技能');
    expect(generationLabel('some_new_tool')).toBe('正在分析思考');
    expect(generationLabel('')).toBe('正在分析思考');
  });
});

describe('createModelActivityTracker', () => {
  it('首 chunk 即播报（带工具名与字符计数），2s 内不重复', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.onChunk(chunk({ name: 'run_sql', args: '{"sql":"SEL' }));
    expect(tracker.isOpen()).toBe(true);
    const first = sent.find((item) => item.type === 'model_active');
    expect(first?.label).toBe('正在组织 SQL 查询');
    expect(first?.chars).toBe(11); // args 即 11 个字符
    expect(first?.elapsedMs).toBe(0);

    clock.at(1500);
    tracker.onChunk(chunk({ args: '"}}', content: '分析中' }));
    expect(sent.filter((item) => item.type === 'model_active')).toHaveLength(1);

    clock.at(2500);
    tracker.onChunk(chunk({ content: '继续' }));
    const second = sent.filter((item) => item.type === 'model_active');
    expect(second).toHaveLength(2);
    expect(second[1]?.chars).toBe(19); // 11 + 6 + 2
    expect(second[1]?.label).toBe('正在组织 SQL 查询');
  });

  it('无工具名时按“正在分析思考”播报；close 落 trace 并复位', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.onChunk(chunk({ content: '合唱' }));
    expect(sent.find((item) => item.type === 'model_active')?.label).toBe('正在分析思考');
    expect(tracker.isOpen()).toBe(true);

    clock.at(9400);
    tracker.close();
    expect(tracker.isOpen()).toBe(false);
    const traces = sent.filter((item) => item.type === 'trace' && item.kind === 'generation');
    expect(traces).toHaveLength(2);
    expect(traces[0]?.status).toBe('running');
    expect(traces[1]?.status).toBe('success');
    expect(traces[1]?.durationMs).toBe(9400);
    expect(String(traces[1]?.detail)).toContain('输出 2 字符');

    // 关闭后不再发事件
    const before = sent.length;
    tracker.close();
    expect(sent).toHaveLength(before);
  });

  it('纯文本调用无 on_chat_model_start 也能靠首 chunk 打开，工具名出现后切标签', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.onChunk(chunk({ content: '思考' }));
    clock.at(3000);
    tracker.onChunk(chunk({ name: 'render_html_report', args: '<html>' }));
    const acts = sent.filter((item) => item.type === 'model_active');
    expect(acts).toHaveLength(2);
    expect(acts[1]?.label).toBe('正在编写 HTML 报告');
    expect(acts[1]?.chars).toBe(8); // 2 + 6
  });

  it('tick 兜底死寂窗口：10s 无字符产出改口“正在等待模型响应”', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.open('step-1');
    const traces = sent.filter((item) => item.type === 'trace' && item.kind === 'generation');
    expect(traces).toHaveLength(1);
    expect(traces[0]?.status).toBe('running');
    expect(traces[0]?.stepId).toBe('step-1');

    clock.at(1500);
    tracker.tick(); // 未到节流间隔
    expect(sent.filter((item) => item.type === 'model_active')).toHaveLength(0);

    clock.at(2500);
    tracker.tick();
    expect(sent.find((item) => item.type === 'model_active')?.label).toBe('正在分析思考');

    clock.at(12500);
    tracker.tick();
    const waiting = sent.filter((item) => item.type === 'model_active');
    expect(waiting[waiting.length - 1]?.label).toBe('正在等待模型响应');
    expect(waiting[waiting.length - 1]?.chars).toBe(0);
  });

  it('tick 后再收到 chunk 不会重复播报；close 后 tick 静默', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.open();
    clock.at(2500);
    tracker.tick(); // active#1
    clock.at(2600);
    tracker.onChunk(chunk({ content: 'a' })); // 距上次 100ms，不播
    expect(sent.filter((item) => item.type === 'model_active')).toHaveLength(1);

    clock.at(2700);
    tracker.close();
    clock.at(28000);
    tracker.tick();
    expect(sent.filter((item) => item.type === 'model_active')).toHaveLength(1);
    expect(sent.filter((item) => item.type === 'trace' && item.kind === 'generation'))
      .toHaveLength(2);
  });

  it('重复 open 忽略；新一次调用重新打开并生成新 trace id', () => {
    const clock = modelClock();
    const { sent, send } = collect();
    const tracker = createModelActivityTracker({ send, intervalMs: 2000, now: clock.now });

    clock.at(0);
    tracker.open('s1');
    clock.at(10);
    tracker.open('s2');
    tracker.onChunk(chunk({ content: 'x' }));
    clock.at(30);
    tracker.close();
    clock.at(40);
    tracker.open('s3');
    tracker.close();

    const openTraces = sent.filter(
      (item) => item.type === 'trace' && item.kind === 'generation' && item.status === 'running',
    );
    expect(sent.filter((item) => item.type === 'trace' && item.status === 'running')).toHaveLength(
      2,
    );
    expect(openTraces).toHaveLength(2);
    const ids = new Set([openTraces[0]?.id, openTraces[1]?.id]);
    expect(ids.size).toBe(2);
    expect(sent.filter((item) => item.type === 'trace' && item.status === 'success'))
      .toHaveLength(2);
  });
});
