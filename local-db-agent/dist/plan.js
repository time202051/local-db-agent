import { createHash } from 'node:crypto';
import { z } from 'zod';
export const PlannerStepSchema = z.object({
    title: z.string().describe('步骤标题，短语，例如：查询近 30 天出库单量'),
    intent: z.string().describe('这一步要做什么、用哪些表/口径，不要写 SQL 全文'),
    tables: z.array(z.string()).max(8).optional().describe('涉及的表名'),
    knowledgeRefs: z.array(z.string()).max(8).optional().describe('知识库文档路径或章节'),
    successCriteria: z.string().optional().describe('怎样算完成，例如：拿到按日趋势，行数>0'),
    dependsOn: z
        .array(z.union([z.string(), z.number()]))
        .max(8)
        .optional()
        .describe('依赖的前置步骤序号（从 1 开始）或步骤标题；独立步骤不填，可并行执行'),
});
export const PlannerSchema = z.object({
    goal: z.string().describe('用规划者自己的理解概括分析对象、范围和产出，禁止原样复制用户原话'),
    simple: z.boolean().optional().describe('是否能用一个步骤直接答完'),
    steps: z.array(PlannerStepSchema).min(1).max(8),
});
export const PLANNER_SYSTEM_PROMPT = `你是一个数据库分析任务的规划器。你只负责制定执行计划，不执行 SQL，也不回答用户。

输出要求：
- 用中文描述目标与步骤。
- goal 必须是你对任务的理解，说明“分析/查询什么对象、什么范围、要产出什么”，不要原样复制用户最后一句话，也不要把“帮我/我想要/换了模型再生成一次”等对话内容写进去。
- 简单、单指标的问题只给 1 步；需要多口径、趋势、对比、报告时拆成 2~8 步。
- 每一步必须有明确的成功标准（successCriteria），便于执行后检查。
- 互相独立的步骤不要写 dependsOn，它们会并行执行；有依赖时在 dependsOn 里写前置步骤序号（从 1 开始）或标题。
- 报告类最后一步必须依赖前面所有数据步骤。
- 表名只能来自提供的候选表或已知表；不确定时写空，不要臆造。
- 知识库里有指标口径、状态码、表说明时，在 knowledgeRefs 里写文档路径或章节。
- 不要写完整 SQL；只在 intent 里描述口径和过滤条件。
- 如果用户要求报告/大屏，最后一步必须是“生成 HTML 报告”。
- 不要输出 Markdown，不要输出解释性前后缀。`;
const REPORT_RE = /报告|日报|周报|月报|年报|年度|汇报|大屏|出一份|来一份/;
const ANALYSIS_RE = /分析|趋势|同比|环比|对比|分布|排名|异常|原因|诊断|明细|拆解|建议|预测|画像|漏斗|结构/;
const SIMPLE_RE = /多少|总数|合计|总计|统计|查询|查一下|查下|列出|显示|平均|最大|最小|最近|top\s*\d+|前\s*\d+/i;
export function isLikelySimpleQuestion(text) {
    const question = String(text || '').trim();
    if (!question || question.length > 40)
        return false;
    if (REPORT_RE.test(question))
        return false;
    if (ANALYSIS_RE.test(question))
        return false;
    return SIMPLE_RE.test(question);
}
function limitText(value, max, fallback = '') {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, max);
}
function stringList(value, max = 8) {
    if (!Array.isArray(value))
        return [];
    return value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .slice(0, max);
}
function newPlanId() {
    return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function comparableText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
}
function isEchoGoal(goal, question) {
    const goalText = comparableText(goal);
    const questionText = comparableText(question);
    if (!goalText || !questionText)
        return false;
    if (goalText === questionText)
        return true;
    const shorter = Math.min(goalText.length, questionText.length);
    if (shorter < 8)
        return false;
    return goalText.includes(questionText) || questionText.includes(goalText);
}
function deriveGoal(steps, question) {
    const tables = Array.from(new Set(steps.flatMap(step => step.tables).filter(Boolean))).slice(0, 3);
    const titles = steps
        .map(step => step.title)
        .filter(Boolean)
        .slice(0, 4);
    if (tables.length) {
        return `围绕 ${tables.join('、')} 完成 ${steps.length} 个目标：${titles.join(' → ')}`.slice(0, 300);
    }
    const details = steps
        .map(step => {
        const intent = String(step.intent || '').trim();
        return intent && !isEchoGoal(intent, question) ? intent : step.title;
    })
        .filter(Boolean)
        .slice(0, 3);
    return `按以下目标推进：${details.join('；')}`.slice(0, 300);
}
export function normalizePlan(draft, options = {}) {
    const planId = newPlanId();
    const maxSteps = Math.max(1, options.maxSteps || 8);
    const rawSteps = Array.isArray(draft.steps) ? draft.steps : [];
    const draftSteps = rawSteps.slice(0, maxSteps);
    const steps = draftSteps.map((step, index) => ({
        id: `${planId}-s${index + 1}`,
        index,
        title: limitText(step.title, 80, `步骤 ${index + 1}`),
        intent: limitText(step.intent, 600, '完成当前步骤'),
        tables: stringList(step.tables),
        knowledgeRefs: stringList(step.knowledgeRefs),
        successCriteria: limitText(step.successCriteria, 300),
        dependsOn: [],
        status: 'pending',
    }));
    const resolveDependsOn = (raw, index) => {
        if (!Array.isArray(raw))
            return [];
        const out = new Set();
        for (const item of raw) {
            let depIndex = -1;
            if (typeof item === 'number' && Number.isFinite(item)) {
                depIndex = Math.floor(item) - 1;
            }
            else if (typeof item === 'string') {
                const text = item.trim();
                if (/^\d+$/.test(text)) {
                    depIndex = Number(text) - 1;
                }
                else {
                    depIndex = steps.findIndex(step => step.id === text || step.title === text);
                }
            }
            if (depIndex >= 0 && depIndex < index && depIndex < steps.length) {
                out.add(steps[depIndex].id);
            }
        }
        return Array.from(out);
    };
    steps.forEach((step, index) => {
        step.dependsOn = resolveDependsOn(draftSteps[index]?.dependsOn, index);
    });
    if (!steps.length) {
        const question = limitText(options.fallbackQuestion, 120, '分析用户问题');
        steps.push({
            id: `${planId}-s1`,
            index: 0,
            title: '查询并回答',
            intent: question,
            tables: [],
            knowledgeRefs: [],
            successCriteria: '拿到可回答问题的数据或明确说明缺失原因',
            dependsOn: [],
            status: 'pending',
        });
    }
    if (options.reportMode) {
        const reportSteps = steps.filter(step => isReportStep(step));
        const dataSteps = steps.filter(step => !isReportStep(step));
        const reportStep = reportSteps.length > 0
            ? { ...reportSteps[reportSteps.length - 1] }
            : {
                id: `${planId}-s${steps.length + 1}`,
                index: steps.length,
                title: '生成 HTML 报告',
                intent: '基于前面步骤的数据生成完整 HTML 报告，逐项标注 coverage。',
                tables: [],
                knowledgeRefs: [],
                successCriteria: 'render_html_report 成功并返回 coverage',
                dependsOn: [],
                status: 'pending',
            };
        const base = dataSteps.slice(0, Math.max(0, maxSteps - 1));
        if (!base.length) {
            // 报告轮至少要有一个数据目标，不能把“查询+报告”压成一个步骤。
            base.push({
                id: `${planId}-s0`,
                index: 0,
                title: '查询并校验数据',
                intent: limitText(options.fallbackQuestion || draft.goal, 300, '查询并校验回答所需的数据'),
                tables: [],
                knowledgeRefs: [],
                successCriteria: '拿到可回答的数据，并完成一次基本校验',
                dependsOn: [],
                status: 'pending',
            });
        }
        steps.length = 0;
        steps.push(...base, {
            ...reportStep,
            id: `${planId}-s${base.length + 1}`,
            index: base.length,
            dependsOn: base.map(step => step.id),
            status: 'pending',
        });
    }
    const rawGoal = limitText(draft.goal, 300, '');
    const question = String(options.fallbackQuestion || '').trim();
    const goal = rawGoal && !isEchoGoal(rawGoal, question) ? rawGoal : deriveGoal(steps, question || rawGoal);
    return {
        planId,
        revision: 1,
        goal: goal || '分析用户问题',
        simple: draft.simple === true || steps.length === 1,
        mode: options.reportMode ? 'report' : 'analyze',
        steps: steps.map((step, index) => ({ ...step, index })),
    };
}
export function isReportStep(step) {
    if (!step)
        return false;
    const title = String(step.title || '');
    const criteria = String(step.successCriteria || '');
    // 标题同时包含查询/分析动作时，它仍是数据步骤；否则会把数据步骤吞掉，
    // 最终只剩一个“查询并回答”，用户看不到小目标。
    if (/(查询|分析|统计|计算|核对|校验|汇总|获取)/.test(title))
        return false;
    return /报告|大屏|HTML/i.test(title) || /render_(?:html_)?report/i.test(criteria);
}
export function fallbackPlan(question, options = {}) {
    return normalizePlan({
        goal: question || '分析用户问题',
        simple: true,
        steps: [
            {
                title: '查询并回答',
                intent: question || '根据用户问题查询数据并回答',
                successCriteria: '拿到可回答问题的数据或明确说明缺失原因',
            },
        ],
    }, { ...options, fallbackQuestion: question });
}
export function buildQuickPlan(question, tables = []) {
    const plan = normalizePlan({
        goal: '快速回答用户问题',
        simple: true,
        steps: [
            {
                title: '快速回答',
                intent: question || '根据用户问题查询数据并回答',
                tables: Array.from(new Set(tables.filter(Boolean))).slice(0, 4),
                successCriteria: '拿到可回答的数据，并完成一次基本校验',
            },
        ],
    }, { maxSteps: 1, fallbackQuestion: question });
    plan.mode = 'quick';
    plan.simple = true;
    return plan;
}
export function parsePlanDraft(text) {
    const raw = String(text || '').trim();
    if (!raw)
        return null;
    const candidates = [raw];
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1])
        candidates.push(fenced[1]);
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first)
        candidates.push(raw.slice(first, last + 1));
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (!parsed || !Array.isArray(parsed.steps) || !parsed.steps.length)
                continue;
            return parsed;
        }
        catch {
            continue;
        }
    }
    return null;
}
export function planEventPayload(plan) {
    return {
        planId: plan.planId,
        revision: plan.revision,
        goal: plan.goal,
        simple: plan.simple,
        mode: plan.mode || 'analyze',
        steps: plan.steps.map(step => ({
            id: step.id,
            index: step.index,
            title: step.title,
            intent: step.intent,
            tables: step.tables,
            knowledgeRefs: step.knowledgeRefs,
            successCriteria: step.successCriteria,
            dependsOn: step.dependsOn,
            status: step.status,
        })),
    };
}
export function hashSql(sql) {
    return createHash('sha1').update(String(sql || '').replace(/\s+/g, ' ').trim()).digest('hex');
}
export function evaluateStep(observation, options) {
    const issues = [];
    if (observation.clarify) {
        return { verdict: 'finish', reason: '等待用户补充信息', issues, feedback: '' };
    }
    if (observation.visual) {
        return { verdict: 'finish', reason: '可视化结果已生成', issues, feedback: '' };
    }
    if (observation.timedOut) {
        issues.push({ type: 'timeout', detail: '当前步骤执行超时，已停止本次工具循环' });
        return {
            verdict: 'abort',
            reason: '步骤执行超时，等待用户决定是否继续',
            issues,
            feedback: '',
        };
    }
    if (observation.budgetBlocked) {
        return {
            verdict: 'continue',
            reason: '已达到本轮预算上限，基于已有结果继续',
            issues,
            feedback: '',
        };
    }
    for (const message of observation.errorMessages) {
        issues.push({ type: 'sql_error', detail: message });
    }
    const empty = observation.sql.some(item => item.ok && item.rowCount === 0);
    if (empty) {
        issues.push({ type: 'empty', detail: '查询成功但结果为空，需确认过滤条件/时间范围/表名是否正确' });
    }
    const truncated = observation.sql.find(item => item.truncated);
    if (truncated) {
        issues.push({ type: 'truncated', detail: '结果被截断，聚合或缩小范围后再取数' });
    }
    const seen = options.seenSql || new Set();
    const duplicates = observation.sql.filter(item => seen.has(item.hash));
    if (duplicates.length) {
        issues.push({ type: 'duplicate_sql', detail: '重复执行了本轮已有的 SQL，需要换条件或基于已有结果继续' });
    }
    const hardError = observation.errorMessages.length > 0;
    const visualError = observation.tools.some(item => item.name.startsWith('render') && !item.ok);
    if (visualError) {
        issues.push({ type: 'visual_error', detail: '报告/图表生成失败，需要修正参数后重试' });
    }
    const canRetry = options.attempt < options.maxRetries;
    const emptyFirstTime = empty && !options.emptyRetried && options.attempt < 1;
    const truncatedFirstTime = Boolean(truncated) && !options.truncatedRetried && options.attempt < 1;
    if ((hardError ||
        visualError ||
        duplicates.length > 0 ||
        emptyFirstTime ||
        truncatedFirstTime) &&
        canRetry) {
        const feedback = buildFeedback(issues, '请修正后重新执行当前步骤');
        return {
            verdict: 'retry',
            reason: issues.map(item => item.detail).join('；'),
            issues,
            feedback,
        };
    }
    if (hardError && options.replanCount < options.maxReplans) {
        return {
            verdict: 'replan',
            reason: '连续重试仍未成功，需要调整计划',
            issues,
            feedback: buildFeedback(issues, '当前步骤执行失败，请重新规划后续步骤'),
        };
    }
    if (issues.length) {
        return {
            verdict: 'continue',
            reason: issues.map(item => item.detail).join('；'),
            issues,
            feedback: '',
        };
    }
    return { verdict: 'continue', reason: '步骤完成', issues, feedback: '' };
}
function buildFeedback(issues, head) {
    if (!issues.length)
        return head;
    return `${head}：\n${issues.map(item => `- ${item.detail}`).join('\n')}`;
}
export function summarizeObservation(observation) {
    const parts = [];
    if (observation.sql.length) {
        const rows = observation.sql.reduce((sum, item) => sum + item.rowCount, 0);
        parts.push(`${observation.sql.length} 次查询`);
        parts.push(`${rows} 行`);
        if (observation.sql.some(item => item.truncated))
            parts.push('已截断');
    }
    if (observation.visual)
        parts.push('已生成可视化');
    if (observation.errorMessages.length)
        parts.push(`${observation.errorMessages.length} 个错误`);
    if (observation.aiText)
        parts.push(observation.aiText.slice(0, 80));
    return parts.join(' · ') || '已完成';
}
