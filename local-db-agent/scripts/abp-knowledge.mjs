#!/usr/bin/env node
/**
 * Reusable ABP/.NET knowledge-pack generator.
 *
 * Usage:
 *   node scripts/abp-knowledge.mjs --backend "D:\path\to\AbpProject" [--out knowledge]
 *     [--frontend "D:\path\to\admin-frontend"] [--name customer-wms] [--no-merge] [--no-index]
 *
 * It is read-only against the source tree. It never connects to a database.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = { merge: true, index: true, excludeFramework: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--backend") out.backend = argv[++i];
    else if (arg === "--frontend") out.frontend = argv[++i];
    else if (arg === "--out") out.out = argv[++i];
    else if (arg === "--name") out.name = argv[++i];
    else if (arg === "--prefix") out.prefix = argv[++i];
    else if (arg === "--no-merge") out.merge = false;
    else if (arg === "--no-index") out.index = false;
    else if (arg === "--include-framework") out.excludeFramework = false;
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.backend) {
  console.log(`Usage:
  node scripts/abp-knowledge.mjs --backend "D:\\path\\to\\AbpProject" [--out knowledge]
    [--frontend "D:\\path\\to\\frontend"] [--name customer-wms] [--prefix WMS_]
    [--no-merge] [--no-index] [--include-framework]`);
  process.exit(args.help ? 0 : 1);
}

const backendDir = path.resolve(args.backend);
const outDir = path.resolve(args.out || path.join(APP_DIR, "knowledge"));
if (!fs.existsSync(backendDir)) {
  console.error(`[abp-knowledge] backend not found: ${backendDir}`);
  process.exit(1);
}

const SKIP_DIRS = new Set([
  ".git",
  ".vs",
  ".idea",
  "bin",
  "obj",
  "node_modules",
  "dist",
  "packages",
  "OfflinePackages",
  "wwwroot",
]);

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".cs")) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function stripStringsAndComments(text) {
  let out = "";
  let i = 0;
  let mode = "code";
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") {
        mode = "line";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === "/" && n === "*") {
        mode = "block";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === '"') {
        mode = "string";
        out += " ";
        i += 1;
        continue;
      }
      if (c === "'") {
        mode = "char";
        out += " ";
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (mode === "line") {
      if (c === "\n") {
        mode = "code";
        out += "\n";
      } else out += " ";
      i += 1;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = "code";
        out += "  ";
        i += 2;
      } else {
        out += c === "\n" ? "\n" : " ";
        i += 1;
      }
      continue;
    }
    if (mode === "string" || mode === "char") {
      if (c === "\\") {
        out += "  ";
        i += 2;
        continue;
      }
      if ((mode === "string" && c === '"') || (mode === "char" && c === "'")) {
        mode = "code";
        out += " ";
      } else out += c === "\n" ? "\n" : " ";
      i += 1;
    }
  }
  return out;
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function cleanText(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function xmlSummaryBefore(text, index) {
  const before = text.slice(Math.max(0, index - 1200), index);
  const matches = [...before.matchAll(/<summary>([\s\S]*?)<\/summary>/g)];
  if (!matches.length) return "";
  return cleanText(matches[matches.length - 1][1].replace(/\/\/\/?/g, " "));
}

function attributeTextBefore(text, index) {
  const before = text.slice(Math.max(0, index - 1200), index);
  const lines = before.split(/\r?\n/);
  const attrs = [];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line) {
      if (attrs.length) break;
      continue;
    }
    if (line.startsWith("[")) {
      attrs.unshift(line);
      continue;
    }
    if (line.startsWith("///")) continue;
    break;
  }
  return attrs.join(" ");
}

function attrValue(attrs, name) {
  const re = new RegExp(`\\[\\s*${name}\\s*\\(\\s*"([^"]*)"`, "i");
  const match = re.exec(attrs);
  return match ? cleanText(match[1]) : "";
}

function descriptionFromAttrs(attrs) {
  return attrValue(attrs, "Comment") || attrValue(attrs, "Description");
}

function parseTableExpression(expr, prefix, entityName) {
  const text = String(expr || "");
  const strings = [...text.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  const nameof = [...text.matchAll(/nameof\s*\(\s*([\w.]+)\s*\)/g)].map(match => match[1].split(".").pop());
  if (/DbTablePrefix|TablePrefix/.test(text)) {
    return `${prefix}${strings[0] || nameof[0] || entityName}`;
  }
  if (strings.length) return strings[0];
  if (nameof.length) return nameof[0];
  return "";
}

function normalizeType(type) {
  return String(type || "")
    .replace(/\bSystem\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCollectionType(type) {
  return /^(ICollection|IReadOnlyCollection|List|HashSet|IEnumerable)<(.+)>$/.test(type);
}

function collectionItemType(type) {
  const match = /^(?:ICollection|IReadOnlyCollection|List|HashSet|IEnumerable)<(.+)>$/.exec(type);
  return match ? normalizeType(match[1].replace(/\?$/, "")) : "";
}

function isNullable(type) {
  return /\?\s*$/.test(type);
}

const files = walk(backendDir);
const sources = files.map(file => ({ file, text: readUtf8(file), clean: stripStringsAndComments(readUtf8(file)) }));

let prefix = args.prefix || "";
if (!prefix) {
  for (const source of sources) {
    const match = /(?:DbTablePrefix|TablePrefix)[^=]*=\s*"([^"]*)"/.exec(source.text);
    if (match) {
      prefix = match[1];
      break;
    }
  }
}
prefix = prefix || "";

// ---- classes / entities ----
const entities = new Map();
for (const source of sources) {
  const text = source.text;
  const classRe = /\b(?:public|internal)\s+(?:partial\s+)?(?:abstract\s+)?class\s+([A-Za-z_][\w]*)\s*(?::\s*([^\{]+))?\{/g;
  let match;
  while ((match = classRe.exec(text))) {
    const name = match[1];
    const open = text.indexOf("{", match.index);
    const close = findMatchingBrace(text, open);
    if (close < 0) continue;
    const attrs = attributeTextBefore(text, match.index);
    const tableAttr = attrValue(attrs, "Table");
    const comment = descriptionFromAttrs(attrs) || xmlSummaryBefore(text, match.index);
    const bases = String(match[2] || "")
      .split(",")
      .map(item => normalizeType(item))
      .filter(Boolean);
    const looksEntity =
      Boolean(tableAttr) ||
      /(?:AggregateRoot|FullAudited|CreationAudited|AuditedEntity|Entity\b)/.test(bases.join(" "));
    if (!looksEntity) continue;
    const dtoLike =
      /(Dto|Input|Output|Eto|Request|Response|Result|Args|Consts|Profile|Service|Repository|Manager|Controller|Validator|Options|Attribute)$/i.test(
        name,
      ) ||
      /[\\/](Application|Application\.Contracts|HttpApi|Web|EntityFrameworkCore|Migrations|Domain\.Shared)[\\/]/i.test(
        source.file,
      );
    if (dtoLike) continue;
    const body = text.slice(open + 1, close);
    const cleanBody = stripStringsAndComments(body);
    entities.set(name, {
      name,
      file: source.file,
      bases,
      tableAttr,
      comment,
      body,
      cleanBody,
      properties: [],
      table: tableAttr,
    });
  }
}

const entityNames = new Set(entities.keys());

for (const entity of entities.values()) {
  const propRe =
    /((?:\[[^\]]*\]\s*)*)(?:public|protected\s+internal|protected|internal)\s+(?:virtual\s+|override\s+|new\s+)?([A-Za-z_][\w<>,.? \[\]]*?)\s+([A-Za-z_][\w]*)\s*\{\s*get\s*;[^}]*\}/g;
  let match;
  while ((match = propRe.exec(entity.body))) {
    const attrs = match[1] || "";
    let type = normalizeType(match[2]);
    const name = match[3];
    if (!type || /^(void|class|struct|interface|enum)$/.test(type)) continue;
    if (/^(get|set|init)$/.test(name)) continue;
    const comment = descriptionFromAttrs(attrs) || xmlSummaryBefore(entity.body, match.index);
    const navigation =
      entityNames.has(type.replace(/\?$/, "")) ||
      isCollectionType(type) ||
      /^(IEnumerable|ICollection|List|HashSet)</.test(type);
    entity.properties.push({
      name,
      type,
      nullable: isNullable(type),
      comment,
      required: /\[\s*Required/.test(attrs),
      maxLength: (() => {
        const m = /StringLength\s*\(\s*(\d+)/.exec(attrs);
        return m ? Number(m[1]) : undefined;
      })(),
      key: /\[\s*Key/.test(attrs),
      navigation,
      navigationTarget: isCollectionType(type)
        ? collectionItemType(type)
        : entityNames.has(type.replace(/\?$/, ""))
          ? type.replace(/\?$/, "")
          : "",
    });
  }
}

// ---- table mappings / relationships / indexes ----
const tableByEntity = new Map();
const dbSetTables = new Map();
for (const source of sources) {
  const text = source.text;
  const dbSetRe = /DbSet<([A-Za-z_][\w]*)>\s+([A-Za-z_][\w]*)\s*\{/g;
  let match;
  while ((match = dbSetRe.exec(text))) {
    dbSetTables.set(match[1], `${prefix}${match[2]}`);
  }
}

const indexesByEntity = new Map();
const relationships = [];

for (const source of sources) {
  const text = source.text;
  const entityRe = /builder\.Entity<([A-Za-z_][\w]*)>\s*\(\s*[A-Za-z_][\w]*\s*=>\s*\{/g;
  let match;
  while ((match = entityRe.exec(text))) {
    const entityName = match[1];
    const open = text.indexOf("{", match.index);
    const close = findMatchingBrace(text, open);
    if (close < 0) continue;
    const body = text.slice(open + 1, close);
    const tableMatch = /\.ToTable\s*\(([\s\S]*?)\)\s*;/.exec(body);
    if (tableMatch) {
      tableByEntity.set(entityName, parseTableExpression(tableMatch[1], prefix, entityName));
    }
    const indexMatches = [...body.matchAll(/\.HasIndex\s*\(\s*[^=]*=>\s*([\s\S]*?)\)\s*(?:\.IsUnique\(\))?\s*;/g)];
    if (indexMatches.length) {
      const columns = [];
      for (const item of indexMatches) {
        const props = [...String(item[1]).matchAll(/\bp\s*\.\s*([A-Za-z_][\w]*)/g)].map(m => m[1]);
        if (!props.length) {
          const single = /\bp\s*=>\s*p\s*\.\s*([A-Za-z_][\w]*)/.exec(item[1]);
          if (single) props.push(single[1]);
        }
        columns.push(...props);
      }
      if (columns.length) indexesByEntity.set(entityName, Array.from(new Set(columns)));
    }
    const relRe = /\.HasOne\s*\(\s*[^=]*=>\s*[^.]*\.\s*([A-Za-z_][\w]*)\s*\)[\s\S]*?\.HasForeignKey\s*\(\s*[^=]*=>\s*[^.]*\.\s*([A-Za-z_][\w]*)\s*\)/g;
    let rel;
    while ((rel = relRe.exec(body))) {
      relationships.push({
        entity: entityName,
        navigation: rel[1],
        foreignKey: rel[2],
      });
    }
  }
}

for (const entity of entities.values()) {
  entity.table =
    entity.tableAttr ||
    tableByEntity.get(entity.name) ||
    dbSetTables.get(entity.name) ||
    `${prefix}${entity.name}`;
}

const tableNameOfEntity = new Map();
for (const entity of entities.values()) tableNameOfEntity.set(entity.name, entity.table);

const relationshipEntries = new Map();
for (const rel of relationships) {
  const entity = entities.get(rel.entity);
  if (!entity) continue;
  const nav = entity.properties.find(prop => prop.name === rel.navigation);
  const targetEntity = nav?.navigationTarget || nav?.type.replace(/\?$/, "");
  const targetTable = targetEntity ? tableNameOfEntity.get(targetEntity) : "";
  if (!targetTable) continue;
  const key = `${entity.table}|${targetTable}|${rel.foreignKey}`;
  relationshipEntries.set(key, {
    to: targetTable,
    type: "1:N",
    on: `${entity.table}.${rel.foreignKey} = ${targetTable}.Id`,
  });
}

// infer relationships from navigation properties when model builder lacks them
for (const entity of entities.values()) {
  for (const prop of entity.properties) {
    if (!prop.navigation || !prop.navigationTarget) continue;
    const targetTable = tableNameOfEntity.get(prop.navigationTarget);
    if (!targetTable) continue;
    const fk = entity.properties.find(p => p.name === `${prop.name}Id`);
    if (!fk) continue;
    const key = `${entity.table}|${targetTable}|${fk.name}`;
    if (!relationshipEntries.has(key)) {
      relationshipEntries.set(key, {
        to: targetTable,
        type: "1:N",
        on: `${entity.table}.${fk.name} = ${targetTable}.Id`,
      });
    }
  }
}

// ---- enums ----
const enums = new Map();
for (const source of sources) {
  const text = source.text;
  const enumRe = /\b(?:public|internal)\s+enum\s+([A-Za-z_][\w]*)\s*(?::\s*[^{]+)?\{/g;
  let match;
  while ((match = enumRe.exec(text))) {
    const name = match[1];
    const open = text.indexOf("{", match.index);
    const close = findMatchingBrace(text, open);
    if (close < 0) continue;
    const body = text.slice(open + 1, close);
    const attrs = attributeTextBefore(text, match.index);
    const values = [];
    const memberRe = /((?:\[[^\]]*\]\s*)*)([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*)\s*(?:=\s*(-?\d+))?\s*,?/g;
    let member;
    while ((member = memberRe.exec(body))) {
      const memberName = member[2];
      if (!memberName || memberName === "get" || memberName === "set") continue;
      const memberAttrs = member[1] || "";
      values.push({
        name: memberName,
        value: member[3] !== undefined ? Number(member[3]) : values.length,
        description: descriptionFromAttrs(memberAttrs) || xmlSummaryBefore(body, member.index),
      });
    }
    if (values.length) {
      enums.set(name, {
        name,
        comment: descriptionFromAttrs(attrs) || xmlSummaryBefore(text, match.index),
        values,
        file: source.file,
      });
    }
  }
}

// ---- frontend labels (optional) ----
const frontendLabels = new Map();
if (args.frontend && fs.existsSync(path.resolve(args.frontend))) {
  const frontRoot = path.resolve(args.frontend);
  const vueFiles = [];
  (function walkVue(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkVue(full);
      else if (entry.isFile() && /\.(vue|js|ts)$/i.test(entry.name)) vueFiles.push(full);
    }
  })(frontRoot);
  for (const file of vueFiles) {
    const text = readUtf8(file);
    const pairRe =
      /(?:prop|field|key|value|name)\s*:\s*["']([A-Za-z_][\w]*)["'][\s\S]{0,300}?(?:label|title|name|text)\s*:\s*["']([^"']{1,80})["']/g;
    let match;
    while ((match = pairRe.exec(text))) {
      if (!frontendLabels.has(match[1])) frontendLabels.set(match[1], cleanText(match[2]));
    }
  }
}

// ---- filter framework tables ----
function isFrameworkTable(table) {
  if (!args.excludeFramework) return false;
  return /(?:Abp|Identity|Permission|Tenant|System|Saas|Audit|CustomAudit|CustomEntity|Users|Roles|Claim|OrganizationUnit|MenuPermission|SecurityLogs|LinkUsers|TenantConnectionStrings)/i.test(
    table,
  );
}

const tables = new Map();
const mappedEntities = new Set([...tableByEntity.keys(), ...dbSetTables.keys()]);
for (const entity of entities.values()) {
  if (!entity.table || isFrameworkTable(entity.table)) continue;
  const mapped = Boolean(entity.tableAttr) || mappedEntities.has(entity.name);
  const looksEntity = /(?:AggregateRoot|FullAudited|CreationAudited|AuditedEntity|Entity\b)/.test(
    entity.bases.join(" "),
  );
  if (!mapped && !looksEntity) continue;
  if (prefix && !entity.table.startsWith(prefix)) continue;
  const props = entity.properties;
  const relationships = [];
  for (const [key, value] of relationshipEntries) {
    if (key.startsWith(`${entity.table}|`)) relationships.push(value);
  }
  const keyColumns = Array.from(
    new Set([
      "Id",
      ...props.filter(p => p.name === "Id" || (p.key && !p.navigation)).map(p => p.name),
      ...props.filter(p => /Id$/.test(p.name) && !p.navigation).map(p => p.name),
    ]),
  );
  const indexedColumns = indexesByEntity.get(entity.name) || [];
  const aliases = [];
  if (frontendLabels.get(entity.name)) aliases.push(frontendLabels.get(entity.name));
  aliases.push(entity.name);
  for (const prop of props) {
    const label = frontendLabels.get(prop.name);
    if (label) prop.comment = prop.comment || label;
  }
  for (const prop of props) {
    if (prop.navigation) continue;
    if (!prop.comment && frontendLabels.get(prop.name)) prop.comment = frontendLabels.get(prop.name);
  }
  tables.set(entity.table, {
    entity,
    props,
    keyColumns,
    indexedColumns,
    relationships,
    aliases: Array.from(new Set(aliases.filter(Boolean))),
  });
}

// keep only relationships whose target table is part of the generated pack
for (const info of tables.values()) {
  info.relationships = info.relationships.filter(rel => tables.has(rel.to));
}

// ---- write output ----
const generatedRoot = path.join(outDir, "docs", "generated");
const tablesDocDir = path.join(generatedRoot, "tables");
const enumsDocDir = path.join(generatedRoot, "enums");
fs.rmSync(generatedRoot, { recursive: true, force: true });
fs.mkdirSync(tablesDocDir, { recursive: true });
fs.mkdirSync(enumsDocDir, { recursive: true });

function tableDoc(table, info) {
  const { entity, props, keyColumns, indexedColumns, relationships } = info;
  const lines = [];
  lines.push(`# ${table}${entity.comment ? ` ${entity.comment}` : ""}`);
  lines.push("");
  lines.push(`> 由 ABP 源码自动生成：\`${path.relative(backendDir, entity.file)}\``);
  lines.push("");
  if (entity.comment) {
    lines.push("## 用途");
    lines.push(entity.comment);
    lines.push("");
  }
  lines.push("## 字段");
  lines.push("| 字段 | 类型 | 可空 | 说明 |");
  lines.push("|---|---|---|---|");
  const rows = props.filter(prop => !prop.navigation);
  for (const prop of rows) {
    lines.push(
      `| ${prop.name} | ${prop.type.replace(/\|/g, "\\|")} | ${prop.nullable ? "是" : "否"} | ${
        prop.comment || ""
      } |`,
    );
  }
  const audit = [
    ["Id", "主键"],
    ["TenantId", "租户 ID（多租户）"],
    ["IsDeleted", "软删除标记，默认查询应排除"],
    ["CreationTime", "创建时间"],
    ["CreatorId", "创建人"],
    ["LastModificationTime", "最后修改时间"],
    ["LastModifierId", "最后修改人"],
    ["DeletionTime", "删除时间"],
    ["DeleterId", "删除人"],
  ];
  const existing = new Set(rows.map(prop => prop.name));
  const missingAudit = audit.filter(([name]) => !existing.has(name));
  if (missingAudit.length) {
    lines.push("");
    lines.push("## 继承/审计字段");
    for (const [name, desc] of missingAudit) lines.push(`- \`${name}\`：${desc}`);
  }
  if (keyColumns.length) {
    lines.push("");
    lines.push("## 关键字段");
    lines.push(`- ${keyColumns.map(item => `\`${item}\``).join("、")}`);
  }
  if (indexedColumns.length) {
    lines.push("");
    lines.push("## 索引字段");
    lines.push(`- ${indexedColumns.map(item => `\`${item}\``).join("、")}`);
  }
  if (relationships.length) {
    lines.push("");
    lines.push("## 关系");
    for (const rel of relationships) lines.push(`- ${rel.to}（${rel.type}）：\`${rel.on}\``);
  }
  lines.push("");
  lines.push("## 查询注意");
  if (existing.has("IsDeleted")) lines.push("- 默认加 `IsDeleted = false`，除非明确要查已删除数据。");
  if (existing.has("TenantId")) lines.push("- 多租户表：按 `TenantId` 过滤，避免跨租户串数据。");
  lines.push("- 大表优先聚合（GROUP BY / SUM / COUNT），不要 SELECT *。");
  lines.push("");
  return lines.join("\n");
}

const manifestTables = {};
for (const [table, info] of tables) {
  const docRel = `docs/generated/tables/${table}.md`;
  fs.writeFileSync(path.join(outDir, docRel), tableDoc(table, info), "utf8");
  manifestTables[table] = {
    comment: info.entity.comment || "",
    aliases: info.aliases,
    keyColumns: info.keyColumns,
    indexedColumns: info.indexedColumns,
    relationships: info.relationships,
    doc: docRel,
    status: info.entity.comment ? "ready" : "needs_review",
    note: info.entity.comment ? "" : "缺少实体注释，需要人工补充",
  };
}

const manifestEnums = {};
for (const [name, info] of enums) {
  const docRel = `docs/generated/enums/${name}.md`;
  const lines = [`# ${name}${info.comment ? ` ${info.comment}` : ""}`, ""];
  lines.push(`> 由 ABP 源码自动生成：\`${path.relative(backendDir, info.file)}\``);
  lines.push("");
  if (info.comment) {
    lines.push("## 说明");
    lines.push(info.comment);
    lines.push("");
  }
  lines.push("| 值 | 名称 | 含义 |");
  lines.push("|---|---|---|");
  for (const value of info.values) {
    lines.push(`| ${value.value} | ${value.name} | ${value.description || ""} |`);
  }
  lines.push("");
  fs.writeFileSync(path.join(outDir, docRel), lines.join("\n"), "utf8");
  manifestEnums[name] = {
    comment: info.comment,
    values: info.values,
    doc: docRel,
  };
}

const coreTableHints = [
  "WMS_Stocks",
  "WMS_StockHistorys",
  "WMS_Products",
  "WMS_ProductClasss",
  "WMS_ProductBatchs",
  "WMS_StockIns",
  "WMS_StockInDetails",
  "WMS_StockOuts",
  "WMS_StockOutDetails",
  "WMS_PickTasks",
  "WMS_Picks",
  "WMS_Warehouses",
  "WMS_Owners",
  "WMS_Containers",
  "WMS_Suppliers",
  "WMS_StockTransfers",
  "WMS_StockTransferDetails",
  "WMS_StockDiffAdjustments",
  "WMS_StockDiffAdjustmentDetails",
];
const priorityHints =
  /Stock|Product|Order|Warehouse|Owner|Container|Pick|Inventory|Inbound|Outbound|Supplier/i;
const priorityNoise = /Photo|Config|Log|Template|Setting|Dto|Report|Screen|Interface/i;
const priorityTables = Array.from(tables.keys())
  .sort((a, b) => {
    const ai = coreTableHints.indexOf(a);
    const bi = coreTableHints.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  })
  .filter(table => coreTableHints.includes(table) || (priorityHints.test(table) && !priorityNoise.test(table)))
  .slice(0, 30);

const existingManifestFile = path.join(outDir, "manifest.json");
let existingManifest = null;
if (args.merge && fs.existsSync(existingManifestFile)) {
  try {
    existingManifest = JSON.parse(readUtf8(existingManifestFile));
    const backup = `${existingManifestFile}.backup-${Date.now()}`;
    fs.copyFileSync(existingManifestFile, backup);
  } catch {
    existingManifest = null;
  }
}

const manifest = {
  name: existingManifest?.name || args.name || `abp-${path.basename(backendDir)}`,
  version: existingManifest?.version || 1,
  description:
    existingManifest?.description ||
    `由 ABP/.NET 源码自动生成的知识包：${path.basename(backendDir)}`,
  appliesTo: existingManifest?.appliesTo || {},
  priorityTables: Array.from(new Set([...(existingManifest?.priorityTables || []), ...priorityTables])).slice(
    0,
    40,
  ),
  tables: {
    ...(existingManifest?.tables || {}),
    ...manifestTables,
  },
  enums: {
    ...(existingManifest?.enums || {}),
    ...manifestEnums,
  },
  generatedAt: new Date().toISOString(),
  source: {
    backend: backendDir,
    frontend: args.frontend ? path.resolve(args.frontend) : "",
    prefix,
  },
};

// Existing manually authored table entries win for manual fields.
if (existingManifest?.tables) {
  for (const [table, entry] of Object.entries(existingManifest.tables)) {
    if (!manifest.tables[table]) continue;
    manifest.tables[table] = {
      ...manifest.tables[table],
      ...entry,
      relationships: entry.relationships || manifest.tables[table].relationships,
      keyColumns: entry.keyColumns || manifest.tables[table].keyColumns,
      indexedColumns: entry.indexedColumns || manifest.tables[table].indexedColumns,
      aliases: Array.from(new Set([...(entry.aliases || []), ...(manifest.tables[table].aliases || [])])),
    };
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(existingManifestFile, JSON.stringify(manifest, null, 2), "utf8");

const coverage = {
  generatedAt: new Date().toISOString(),
  backend: backendDir,
  tables: tables.size,
  enums: enums.size,
  relationships: Array.from(relationshipEntries.values()).length,
  tablesWithComment: Array.from(tables.values()).filter(info => info.entity.comment).length,
  tablesMissingComment: Array.from(tables.entries())
    .filter(([, info]) => !info.entity.comment)
    .map(([table]) => table)
    .sort(),
  columnsMissingComment: Array.from(tables.entries())
    .flatMap(([table, info]) =>
      info.props
        .filter(prop => !prop.navigation && !prop.comment)
        .map(prop => `${table}.${prop.name}`),
    )
    .slice(0, 500),
  enumsMissingDescription: Array.from(enums.values())
    .filter(info => info.values.some(value => !value.description))
    .map(info => info.name)
    .sort(),
  frontendLabels: frontendLabels.size,
  prefix,
};
fs.writeFileSync(path.join(outDir, "coverage.json"), JSON.stringify(coverage, null, 2), "utf8");

console.log(
  `[abp-knowledge] tables=${coverage.tables} enums=${coverage.enums} relationships=${coverage.relationships} ` +
    `withComment=${coverage.tablesWithComment}/${coverage.tables} frontendLabels=${coverage.frontendLabels}`,
);
console.log(`[abp-knowledge] wrote ${existingManifestFile}`);
console.log(`[abp-knowledge] coverage ${path.join(outDir, "coverage.json")}`);

if (args.index) {
  try {
    execFileSync(process.execPath, [path.join(APP_DIR, "scripts", "knowledge-index.mjs")], {
      cwd: APP_DIR,
      env: { ...process.env, AGENT_KNOWLEDGE_DIR: outDir },
      stdio: "inherit",
    });
  } catch (error) {
    console.warn(`[abp-knowledge] knowledge-index failed: ${error.message}`);
  }
}
