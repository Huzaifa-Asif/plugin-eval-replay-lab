const MAX_BYTES = 1_048_576;
const MAX_TOOLS = 100;
const MAX_CASES = 200;
const MAX_CALLS = 20;
const MAX_DEPTH = 12;
const MAX_NODES = 20_000;
const SEVERITY = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const SECRET_KEY = /(secret|token|password|passwd|api[-_]?key|private[-_]?key|authorization|cookie)/i;
const SECRET_VALUE = /(?:sk-[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._~+/=-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const INSTRUCTION_LIKE = /(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions?|reveal\s+(?:the\s+)?(?:system|developer)\s+prompt|act\s+as\s+(?:an?\s+)?(?:admin|system)/i;
const SUPPORTED_TYPES = new Set(["null", "array", "object", "integer", "number", "string", "boolean"]);

export class InputError extends Error {}

export function parseFixture(text) {
  if (typeof text !== "string") throw new InputError("Input must be text.");
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > MAX_BYTES) throw new InputError("Input exceeds the 1 MiB limit.");
  let value;
  try { value = JSON.parse(text); } catch { throw new InputError("Input must be valid JSON."); }
  assertBounded(value);
  return value;
}

export function auditFixture(value) {
  if (!isObject(value)) throw new InputError("Fixture must be an object.");
  if (value.version !== "1.0") throw new InputError('Fixture version must be "1.0".');
  if (!Array.isArray(value.tools) || value.tools.length === 0 || value.tools.length > MAX_TOOLS) {
    throw new InputError(`tools must contain 1-${MAX_TOOLS} entries.`);
  }
  if (!Array.isArray(value.cases) || value.cases.length === 0 || value.cases.length > MAX_CASES) {
    throw new InputError(`cases must contain 1-${MAX_CASES} entries.`);
  }

  const findings = [];
  const tools = new Map();
  value.tools.forEach((tool, index) => auditTool(tool, index, tools, findings));
  const caseIds = new Set();
  const cases = value.cases.map((item, index) => auditCase(item, index, tools, caseIds, findings));
  for (const kind of ["direct", "indirect", "follow_up", "write", "negative"]) {
    if (!cases.some((item) => item.kind === kind)) add(findings, "medium", "missing_case_kind", "cases", `Evaluation suite has no ${kind} case.`);
  }
  const totals = summarize(cases, findings);
  totals.tools = tools.size;
  return { version: "1.0", totals, cases, findings: sortFindings(findings) };
}

function auditTool(tool, index, tools, findings) {
  const path = `tools[${index}]`;
  if (!isObject(tool)) throw new InputError(`${path} must be an object.`);
  if (!validName(tool.name)) throw new InputError(`${path}.name must be a stable tool name.`);
  if (tools.has(tool.name)) add(findings, "high", "duplicate_tool", `${path}.name`, "Tool names must be unique.");
  if (typeof tool.description !== "string" || tool.description.trim().length < 8) {
    add(findings, "medium", "weak_tool_description", `${path}.description`, "Describe the user goal and selection boundary.");
  }
  if (!isObject(tool.inputSchema) || tool.inputSchema.type !== "object") {
    add(findings, "high", "invalid_input_schema", `${path}.inputSchema`, "Tool inputSchema must be an object schema.");
  }
  if (!isObject(tool.annotations)) {
    add(findings, "medium", "missing_annotations", `${path}.annotations`, "Record tool behavior annotations for review.");
  } else {
    for (const key of ["readOnlyHint", "destructiveHint", "openWorldHint", "idempotentHint"]) {
      if (key in tool.annotations && typeof tool.annotations[key] !== "boolean") add(findings, "high", "invalid_annotation_type", `${path}.annotations.${key}`, "Annotation hints must be booleans when present.");
    }
  }
  if (INSTRUCTION_LIKE.test(tool.description || "")) add(findings, "high", "instruction_like_tool_metadata", `${path}.description`, "Tool metadata contains instruction-like text; rewrite it as a user-goal description.");
  validateSchemaDefinition(tool.inputSchema, `${path}.inputSchema`, findings, 0);
  scanSecrets(tool, path, findings);
  tools.set(tool.name, tool);
}

function auditCase(item, index, tools, caseIds, findings) {
  const path = `cases[${index}]`;
  if (!isObject(item)) throw new InputError(`${path} must be an object.`);
  if (!validId(item.id)) throw new InputError(`${path}.id must be a stable identifier.`);
  if (caseIds.has(item.id)) add(findings, "high", "duplicate_case_id", `${path}.id`, "Case IDs must be unique.");
  caseIds.add(item.id);
  const kind = ["direct", "indirect", "follow_up", "write", "negative"].includes(item.kind) ? item.kind : null;
  if (!kind) throw new InputError(`${path}.kind is unsupported.`);
  if (typeof item.prompt !== "string" || item.prompt.trim().length < 3) throw new InputError(`${path}.prompt is required.`);
  if (!isObject(item.expected)) throw new InputError(`${path}.expected must be an object.`);
  if (!Array.isArray(item.expected.tools)) throw new InputError(`${path}.expected.tools must be an array.`);
  if (![undefined, "none", "required"].includes(item.expected.confirmation)) throw new InputError(`${path}.expected.confirmation must be none or required.`);
  if (!isObject(item.observed) || !Array.isArray(item.observed.calls)) throw new InputError(`${path}.observed.calls must be an array.`);
  if (item.observed.calls.length > MAX_CALLS) throw new InputError(`${path}.observed.calls exceeds ${MAX_CALLS}.`);

  const expected = item.expected.tools;
  const before = findings.length;
  if (new Set(expected).size !== expected.length) add(findings, "high", "duplicate_expected_tool", `${path}.expected.tools`, "Expected tools must not contain duplicates.");
  if (expected.some((name) => !validName(name))) add(findings, "high", "invalid_expected_tool", `${path}.expected.tools`, "Expected tool names must use the stable tool-name format.");
  const actual = item.observed.calls.map((call) => isObject(call) ? call.tool : undefined);
  if (kind === "negative" && expected.length !== 0) add(findings, "high", "negative_expects_tool", `${path}.expected.tools`, "Negative cases must expect no tool.");
  if (kind !== "negative" && expected.length === 0) add(findings, "medium", "positive_expects_no_tool", `${path}.expected.tools`, "Positive cases should identify the expected tool.");
  for (const name of expected) {
    if (!tools.has(name)) add(findings, "high", "unknown_expected_tool", `${path}.expected.tools`, "Expected tool is absent from the catalog.");
    if (!actual.includes(name)) add(findings, "high", "missing_expected_tool", `${path}.observed.calls`, "An expected tool was not called.");
  }
  for (const name of actual) {
    if (!tools.has(name)) add(findings, "high", "unknown_observed_tool", `${path}.observed.calls`, "An observed call references an unknown tool.");
    if (!expected.includes(name) && item.expected.allowAdditionalTools !== true) {
      add(findings, "high", "unexpected_tool", `${path}.observed.calls`, "An unexpected tool was called.");
    }
  }
  if (kind === "negative" && actual.length > 0) add(findings, "critical", "negative_case_called_tool", `${path}.observed.calls`, "A tool ran for a request that should not select one.");

  item.observed.calls.forEach((call, callIndex) => auditCall(call, `${path}.observed.calls[${callIndex}]`, tools, item, findings));
  if (kind === "follow_up") auditFollowUp(item, path, findings);
  scanSecrets(item, path, findings);
  const caseFindings = findings.slice(before).map(({ severity, code, path: findingPath, message }) => ({ severity, code, path: findingPath, message }));
  return {
    id: item.id,
    kind,
    passed: !caseFindings.some((finding) => SEVERITY[finding.severity] >= SEVERITY.high),
    expectedCount: expected.length,
    observedCount: actual.length,
    findings: caseFindings
  };
}

function auditCall(call, path, tools, item, findings) {
  if (!isObject(call)) throw new InputError(`${path} must be an object.`);
  if (!validName(call.tool)) throw new InputError(`${path}.tool is required.`);
  if (!isObject(call.arguments)) throw new InputError(`${path}.arguments must be an object.`);
  const tool = tools.get(call.tool);
  if (!tool) return;
  validateSchema(call.arguments, tool.inputSchema, `${path}.arguments`, findings, 0);
  const annotations = isObject(tool.annotations) ? tool.annotations : {};
  const consequential = annotations.destructiveHint === true;
  const confirmationRequired = item.expected.confirmation === "required" || consequential;
  if (consequential && item.expected.confirmation !== "required") {
    add(findings, "high", "destructive_confirmation_not_expected", `${path}.tool`, "Destructive tools must require confirmation in the case expectation.");
  }
  if (confirmationRequired && call.confirmationObserved !== true) {
    add(findings, "high", "missing_confirmation_evidence", `${path}.confirmationObserved`, "Consequential calls need captured confirmation evidence.");
  }
  if (!confirmationRequired && call.confirmationObserved === true) {
    add(findings, "low", "unexpected_confirmation", `${path}.confirmationObserved`, "Review whether this read-only flow asks for unnecessary confirmation.");
  }
}

function auditFollowUp(item, path, findings) {
  if (!Array.isArray(item.expected.reuseArgumentPaths) || item.expected.reuseArgumentPaths.length === 0) {
    add(findings, "medium", "missing_reuse_assertion", `${path}.expected.reuseArgumentPaths`, "Follow-up cases should name argument paths that must reuse prior identifiers.");
    return;
  }
  for (const assertion of item.expected.reuseArgumentPaths) {
    const sourcePath = isObject(assertion) ? assertion.source || assertion.path : undefined;
    if (!isObject(assertion) || !Number.isInteger(assertion.callIndex) || assertion.callIndex < 0 || !validObjectPath(assertion.path) || !validObjectPath(sourcePath)) {
      add(findings, "high", "invalid_reuse_assertion", `${path}.expected.reuseArgumentPaths`, "Reuse assertions require callIndex and path.");
      continue;
    }
    const call = item.observed.calls[assertion.callIndex];
    const prior = getOwnPath(item.prior, sourcePath);
    const observed = getOwnPath(call?.arguments, assertion.path);
    if (prior === undefined || observed === undefined || !scalarEqual(prior, observed)) {
      add(findings, "high", "identifier_not_reused", `${path}.observed.calls[${assertion.callIndex}].arguments.${assertion.path}`, "The follow-up did not reuse the required prior identifier.");
    }
  }
}

function validateSchema(value, schema, path, findings, depth) {
  if (!isObject(schema) || depth > MAX_DEPTH) return;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  if (types.length && !types.some((type) => matchesType(value, type))) {
    add(findings, "high", "argument_type_mismatch", path, "Observed argument type does not match the declared schema.");
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => scalarEqual(candidate, value))) {
    add(findings, "high", "argument_enum_mismatch", path, "Observed argument is outside the declared enum.");
  }
  if (isObject(value)) {
    const properties = isObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) if (!Object.hasOwn(value, key)) add(findings, "high", "missing_required_argument", `${path}.${key}`, "Required argument is missing.");
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) add(findings, "high", "unexpected_argument", `${path}.${key}`, "Argument is not declared by the schema.");
    }
    for (const [key, child] of Object.entries(value)) if (isObject(properties[key])) validateSchema(child, properties[key], `${path}.${key}`, findings, depth + 1);
  }
  if (Array.isArray(value) && isObject(schema.items)) value.forEach((child, index) => validateSchema(child, schema.items, `${path}[${index}]`, findings, depth + 1));
}

function validateSchemaDefinition(schema, path, findings, depth) {
  if (!isObject(schema) || depth > MAX_DEPTH) return;
  if (typeof schema.description === "string" && INSTRUCTION_LIKE.test(schema.description)) {
    add(findings, "high", "instruction_like_schema_metadata", `${path}.description`, "Schema metadata contains instruction-like text; rewrite it as an input description.");
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  if (types.some((type) => typeof type !== "string" || !SUPPORTED_TYPES.has(type))) {
    add(findings, "high", "unsupported_schema_type", `${path}.type`, "Schema type must use the supported JSON value types.");
  }
  if (Array.isArray(schema.required) && schema.required.some((item) => typeof item !== "string")) {
    add(findings, "high", "invalid_schema_required", `${path}.required`, "Schema required entries must be strings.");
  }
  if (isObject(schema.properties)) for (const [key, child] of Object.entries(schema.properties)) validateSchemaDefinition(child, `${path}.properties.${key}`, findings, depth + 1);
  if (isObject(schema.items)) validateSchemaDefinition(schema.items, `${path}.items`, findings, depth + 1);
}

function scanSecrets(value, path, findings, seen = new WeakSet(), depth = 0) {
  if (depth > MAX_DEPTH) return;
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) add(findings, "critical", "secret_like_value", path, "Secret-like content is present; replace it with a synthetic placeholder.");
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (SECRET_KEY.test(key) && (typeof child === "string" || typeof child === "number") && child !== "[REDACTED]" && child !== "synthetic") {
      add(findings, "critical", "secret_like_field", childPath, "Secret-like fields must be removed or explicitly redacted.");
    }
    scanSecrets(child, childPath, findings, seen, depth + 1);
  }
}

function summarize(cases, findings) {
  const passed = cases.filter((item) => item.passed).length;
  const negative = cases.filter((item) => item.kind === "negative");
  const confirmation = findings.filter((item) => item.code === "missing_confirmation_evidence").length;
  return {
    tools: null,
    cases: cases.length,
    passed,
    failed: cases.length - passed,
    passRate: Number((passed / cases.length).toFixed(4)),
    negativePassRate: negative.length ? Number((negative.filter((item) => item.passed).length / negative.length).toFixed(4)) : null,
    missingConfirmationEvidence: confirmation,
    findings: findings.length
  };
}

export function reportAsMarkdown(report) {
  const lines = ["# Plugin evaluation replay", "", `Cases: ${report.totals.passed}/${report.totals.cases} passed`, `Pass rate: ${(report.totals.passRate * 100).toFixed(1)}%`, ""];
  if (!report.findings.length) lines.push("No findings.");
  for (const finding of report.findings) lines.push(`- **${finding.severity.toUpperCase()} ${finding.code}** at \`${escapeMarkdown(finding.path)}\`: ${escapeMarkdown(finding.message)}`);
  return `${lines.join("\n")}\n`;
}

export function hasBlockingFindings(report) {
  return report.findings.some((finding) => SEVERITY[finding.severity] >= SEVERITY.high);
}

function assertBounded(root) {
  let nodes = 0;
  const visit = (value, depth) => {
    nodes += 1;
    if (nodes > MAX_NODES) throw new InputError("Input contains too many values.");
    if (depth > MAX_DEPTH) throw new InputError(`Input nesting exceeds ${MAX_DEPTH}.`);
    if (value && typeof value === "object") for (const child of Object.values(value)) visit(child, depth + 1);
  };
  visit(root, 0);
}

function add(findings, severity, code, path, message) { findings.push({ severity, code, path, message }); }
function sortFindings(findings) { return [...findings].sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity] || a.path.localeCompare(b.path) || a.code.localeCompare(b.code)); }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validName(value) { return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value); }
function validId(value) { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(value); }
function matchesType(value, type) { return type === "null" ? value === null : type === "array" ? Array.isArray(value) : type === "object" ? isObject(value) : type === "integer" ? Number.isInteger(value) : type === "number" ? typeof value === "number" && Number.isFinite(value) : type === "string" ? typeof value === "string" : type === "boolean" ? typeof value === "boolean" : true; }
function scalarEqual(a, b) { return (a === null || ["string", "number", "boolean"].includes(typeof a)) && Object.is(a, b); }
function validObjectPath(path) { return typeof path === "string" && path.length > 0 && path.split(".").every((part) => part.length > 0 && !["__proto__", "prototype", "constructor"].includes(part)); }
function getOwnPath(value, path) {
  if (!validObjectPath(path)) return undefined;
  return path.split(".").reduce((current, part) => current !== null && typeof current === "object" && Object.hasOwn(current, part) ? current[part] : undefined, value);
}
function escapeMarkdown(value) { return String(value).replace(/[\\`*_{}\[\]()#+.!|<>]/g, "\\$&").replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "?"); }
