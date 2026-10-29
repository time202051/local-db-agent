#!/usr/bin/env node
/**
 * Enrich an ABP knowledge pack with a local OpenAPI/Swagger file.
 *
 * Usage:
 *   node scripts/swagger-knowledge.mjs --swagger "D:\path\swagger.json" [--knowledge knowledge]
 *     [--prefix WMS_] [--name wms-kingbase] [--no-index]
 *
 * This script is build-time only. It never connects to a database and never
 * copies the raw Swagger file into the pack.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = { index: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--swagger") out.swagger = argv[++i];
    else if (arg === "--knowledge") out.knowledge = argv[++i];
    else if (arg === "--prefix") out.prefix = argv[++i];
    else if (arg === "--name") out.name = argv[++i];
    else if (arg === "--no-index") out.index = false;
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.swagger) {
  console.log(`Usage:
  node scripts/swagger-knowledge.mjs --swagger "D:\\path\\swagger.json"
    [--knowledge knowledge] [--prefix WMS_] [--name wms-kingbase] [--no-index]`);
  process.exit(args.help ? 0 : 1);
}

const swaggerFile = path.resolve(args.swagger);
const knowledgeDir = path.resolve(args.knowledge || path.join(APP_DIR, "knowledge"));
if (!fs.existsSync(swaggerFile)) {
  console.error(`[swagger-knowledge] swagger not found: ${swaggerFile}`);
  process.exit(1);
}
const manifestFile = path.join(knowledgeDir, "manifest.json");
if (!fs.existsSync(manifestFile)) {
  console.error(`[swagger-knowledge] manifest not found: ${manifestFile}`);
  process.exit(1);
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function writeUtf8(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "")
    .trim();
}

function stripDtoSuffix(name) {
  return String(name || "").replace(
    /(PagedResultDto|PagedResult|PagedDto|Paged|Dto|Input|Output|Create|Update|Get|List|Result|Request|Response|Item)+$/gi,
    "",
  );
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function schemaName(ref) {
  if (!ref || typeof ref !== "string") return "";
  const match = /#\/components\/schemas\/([^/]+)/.exec(ref);
  return match ? decodeURIComponent(match[1]) : "";
}

function schemaNamesFromNode(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (typeof node.$ref === "string") out.push(schemaName(node.$ref));
  if (Array.isArray(node)) {
    for (const item of node) schemaNamesFromNode(item, out);
    return out;
  }
  for (const value of Object.values(node)) schemaNamesFromNode(value, out);
  return out;
}

const manifest = JSON.parse(readUtf8(manifestFile));
const swagger = JSON.parse(readUtf8(swaggerFile));
const prefix = args.prefix || manifest.source?.prefix || "WMS_";
const tables = manifest.tables && typeof manifest.tables === "object" ? manifest.tables : {};

const tableByLower = new Map();
const aliasToTable = new Map();
for (const [table, entry] of Object.entries(tables)) {
  tableByLower.set(table.toLowerCase(), table);
  aliasToTable.set(normalize(table), table);
  for (const alias of entry.aliases || []) {
    const key = normalize(alias);
    if (key) aliasToTable.set(key, table);
  }
}

// ---- columns from generated table docs ----
const columnsByTable = new Map();
const docsDir = path.join(knowledgeDir, "docs", "generated", "tables");
if (fs.existsSync(docsDir)) {
  for (const file of fs.readdirSync(docsDir)) {
    if (!file.endsWith(".md")) continue;
    const table = file.slice(0, -3);
    const content = readUtf8(path.join(docsDir, file));
    const columns = new Set([
      "Id",
      "TenantId",
      "IsDeleted",
      "CreationTime",
      "CreatorId",
      "LastModificationTime",
      "LastModifierId",
      "DeletionTime",
      "DeleterId",
      "ConcurrencyStamp",
      "ExtraProperties",
    ]);
    for (const line of content.split(/\r?\n/)) {
      const match = /^\|\s*([A-Za-z_][\w]*)\s*\|/.exec(line);
      if (match) columns.add(match[1]);
    }
    columnsByTable.set(table, columns);
  }
}

// ---- schemas ----
const schemas = swagger.components?.schemas && typeof swagger.components.schemas === "object"
  ? swagger.components.schemas
  : {};

function schemaFields(name) {
  const schema = schemas[name];
  if (!schema || typeof schema !== "object") return [];
  const properties = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  return Object.entries(properties).map(([prop, raw]) => {
    const item = raw && typeof raw === "object" ? raw : {};
    return {
      name: prop,
      description: cleanText(item.description || item.title || ""),
      type:
        item.type ||
        schemaName(item.$ref) ||
        (item.items && (item.items.type || schemaName(item.items.$ref))) ||
        "",
      enumValues: Array.isArray(item.enum) ? item.enum : [],
    };
  });
}

const externalPrefixes = [
  "/api/agv",
  "/api/wcs",
  "/api/open",
  "/api/print",
  "/api/sap",
  "/api/srm",
  "/api/mes",
  "/api/bpm",
];
const externalTags = /^(Agv|Wcs|Print|Srm|Sap|Mes|Bpm|Open|Thirdparty)/i;

function endpointTokens(route) {
  const raw = String(route || "")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
  const tokens = new Set();
  for (const part of raw) {
    const lower = part.toLowerCase();
    if (["api", "app", "v1", "v2", "service"].includes(lower)) continue;
    const meaningful = lower.includes("-by-") ? lower.split("-by-")[0] : lower;
    tokens.add(meaningful);
    tokens.add(meaningful.replace(/-/g, ""));
    const pieces = meaningful
      .split("-")
      .filter(
        piece =>
          piece &&
          ![
            "api",
            "app",
            "pages",
            "page",
            "list",
            "get",
            "post",
            "put",
            "delete",
            "by",
            "id",
            "export",
            "import",
            "select",
            "search",
            "sort",
            "complete",
            "url",
            "info",
            "detail",
            "details",
            "create",
            "update",
            "remove",
            "check",
            "count",
            "summary",
          ].includes(piece),
      );
    for (const piece of pieces) tokens.add(piece);
    for (let i = 0; i < pieces.length - 1; i += 1) tokens.add(pieces[i] + pieces[i + 1]);
    if (pieces.length >= 3) tokens.add(pieces.slice(-2).join(""));
  }
  return tokens;
}

function actionTokens(route) {
  const segments = String(route || "")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
  let action = "";
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const part = segments[i];
    if (!part || part.startsWith("{")) continue;
    if (["api", "app", "v1", "v2", "service"].includes(part.toLowerCase())) continue;
    action = part.toLowerCase();
    break;
  }
  const tokens = new Set();
  if (!action) return tokens;
  const primary = action.split(/-by-|-by$/)[0] || action;
  tokens.add(primary);
  tokens.add(primary.replace(/-/g, ""));
  const pieces = primary
    .split("-")
    .filter(
      piece =>
        piece &&
        !["pages", "page", "list", "get", "post", "put", "delete", "by", "id", "export", "import", "select", "search", "sort", "complete", "url", "info", "create", "update", "remove", "check", "count", "summary"].includes(piece),
    );
  for (const piece of pieces) tokens.add(piece);
  for (let i = 0; i < pieces.length - 1; i += 1) tokens.add(pieces[i] + pieces[i + 1]);
  return tokens;
}

function scoreTable(table, alias, tokens, action, tags, dtoNames, propertyNames) {
  const tableKey = normalize(table);
  const aliasKey = normalize(alias);
  let score = 0;
  let exact = false;
  if (action.has(tableKey)) {
    score += 16 + Math.min(6, tableKey.length * 0.3);
    exact = true;
  }
  if (aliasKey && action.has(aliasKey)) {
    score += 15 + Math.min(6, aliasKey.length * 0.3);
    exact = true;
  }
  const genericActionTokens = new Set([
    "detail",
    "details",
    "info",
    "data",
    "page",
    "pages",
    "list",
    "query",
    "search",
    "select",
    "export",
    "import",
    "print",
    "check",
    "count",
  ]);
  for (const token of action) {
    if (token.length < 4) continue;
    const weight = genericActionTokens.has(token) ? 3 : 6;
    if (tableKey.includes(token) || token.includes(tableKey)) score += weight;
    if (aliasKey && (aliasKey.includes(token) || token.includes(aliasKey))) {
      score += Math.max(2, weight - 1);
    }
  }
  if (tokens.has(tableKey)) {
    score += 12 + Math.min(6, tableKey.length * 0.25);
    exact = true;
  }
  if (aliasKey && tokens.has(aliasKey)) {
    score += 10 + Math.min(6, aliasKey.length * 0.25);
    exact = true;
  }
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (tableKey.includes(token) || token.includes(tableKey)) score += 3;
    if (aliasKey && (aliasKey.includes(token) || token.includes(aliasKey))) score += 2;
  }
  for (const tag of tags) {
    const key = normalize(tag);
    if (key === tableKey || key === aliasKey) {
      score += 8;
      exact = true;
    } else if (key && (tableKey.includes(key) || aliasKey.includes(key))) {
      score += 3;
    }
  }
  for (const dto of dtoNames) {
    const key = normalize(stripDtoSuffix(dto));
    if (key && (key === tableKey || key === aliasKey)) {
      score += 9;
      exact = true;
    } else if (key && (tableKey.includes(key) || aliasKey.includes(key))) {
      score += 3;
    }
  }
  const columns = columnsByTable.get(table) || new Set();
  const lowerColumns = new Set([...columns].map(item => item.toLowerCase()));
  let overlap = 0;
  for (const prop of propertyNames) {
    if (lowerColumns.has(String(prop).toLowerCase())) overlap += 1;
  }
  score += Math.min(6, overlap * 0.5);
  return { score, exact, overlap };
}

// ---- endpoints ----
const endpoints = {};
const tableApis = new Map();
let mappedCount = 0;
let externalCount = 0;
let unmappedCount = 0;
const tagGroups = new Map();

for (const [route, methods] of Object.entries(swagger.paths || {})) {
  if (!methods || typeof methods !== "object") continue;
  const external =
    externalPrefixes.some(prefixValue => route.toLowerCase().startsWith(prefixValue)) ||
    Object.values(methods).some(item => externalTags.test(String(item?.tags?.[0] || "")));
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation || typeof operation !== "object") continue;
    const tags = Array.isArray(operation.tags) ? operation.tags.map(String) : [];
    const summary = cleanText(operation.summary || operation.description || "");
    const operationId = String(operation.operationId || "");
    const refs = unique([
      ...schemaNamesFromNode(operation.requestBody?.content),
      ...Object.values(operation.responses || {}).flatMap(response =>
        schemaNamesFromNode(response?.content),
      ),
    ]);
    const dtoNames = unique(refs);
    const propertyNames = unique(
      dtoNames.flatMap(name => schemaFields(name).map(field => field.name)),
    );
    const tokens = endpointTokens(route);
    const action = actionTokens(route);
    const key = `${method.toUpperCase()} ${route}`;
    let best = null;
    if (!external) {
      for (const [table, entry] of Object.entries(tables)) {
        const aliases = unique([...(entry.aliases || []), table]);
        for (const alias of aliases) {
          const result = scoreTable(table, alias, tokens, action, tags, dtoNames, propertyNames);
          if (!best || result.score > best.score) best = { table, alias, ...result };
        }
      }
    }
    const matchedTables =
      best && best.score >= 5 ? [best.table] : [];
    const confidence =
      best && best.score >= 5
        ? Math.min(0.99, Math.max(0.35, best.score / 20 + (best.exact ? 0.1 : 0)))
        : 0;
    if (external) externalCount += 1;
    else if (matchedTables.length) mappedCount += 1;
    else unmappedCount += 1;

    const fields = {};
    if (matchedTables.length) {
      const table = matchedTables[0];
      const columns = columnsByTable.get(table) || new Set();
      const lowerMap = new Map([...columns].map(column => [column.toLowerCase(), column]));
      for (const dtoName of dtoNames) {
        for (const field of schemaFields(dtoName)) {
          const column = lowerMap.get(field.name.toLowerCase());
          if (!column) continue;
          const label = field.description;
          if (!label) continue;
          if (!fields[column]) fields[column] = [];
          if (!fields[column].includes(label)) fields[column].push(label);
        }
      }
    }

    endpoints[key] = {
      method: method.toUpperCase(),
      path: route,
      operationId,
      tags,
      summary,
      dto: dtoNames,
      tables: matchedTables,
      confidence: Number(confidence.toFixed(2)),
      external,
      fields,
    };

    if (matchedTables.length) {
      for (const table of matchedTables) {
        if (!tableApis.has(table)) tableApis.set(table, []);
        tableApis.get(table).push({ key, summary, tags });
      }
      const entry = tables[matchedTables[0]];
      if (entry) {
        const existingAliases = [...(entry.aliases || [])];
        const aliasKeys = unique([
          normalize(matchedTables[0]),
          ...existingAliases.map(normalize).filter(Boolean),
        ]);
        const exactAlias = value => {
          const key = normalize(value);
          return Boolean(key && aliasKeys.includes(key));
        };
        const aliasAdditions = [];
        let dtoMatched = false;
        for (const dtoName of dtoNames) {
          const root = stripDtoSuffix(dtoName);
          if (root && exactAlias(root)) {
            aliasAdditions.push(root);
            dtoMatched = true;
          }
        }
        const commentKey = normalize(entry.comment || "").slice(0, 2);
        const summaryKey = normalize(summary);
        const genericSummary =
          /^(根据ID获取单条数据|获取单条|根据ID获取|删除|创建|编辑|更新|导出|导入|打印|批量删除|获取.+下拉|获取.+状态|分页列表)/.test(
            summary,
          );
        if (
          summary &&
          summary.length <= 60 &&
          !genericSummary &&
          (dtoMatched || (commentKey && summaryKey.includes(commentKey)))
        ) {
          aliasAdditions.push(summary);
        }
        entry.aliases = unique([...existingAliases, ...aliasAdditions])
          .map(item => String(item).slice(0, 60))
          .slice(0, 10);
        if (Object.keys(fields).length) {
          entry.columnAliases = entry.columnAliases || {};
          for (const [column, labels] of Object.entries(fields)) {
            entry.columnAliases[column] = unique([
              ...(entry.columnAliases[column] || []),
              ...labels,
            ]).slice(0, 6);
          }
        }
      }
    }

    const group = tags[0] || (external ? "External" : "Other");
    if (!tagGroups.has(group)) tagGroups.set(group, []);
    tagGroups.get(group).push({
      key,
      summary,
      tables: matchedTables,
      external,
      confidence,
    });
  }
}

// ---- write api index ----
const apiDocDir = path.join(knowledgeDir, "docs", "generated", "api");
const indexLines = [
  `# API 索引`,
  "",
  `> 由本地 Swagger 生成：${swagger.info?.title || ""} ${swagger.info?.version || ""}`,
  `> 接口 ${Object.keys(endpoints).length} 个；已映射 ${mappedCount} 个；外部接口 ${externalCount} 个；未映射 ${unmappedCount} 个。`,
  "",
];
for (const [tag, list] of Array.from(tagGroups.entries()).sort(([a], [b]) => a.localeCompare(b))) {
  indexLines.push(`## ${tag}`);
  for (const item of list.sort((a, b) => a.key.localeCompare(b.key)).slice(0, 200)) {
    const target = item.external
      ? "外部接口"
      : item.tables.length
        ? item.tables.join(", ")
        : "未映射";
    indexLines.push(`- ${item.key}${item.summary ? ` — ${item.summary}` : ""} → ${target}`);
  }
  indexLines.push("");
}
writeUtf8(path.join(apiDocDir, "api-index.md"), indexLines.join("\n"));

const apiMap = {
  generatedAt: new Date().toISOString(),
  swagger: {
    title: swagger.info?.title || "",
    version: swagger.info?.version || "",
    openapi: swagger.openapi || "",
  },
  counts: {
    endpoints: Object.keys(endpoints).length,
    mapped: mappedCount,
    external: externalCount,
    unmapped: unmappedCount,
  },
  endpoints,
  tableApis: Object.fromEntries(tableApis),
};
writeUtf8(path.join(knowledgeDir, "api-map.json"), JSON.stringify(apiMap, null, 2));

// ---- append related endpoints to table docs ----
const tableDocDir = path.join(knowledgeDir, "docs", "generated", "tables");
if (fs.existsSync(tableDocDir)) {
  for (const file of fs.readdirSync(tableDocDir)) {
    if (!file.endsWith(".md")) continue;
    const table = file.slice(0, -3);
    const apis = tableApis.get(table) || [];
    const full = path.join(tableDocDir, file);
    let content = readUtf8(full);
    content = content.replace(/\n<!-- api:start -->[\s\S]*?<!-- api:end -->\n?/g, "\n");
    content = content.replace(/^> 由 ABP 源码自动生成：`[^`]*`\s*$/m, "> 由 ABP 源码自动生成");
    if (apis.length) {
      const block = [
        "<!-- api:start -->",
        "## 相关接口",
        ...apis.slice(0, 20).map(item => `- ${item.key}${item.summary ? ` — ${item.summary}` : ""}`),
        "<!-- api:end -->",
        "",
      ].join("\n");
      content = content.replace(/\s*$/, "\n\n") + block;
    }
    writeUtf8(full, content);
  }
}

// ---- sanitize manifest and coverage ----
manifest.name = args.name || manifest.name || path.basename(knowledgeDir);
manifest.source = { kind: "abp", project: manifest.name };
manifest.generatedAt = new Date().toISOString();
writeUtf8(manifestFile, JSON.stringify(manifest, null, 2));

const coverageFile = path.join(knowledgeDir, "coverage.json");
let coverage = {};
try {
  coverage = JSON.parse(readUtf8(coverageFile));
} catch {
  coverage = {};
}
delete coverage.backend;
coverage.api = {
  endpoints: Object.keys(endpoints).length,
  mapped: mappedCount,
  external: externalCount,
  unmapped: unmappedCount,
};
coverage.generatedAt = new Date().toISOString();
writeUtf8(coverageFile, JSON.stringify(coverage, null, 2));

console.log(
  `[swagger-knowledge] endpoints=${Object.keys(endpoints).length} mapped=${mappedCount} ` +
    `external=${externalCount} unmapped=${unmappedCount}`,
);
console.log(`[swagger-knowledge] wrote ${path.join(knowledgeDir, "api-map.json")}`);
console.log(`[swagger-knowledge] wrote ${path.join(apiDocDir, "api-index.md")}`);

if (args.index) {
  try {
    execFileSync(process.execPath, [path.join(APP_DIR, "scripts", "knowledge-index.mjs")], {
      cwd: APP_DIR,
      env: { ...process.env, AGENT_KNOWLEDGE_DIR: knowledgeDir },
      stdio: "inherit",
    });
  } catch (error) {
    console.warn(`[swagger-knowledge] knowledge-index failed: ${error.message}`);
  }
}
