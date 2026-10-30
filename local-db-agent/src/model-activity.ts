/**
 * 模型生成播报（透明化，不提速）。
 *
 * 计划模式里模型的“思考/产出长文”窗口（例如把整份 HTML 报告作为工具参数流式写出，
 * 或首字延迟极长的慢调用）此前对前端几乎零感知，容易被当成卡死。
 * 这里从 StreamEvents 的 on_chat_model_start / on_chat_model_stream /
 * on_chat_model_end / on_tool_start 推断“模型此刻在干嘛”，
 * 通过 model_active 状态事件（节流脉冲）+ trace 时间线播报出来。
 *
 * 设计约定：
 * - 只在 emitTokens === false（步骤内部生成，用户看不到 token 流）时接入；
 *   用户可见的回答流本身就有“打字”效果，不需要播报。
 * - 不自建定时器：由 15s 心跳调用 tick()，覆盖“首 token 之前”的死寂窗口；
 *   生命周期由心跳的清理兜底，避免 SSR/测试环境的定时器泄漏。
 * - 老前端收到未知事件类型会忽略，向后兼容。
 */

export interface ModelActivityTrackerOptions {
  send: (payload: Record<string, unknown>) => void;
  /** 节流间隔（毫秒），默认 2000 */
  intervalMs?: number;
  /** 可注入时钟（仅测试用） */
  now?: () => number;
}

export interface ChunkLike {
  content?: unknown;
  tool_call_chunks?: Array<{ name?: unknown; args?: unknown } | undefined>;
}

export type ModelStreamEvent = { data?: { chunk?: ChunkLike } };

interface BusyState {
  traceId: string;
  stepId?: string;
  startedAt: number;
  lastSentAt: number;
  /** 打开以来是否已经发过 model_active（首 chunk 需要立即播报） */
  sentActive: boolean;
  chars: number;
  toolName: string;
}

/** 按流中出现的工具名生成人话标签；未知/尚无工具名时按“纯思考/等待”处理。 */
export function generationLabel(toolName: string): string {
  switch (toolName) {
    case 'render_html_report':
      return '正在编写 HTML 报告';
    case 'render_report':
      return '正在组装轻量报告组件';
    case 'render_chart':
      return '正在绘制图表';
    case 'run_sql':
      return '正在组织 SQL 查询';
    case 'run_saved_query':
      return '正在执行预置指标查询';
    case 'get_table_schema':
      return '正在查看表结构';
    case 'list_tables':
      return '正在扫描表清单';
    case 'search_tables':
      return '正在检索相关表';
    case 'search_knowledge':
    case 'read_knowledge':
      return '正在查阅知识库';
    case 'read_skill':
    case 'read_skill_file':
      return '正在读取执行技能';
    case 'ask_clarification':
      return '正在整理澄清问题';
    default:
      return '正在分析思考';
  }
}

function textLength(content: unknown): number {
  if (typeof content === 'string') return content.length;
  if (Array.isArray(content)) {
    return content.reduce((sum, part) => {
      if (typeof part === 'string') return sum + part.length;
      if (part && typeof part === 'object' && 'text' in part) {
        return sum + String((part as { text?: unknown }).text || '').length;
      }
      return sum;
    }, 0);
  }
  if (content && typeof content === 'object' && 'content' in content) {
    return textLength((content as { content: unknown }).content);
  }
  return 0;
}

export interface ModelActivityTracker {
  /** 一次模型调用开始（on_chat_model_start；首 chunk 兜底也会 open）。 */
  open(stepId?: string): void;
  /** 流式 chunk 进入（on_chat_model_stream，仅内部生成路径调用）。 */
  onChunk(event: ModelStreamEvent, stepId?: string): void;
  /** 本次模型调用结束（on_chat_model_end）或已切换到工具执行（on_tool_start）。 */
  close(): void;
  /** 心跳驱动：覆盖首 token 之前的死寂窗口。 */
  tick(): void;
  isOpen(): boolean;
}

const WAIT_LABEL_MS = 10_000;

export function createModelActivityTracker(
  options: ModelActivityTrackerOptions,
): ModelActivityTracker {
  const intervalMs = Math.max(500, options.intervalMs ?? 2000);
  const now = options.now || (() => Date.now());
  const send = options.send;
  let state: BusyState | null = null;

  const labelOf = (toolName: string): string => generationLabel(toolName);

  const sendActive = (elapsedMs: number): void => {
    if (!state) return;
    // 首字迟迟未到（10s 内没有任何字符产出）时改口“等待响应”，不假装模型在思考。
    const waiting = state.chars === 0 && elapsedMs >= WAIT_LABEL_MS;
    send({
      type: 'model_active',
      label: waiting ? '正在等待模型响应' : labelOf(state.toolName),
      chars: state.chars,
      elapsedMs,
      ...(state.stepId ? { stepId: state.stepId } : {}),
    });
  };

  const openTrace = (): void => {
    if (!state) return;
    send({
      type: 'trace',
      id: state.traceId,
      phase: state.stepId ? 'step' : 'answer',
      kind: 'generation',
      title: '模型生成',
      detail: labelOf(state.toolName),
      status: 'running',
      ...(state.stepId ? { stepId: state.stepId } : {}),
    });
  };

  const finishTrace = (): void => {
    if (!state) return;
    send({
      type: 'trace',
      id: state.traceId,
      phase: state.stepId ? 'step' : 'answer',
      kind: 'generation',
      title: '模型生成',
      detail: `${labelOf(state.toolName)}，输出 ${state.chars} 字符`,
      status: 'success',
      durationMs: now() - state.startedAt,
      ...(state.stepId ? { stepId: state.stepId } : {}),
    });
  };

  const open = (stepId?: string): void => {
    if (state) return;
    const startedAt = now();
    state = {
      traceId: `trace-gen-${startedAt}-${Math.random().toString(36).slice(2, 6)}`,
      stepId,
      startedAt,
      // 打开不立即脉冲：首 chunk（可知工具名）或 2s 后的 tick 才发
      lastSentAt: startedAt,
      sentActive: false,
      chars: 0,
      toolName: '',
    };
    openTrace();
  };

  const onChunk = (event: ModelStreamEvent, stepId?: string): void => {
    if (!state) open(stepId);
    if (!state) return;
    if (stepId && !state.stepId) state.stepId = stepId;
    const chunk = event.data?.chunk;
    if (!chunk) return;
    let grew = textLength(chunk.content);
    const chunks = Array.isArray(chunk.tool_call_chunks) ? chunk.tool_call_chunks : [];
    for (const item of chunks) {
      if (!item) continue;
      if (typeof item.args === 'string') grew += item.args.length;
      const name = typeof item.name === 'string' ? item.name : '';
      // 工具名在流式早期到达；只认第一次出现的名字，切换模型轮次由 close/open 负责
      if (name && !state.toolName) state.toolName = name;
    }
    state.chars += grew;
    const current = now();
    // 首 chunk 立即播报（此时工具名大概率已可知）；其余按节流间隔
    if (!state.sentActive || current - state.lastSentAt >= intervalMs) {
      state.lastSentAt = current;
      state.sentActive = true;
      sendActive(current - state.startedAt);
    }
  };

  const close = (): void => {
    if (!state) return;
    try {
      finishTrace();
    } finally {
      state = null;
    }
  };

  const tick = (): void => {
    if (!state) return;
    const current = now();
    if (current - state.lastSentAt < intervalMs) return;
    state.lastSentAt = current;
    state.sentActive = true;
    sendActive(current - state.startedAt);
  };

  return {
    open,
    onChunk,
    close,
    tick,
    isOpen: () => state !== null,
  };
}
