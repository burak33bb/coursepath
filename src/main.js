import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";
import { CONTRACT_ADDRESS, EXPLORER } from "./config.js";
import { connect, shortAddress } from "./wallet.js";
import "./styles.css";

const $ = (selector) => document.querySelector(selector);
const reader = createClient({ chain: studionet });
let writer = null;
let account = "";
const address = CONTRACT_ADDRESS;
let busy = false;
let toastTimer;

$("#connect").addEventListener("click", connectWallet);
$("#add-course").addEventListener("click", () => addCourse());
$("#example").addEventListener("click", loadExample);
$("#plan").addEventListener("click", submitPlan);
$("#refresh").addEventListener("click", () => loadPlans("finalized", true));
addCourse();
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", (accounts) => setAccount(accounts[0] || ""));
  window.ethereum.on?.("chainChanged", () => location.reload());
  window.ethereum.request({ method: "eth_accounts" }).then((accounts) => setAccount(accounts[0] || "")).catch(() => {});
}
setStatus("Loading shared plan history", "Reading CoursePath's shared Studionet registry. A wallet is only needed to submit a plan.", "info");
loadPlans();

function addCourse(code = "", url = "") {
  if ($("#courses").children.length >= 5) return notify("A plan can contain up to five courses.");
  const row = document.createElement("div");
  row.className = "course-row";
  row.innerHTML = `<label>COURSE CODE<input class="course-code" maxlength="20" placeholder="CS201" value="${escapeHtml(code)}" /></label><label>OFFICIAL CATALOG PAGE<input class="course-url" type="url" placeholder="https://catalog.example.edu/course/CS201" value="${escapeHtml(url)}" /></label><button class="remove" type="button" aria-label="Remove course">×</button>`;
  row.querySelector(".remove").addEventListener("click", () => {
    if ($("#courses").children.length > 1) row.remove();
    else { row.querySelector(".course-code").value = ""; row.querySelector(".course-url").value = ""; }
  });
  $("#courses").append(row);
}

function loadExample(event) {
  event.preventDefault();
  $("#courses").replaceChildren();
  addCourse("CS314", "https://catalog.utexas.edu/courses/c_s/");
  addCourse("CS312", "https://catalog.utexas.edu/courses/c_s/");
  $("#completed").value = "M408C";
  notify("Example: UT Austin catalog CS 312 → CS 314; M408C is marked completed.");
}

async function connectWallet() {
  if (!window.ethereum) return setStatus("Wallet not found", "Open this site in a wallet-enabled browser to submit a consensus plan.", "error");
  try { setAccount(await connect(window.ethereum)); setStatus("Wallet connected", `${shortAddress(account)} · GenLayer Studionet`, "success"); }
  catch (error) { setStatus("Connection failed", readableError(error), "error"); }
}

function setAccount(value) {
  account = value;
  writer = value ? createClient({ chain: studionet, account: value, provider: window.ethereum }) : null;
  $("#connect").textContent = shortAddress(value);
}

async function submitPlan() {
  if (busy) return;
  if (!address) return setStatus("Connect a contract first", "Paste the deployed CoursePath contract address below.", "error");
  if (!writer) return connectWallet();
  const rows = [...$("#courses").querySelectorAll(".course-row")];
  const courses = rows.map((row) => ({ code: row.querySelector(".course-code").value.trim().toUpperCase(), url: row.querySelector(".course-url").value.trim() }));
  const completed = $("#completed").value.split(",").map((code) => code.trim().toUpperCase()).filter(Boolean);
  if (courses.some((course) => !course.code || !course.url)) return notify("Fill in a course code and official catalog URL for every row.");
  if (new Set(courses.map((course) => course.code)).size !== courses.length) return notify("Course codes must be unique in one plan.");
  if (!courses.every((course) => { try { const url = new URL(course.url); return url.protocol === "https:"; } catch { return false; } })) return notify("Use an HTTPS catalog URL for every course.");
  busy = true;
  $("#plan").disabled = true;
  $("#plan").textContent = "Waiting for consensus…";
  setStatus("Confirm in your wallet", "GenLayer validators will read each official course page. Do not submit the same plan twice while it runs.", "pending");
  try {
    const previousCount = Number(await reader.readContract({ address, functionName: "get_plan_count", args: [], stateStatus: "finalized" }));
    if (!Number.isSafeInteger(previousCount) || previousCount < 0) throw new Error("Could not verify the current plan count.");
    const hash = await writer.writeContract({ address, functionName: "review_plan", args: [JSON.stringify(courses), JSON.stringify(completed)], value: BigInt(0) });
    const link = $("#tx-link");
    link.href = `${EXPLORER}/tx/${hash}`;
    link.hidden = false;
    link.textContent = `View ${hash.slice(0, 10)}… ↗`;
    setStatus("Consensus running", "Checking catalog evidence and prerequisite order.", "pending");
    const accepted = await reader.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, interval: 3000, retries: 180, fullTransaction: true });
    assertSuccessful(accepted);
    const finalReceipt = await reader.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 240, fullTransaction: true });
    assertSuccessful(finalReceipt);
    const savedCount = await loadPlans("finalized", false);
    if (savedCount !== previousCount + 1) throw new Error("The transaction finished, but the contract did not save a plan. Open the transaction and check Error Details.");
    setStatus("Plan finalized", "The catalog interpretation and sequence are saved in the shared contract registry.", "success");
  } catch (error) { setStatus("Plan not saved", readableError(error), "error"); notify("Check the transaction result and error details before retrying."); }
  finally { busy = false; $("#plan").disabled = false; $("#plan").innerHTML = 'Check catalog requirements <span>→</span>'; }
}

async function loadPlans(stateStatus = "finalized", announce = true) {
  if (!address) return null;
  try {
    const count = Number(await reader.readContract({ address, functionName: "get_plan_count", args: [], stateStatus }));
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("The contract returned an invalid plan count.");
    $("#count").textContent = String(count);
    const rows = [];
    for (let id = count; id >= Math.max(1, count - 9); id -= 1) rows.push(parseValue(await reader.readContract({ address, functionName: "get_plan", args: [id], stateStatus })));
    renderPlans(rows.filter(Boolean));
    if (announce) setStatus("Planner ready", count === 0 ? "The shared CoursePath registry is connected. No plans have been saved yet." : `${count} shared plan${count === 1 ? "" : "s"} loaded from Studionet.`, "success");
    return count;
  } catch (error) { setStatus("Could not read plan history", `${readableError(error)} · check the address and network.`, "error"); return null; }
}

function renderPlans(plans) {
  const host = $("#plans"); host.replaceChildren();
  if (!plans.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "No plans have been saved yet. Accepted consensus plans will appear here."; host.append(empty); return; }
  for (const plan of plans) {
    const card = document.createElement("article"); card.className = "plan-card";
    const order = Array.isArray(plan.course_order) ? plan.course_order : [];
    const missing = Array.isArray(plan.missing_prerequisites) ? plan.missing_prerequisites : [];
    const courses = Array.isArray(plan.courses) ? plan.courses : [];
    const unclear = Array.isArray(plan.unclear_courses) ? plan.unclear_courses : [];
    card.innerHTML = `<div class="plan-head"><span>PLAN ${escapeHtml(String(plan.id).padStart(3, "0"))}</span><b class="${plan.status === "READY" ? "ready" : "incomplete"}">${escapeHtml(plan.status || "UNKNOWN")}</b></div><h3>${order.length ? order.map(escapeHtml).join(" → ") : "No valid sequence"}</h3><p>${escapeHtml(plan.explanation || "")}</p>${missing.length ? `<p class="missing">Unmet: ${missing.map((item) => `${escapeHtml(item.course_code)} needs ${escapeHtml((item.options || []).join(" or "))}`).join("; ")}</p>` : ""}${unclear.length ? `<p class="missing">Catalog prerequisites need a human check for: ${unclear.map(escapeHtml).join(", ")}</p>` : ""}<details><summary>Catalog evidence (${courses.length} courses)</summary>${courses.map((item) => `<section><b>${escapeHtml(item.course_code)} · ${escapeHtml(item.title)}${item.prerequisite_status === "UNCLEAR" ? " · UNCLEAR" : ""}</b><p>${(item.evidence || []).map(escapeHtml).join(" · ")}</p><a href="${safeHref(item.source_url)}" target="_blank" rel="noreferrer">Official catalog ↗</a></section>`).join("")}</details>`;
    host.append(card);
  }
}

function parseValue(value) { if (value && typeof value === "object" && !ArrayBuffer.isView(value)) return value; const raw = typeof value === "string" ? value : new TextDecoder().decode(value); return JSON.parse(raw); }
function safeHref(value) { try { const url = new URL(value); return url.protocol === "https:" ? url.href : "#"; } catch { return "#"; } }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function assertSuccessful(receipt) {
  const failed = receipt?.consensus_data?.leader_receipt?.find((item) => item.execution_result === "ERROR" || item.result?.status === "contract_error");
  if (failed) {
    const details = failed.genvm_result?.stderr || "";
    if (details.includes("WEBPAGE_LOAD_FAILED")) throw new Error("A course catalog page could not be read by the validators. No plan was saved. Check the transaction details.");
    const lastLine = details.trim().split("\n").filter(Boolean).at(-1);
    throw new Error(lastLine || "Contract execution failed; no plan was saved.");
  }
  if (receipt?.txExecutionResultName && receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) throw new Error(`Contract execution: ${receipt.txExecutionResultName}`);
}
function setStatus(title, message, kind) { $("#status-title").textContent = title; $("#status-message").textContent = message; $("#status").dataset.kind = kind; }
function readableError(error) { return String(error?.shortMessage || error?.message || "Request failed."); }
function notify(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("visible"), 3800); }
