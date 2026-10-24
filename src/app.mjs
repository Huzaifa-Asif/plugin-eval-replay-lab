import { auditFixture, InputError, parseFixture, reportAsMarkdown } from "./core.mjs";

const input = document.querySelector("#fixture");
const output = document.querySelector("#output");
const status = document.querySelector("#status");

async function load(name) {
  const response = await fetch(`examples/${name}.json`, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Example unavailable.");
  input.value = await response.text();
  status.textContent = `${name === "valid" ? "Valid" : "Unsafe"} synthetic example loaded.`;
}

document.querySelector("#valid").addEventListener("click", () => load("valid").catch(showError));
document.querySelector("#unsafe").addEventListener("click", () => load("unsafe").catch(showError));
document.querySelector("#audit").addEventListener("click", () => {
  try {
    const report = auditFixture(parseFixture(input.value));
    output.textContent = reportAsMarkdown(report);
    status.textContent = `${report.totals.passed} of ${report.totals.cases} cases passed.`;
    output.focus();
  } catch (error) { showError(error); }
});

function showError(error) {
  output.textContent = error instanceof InputError ? error.message : "The operation failed safely.";
  status.textContent = "Audit could not run.";
}

load("valid").catch(showError);
