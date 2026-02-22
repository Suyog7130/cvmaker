import { LatexEngineManager } from "./engine.js";
import { loadState, saveState } from "./storage.js";
import {
  encodeStateToComment,
  tryDecodeStateFromTex,
  downloadText,
  readFileAsText,
  readFileAsUint8
} from "./import_export.js";

import { renderMinimalAcademic } from "./templates/minimal_academic.js";
import { renderModernCv } from "./templates/moderncv.js";

const MANIFEST_URL = "./static/classes/manifest.json";
const BUSYTEX_BASE_PATH = "./core/busytex";

const el = (id) => document.getElementById(id);

const UI = {
  templateSelect: el("templateSelect"),
  templateHint: el("templateHint"),
  engineSelect: el("engineSelect"),
  useWorker: el("useWorker"),

  fullName: el("fullName"),
  tagline: el("tagline"),
  email: el("email"),
  website: el("website"),
  location: el("location"),
  links: el("links"),

  eduList: el("eduList"),
  expList: el("expList"),
  skillList: el("skillList"),
  customBlockList: el("customBlockList"),

  addEdu: el("addEdu"),
  addExp: el("addExp"),
  addSkill: el("addSkill"),
  addCustomBlock: el("addCustomBlock"),

  bibEnabled: el("bibEnabled"),
  bibStyle: el("bibStyle"),
  bibFileName: el("bibFileName"),
  bibContent: el("bibContent"),

  customPreamble: el("customPreamble"),
  extraFiles: el("extraFiles"),
  extraFilesList: el("extraFilesList"),

  importTex: el("importTex"),
  exportTex: el("exportTex"),
  exportJson: el("exportJson"),
  rawMode: el("rawMode"),
  rawLatex: el("rawLatex"),

  btnCompile: el("btnCompile"),
  btnDownloadPdf: el("btnDownloadPdf"),
  btnOpenPdf: el("btnOpenPdf"),
  btnCmdk: el("btnCmdk"),
  clearLog: el("clearLog"),
  resetEngine: el("resetEngine"),

  consoleLog: el("consoleLog"),
  statusDot: el("statusDot"),
  statusText: el("statusText"),
  lastBuildMeta: el("lastBuildMeta"),
  pdfFrame: el("pdfFrame"),

  cmdkOverlay: el("cmdkOverlay"),
  cmdkInput: el("cmdkInput"),
  cmdkList: el("cmdkList"),
};

let manifest = null;

let state = loadState() || {
  version: 1,
  selectedTemplateId: "minimal-academic",
  engine: "lualatex",
  useWorker: true,

  profile: {
    fullName: "Suyog Garg",
    tagline: "",
    email: "",
    website: "",
    location: "",
    links: [],
  },

  education: [],
  experience: [],
  skills: [],
  customBlocks: [],

  bibliography: {
    enabled: false,
    style: "plain",
    fileName: "references.bib",
    content: "",
  },

  customPreamble: "",
  extraFiles: [], // { path, bytesBase64, isBinary }
  rawMode: false,
  rawLatex: "",
};

let pdfUrl = null;

const engineMgr = new LatexEngineManager({
  busytexBasePath: BUSYTEX_BASE_PATH,
  useWorker: state.useWorker,
});

function logLine(s) {
  UI.consoleLog.textContent += s + "\n";
  UI.consoleLog.scrollTop = UI.consoleLog.scrollHeight;
}
function clearLog() { UI.consoleLog.textContent = ""; }

function setStatus(kind, text) {
  UI.statusDot.className = "dot " + kind;
  UI.statusText.textContent = text;
}

function persist() {
  saveState(state);
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
  return await r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
  return await r.text();
}

function b64FromBytes(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}
function bytesFromB64(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function syncUIFromState() {
  UI.engineSelect.value = state.engine;
  UI.useWorker.checked = !!state.useWorker;
  UI.rawMode.checked = !!state.rawMode;
  UI.rawLatex.value = state.rawLatex || "";

  UI.fullName.value = state.profile.fullName || "";
  UI.tagline.value = state.profile.tagline || "";
  UI.email.value = state.profile.email || "";
  UI.website.value = state.profile.website || "";
  UI.location.value = state.profile.location || "";
  UI.links.value = (state.profile.links || []).join("\n");

  UI.bibEnabled.checked = !!state.bibliography.enabled;
  UI.bibStyle.value = state.bibliography.style || "plain";
  UI.bibFileName.value = state.bibliography.fileName || "references.bib";
  UI.bibContent.value = state.bibliography.content || "";

  UI.customPreamble.value = state.customPreamble || "";

  renderLists();
  renderExtraFilesList();
}

function syncStateFromUI() {
  state.engine = UI.engineSelect.value;
  state.useWorker = !!UI.useWorker.checked;
  state.rawMode = !!UI.rawMode.checked;
  state.rawLatex = UI.rawLatex.value;

  state.profile.fullName = UI.fullName.value.trim();
  state.profile.tagline = UI.tagline.value.trim();
  state.profile.email = UI.email.value.trim();
  state.profile.website = UI.website.value.trim();
  state.profile.location = UI.location.value.trim();
  state.profile.links = UI.links.value.split("\n").map(x => x.trim()).filter(Boolean);

  state.bibliography.enabled = !!UI.bibEnabled.checked;
  state.bibliography.style = UI.bibStyle.value.trim() || "plain";
  state.bibliography.fileName = UI.bibFileName.value.trim() || "references.bib";
  state.bibliography.content = UI.bibContent.value;

  state.customPreamble = UI.customPreamble.value;
}

function renderLists() {
  UI.eduList.innerHTML = "";
  state.education.forEach((e, idx) => {
    UI.eduList.appendChild(makeEduCard(e, idx));
  });

  UI.expList.innerHTML = "";
  state.experience.forEach((e, idx) => {
    UI.expList.appendChild(makeExpCard(e, idx));
  });

  UI.skillList.innerHTML = "";
  state.skills.forEach((s, idx) => {
    UI.skillList.appendChild(makeSkillCard(s, idx));
  });

  UI.customBlockList.innerHTML = "";
  state.customBlocks.forEach((b, idx) => {
    UI.customBlockList.appendChild(makeCustomBlockCard(b, idx));
  });
}

function makeEduCard(e, idx) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">Education #${idx + 1}</div>
      <button class="btn small" data-action="remove">Remove</button>
    </div>
    <div class="grid2">
      <div class="field"><label>From</label><input data-k="from" value="${e.from || ""}"></div>
      <div class="field"><label>To</label><input data-k="to" value="${e.to || ""}"></div>
      <div class="field"><label>Degree</label><input data-k="degree" value="${e.degree || ""}"></div>
      <div class="field"><label>Institution</label><input data-k="institution" value="${e.institution || ""}"></div>
      <div class="field"><label>Location</label><input data-k="location" value="${e.location || ""}"></div>
      <div class="field"><label>Details (one per line)</label><textarea rows="4" data-k="details">${e.details || ""}</textarea></div>
    </div>
  `;
  card.querySelector('[data-action="remove"]').onclick = () => {
    state.education.splice(idx, 1);
    persist(); renderLists();
  };
  card.querySelectorAll("input,textarea").forEach(inp => {
    inp.addEventListener("input", () => {
      e[inp.dataset.k] = inp.value;
      persist();
    });
  });
  return card;
}

function makeExpCard(e, idx) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">Experience #${idx + 1}</div>
      <button class="btn small" data-action="remove">Remove</button>
    </div>
    <div class="grid2">
      <div class="field"><label>From</label><input data-k="from" value="${e.from || ""}"></div>
      <div class="field"><label>To</label><input data-k="to" value="${e.to || ""}"></div>
      <div class="field"><label>Title</label><input data-k="title" value="${e.title || ""}"></div>
      <div class="field"><label>Organization</label><input data-k="organization" value="${e.organization || ""}"></div>
      <div class="field"><label>Location</label><input data-k="location" value="${e.location || ""}"></div>
      <div class="field"><label>Details (one per line)</label><textarea rows="4" data-k="details">${e.details || ""}</textarea></div>
    </div>
  `;
  card.querySelector('[data-action="remove"]').onclick = () => {
    state.experience.splice(idx, 1);
    persist(); renderLists();
  };
  card.querySelectorAll("input,textarea").forEach(inp => {
    inp.addEventListener("input", () => {
      e[inp.dataset.k] = inp.value;
      persist();
    });
  });
  return card;
}

function makeSkillCard(s, idx) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">Skill #${idx + 1}</div>
      <button class="btn small" data-action="remove">Remove</button>
    </div>
    <div class="field">
      <label>Name</label>
      <input data-k="name" value="${s.name || ""}">
    </div>
  `;
  card.querySelector('[data-action="remove"]').onclick = () => {
    state.skills.splice(idx, 1);
    persist(); renderLists();
  };
  card.querySelector("input").addEventListener("input", (ev) => {
    s.name = ev.target.value;
    persist();
  });
  return card;
}

function makeCustomBlockCard(b, idx) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="cardHeader">
      <div class="cardTitle">Custom block #${idx + 1}</div>
      <button class="btn small" data-action="remove">Remove</button>
    </div>
    <div class="field">
      <label>Raw LaTeX</label>
      <textarea rows="8" data-k="latex">${b.latex || ""}</textarea>
    </div>
  `;
  card.querySelector('[data-action="remove"]').onclick = () => {
    state.customBlocks.splice(idx, 1);
    persist(); renderLists();
  };
  card.querySelector("textarea").addEventListener("input", (ev) => {
    b.latex = ev.target.value;
    persist();
  });
  return card;
}

function renderExtraFilesList() {
  if (!state.extraFiles.length) {
    UI.extraFilesList.textContent = "No extra files uploaded.";
    return;
  }
  UI.extraFilesList.textContent = state.extraFiles.map(f => f.path).join(" | ");
}

async function loadManifest() {
  manifest = await fetchJson(MANIFEST_URL);
  UI.templateSelect.innerHTML = "";

  for (const t of manifest.templates) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    UI.templateSelect.appendChild(opt);
  }

  UI.templateSelect.value = state.selectedTemplateId || manifest.templates[0]?.id;
  onTemplateChanged();
}

function onTemplateChanged() {
  state.selectedTemplateId = UI.templateSelect.value;
  persist();

  const t = manifest.templates.find(x => x.id === state.selectedTemplateId);
  UI.templateHint.textContent = t?.hint || "";
}

function buildLatexSource() {
  if (state.rawMode) {
    const tex = (state.rawLatex || "").trim();
    return tex;
  }

  const tpl = manifest.templates.find(x => x.id === state.selectedTemplateId);
  const stateSnapshot = structuredClone(state);

  if (tpl?.id === "moderncv") return renderModernCv(stateSnapshot);
  return renderMinimalAcademic(stateSnapshot);
}

async function collectAdditionalFiles() {
  const tpl = manifest.templates.find(x => x.id === state.selectedTemplateId);

  const files = [];

  if (tpl?.files && tpl.files.length) {
    for (const rel of tpl.files) {
      const url = `./static/classes/${tpl.id}/${rel}`;
      const content = await fetchText(url);
      files.push({ path: rel, content });
    }
  }

  for (const f of state.extraFiles) {
    const bytes = bytesFromB64(f.bytesBase64);
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    files.push({ path: f.path, content: s });
  }

  if (state.bibliography.enabled && state.bibliography.content.trim()) {
    files.push({
      path: state.bibliography.fileName || "references.bib",
      content: state.bibliography.content,
    });
  }

  return files;
}

function setPdf(blobBytes) {
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  const blob = new Blob([blobBytes], { type: "application/pdf" });
  pdfUrl = URL.createObjectURL(blob);

  UI.pdfFrame.src = pdfUrl;
  UI.btnDownloadPdf.disabled = false;
  UI.btnOpenPdf.disabled = false;

  UI.btnOpenPdf.onclick = () => window.open(pdfUrl, "_blank", "noopener,noreferrer");
  UI.btnDownloadPdf.onclick = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "cv.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
}

async function compileNow() {
  syncStateFromUI();
  persist();

  clearLog();
  setStatus("busy", "Compiling…");

  engineMgr.useWorker = state.useWorker;
  engineMgr.engineName = state.engine;

  try {
    const latex = buildLatexSource();
    const additionalFiles = await collectAdditionalFiles();

    logLine(`[engine] ${state.engine} | worker=${state.useWorker} | template=${state.selectedTemplateId}`);
    logLine(`[files] additionalFiles=${additionalFiles.length}`);

    const t0 = performance.now();
    const result = await engineMgr.compile({
      input: latex,
      bibtex: !!state.bibliography.enabled,
      additionalFiles,
      verbose: "info",
    });
    const t1 = performance.now();

    UI.lastBuildMeta.textContent = `exitCode=${result.exitCode} | ${(t1 - t0).toFixed(0)} ms`;

    if (result.log) logLine(result.log);
    if (Array.isArray(result.logs)) {
      for (const entry of result.logs) {
        if (typeof entry === "string") logLine(entry);
        else logLine(JSON.stringify(entry));
      }
    }

    if (result.success && result.pdf) {
      setPdf(result.pdf);
      setStatus("ok", "Success…");
    } else {
      setStatus("bad", "Failed…");
    }
  } catch (err) {
    setStatus("bad", "Error…");
    logLine(`[error] ${err?.message || String(err)}`);
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".tabpane").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      el(btn.dataset.tab).classList.add("active");
    });
  });
}

function setupActions() {
  UI.templateSelect.addEventListener("change", onTemplateChanged);

  UI.btnCompile.addEventListener("click", compileNow);
  UI.clearLog.addEventListener("click", () => clearLog());
  UI.resetEngine.addEventListener("click", () => {
    engineMgr.terminate();
    logLine("[engine] terminated");
  });

  UI.addEdu.addEventListener("click", () => {
    state.education.push({ from:"", to:"", degree:"", institution:"", location:"", details:"" });
    persist(); renderLists();
  });
  UI.addExp.addEventListener("click", () => {
    state.experience.push({ from:"", to:"", title:"", organization:"", location:"", details:"" });
    persist(); renderLists();
  });
  UI.addSkill.addEventListener("click", () => {
    state.skills.push({ name:"" });
    persist(); renderLists();
  });
  UI.addCustomBlock.addEventListener("click", () => {
    state.customBlocks.push({ latex:"% put any custom LaTeX here\n" });
    persist(); renderLists();
  });

  [
    UI.fullName, UI.tagline, UI.email, UI.website, UI.location,
    UI.links, UI.engineSelect, UI.useWorker,
    UI.bibEnabled, UI.bibStyle, UI.bibFileName, UI.bibContent,
    UI.customPreamble, UI.rawMode, UI.rawLatex
  ].forEach(inp => {
    inp.addEventListener("input", () => { syncStateFromUI(); persist(); });
    inp.addEventListener("change", () => { syncStateFromUI(); persist(); });
  });

  UI.extraFiles.addEventListener("change", async () => {
    const files = Array.from(UI.extraFiles.files || []);
    for (const f of files) {
      const bytes = await readFileAsUint8(f);
      state.extraFiles.push({
        path: f.name,
        bytesBase64: b64FromBytes(bytes),
        isBinary: !f.name.match(/\.(tex|bib|cls|sty|bst|txt|md)$/i),
      });
    }
    persist();
    renderExtraFilesList();
    UI.extraFiles.value = "";
  });

  UI.exportTex.addEventListener("click", () => {
    syncStateFromUI(); persist();
    const latex = buildLatexSource();
    const header = encodeStateToComment(state);
    downloadText("cv.tex", header + latex + "\n");
  });

  UI.exportJson.addEventListener("click", () => {
    syncStateFromUI(); persist();
    downloadText("cv.json", JSON.stringify(state, null, 2));
  });

  UI.importTex.addEventListener("change", async () => {
    const f = UI.importTex.files?.[0];
    if (!f) return;
    const content = await readFileAsText(f);

    const decoded = tryDecodeStateFromTex(content);
    if (decoded) {
      state = decoded;
      persist();
      await loadManifest();
      syncUIFromState();
      logLine("[import] Restored full state from CVMAKER_JSON");
    } else {
      state.rawMode = true;
      state.rawLatex = content;
      persist();
      syncUIFromState();
      logLine("[import] No embedded state found. Switched to Raw LaTeX mode.");
    }

    UI.importTex.value = "";
  });
}

// Command palette
const COMMANDS = [
  { name: "Compile", run: () => compileNow() },
  { name: "Clear console", run: () => clearLog() },
  { name: "Reset engine", run: () => engineMgr.terminate() },
  { name: "Export LaTeX", run: () => UI.exportTex.click() },
  { name: "Export JSON", run: () => UI.exportJson.click() },
  { name: "Open PDF", run: () => UI.btnOpenPdf.click() },
  { name: "Download PDF", run: () => UI.btnDownloadPdf.click() },
];

function openCmdk() {
  UI.cmdkOverlay.classList.remove("hidden");
  UI.cmdkInput.value = "";
  renderCmdkList("");
  UI.cmdkInput.focus();
}
function closeCmdk() {
  UI.cmdkOverlay.classList.add("hidden");
}
function renderCmdkList(q) {
  const query = q.toLowerCase().trim();
  const filtered = COMMANDS.filter(c => c.name.toLowerCase().includes(query));
  UI.cmdkList.innerHTML = "";
  for (const c of filtered) {
    const div = document.createElement("div");
    div.className = "cmdkItem";
    div.textContent = c.name;
    div.onclick = () => { closeCmdk(); c.run(); };
    UI.cmdkList.appendChild(div);
  }
}

function setupCmdk() {
  UI.btnCmdk.addEventListener("click", openCmdk);
  UI.cmdkOverlay.addEventListener("click", (ev) => {
    if (ev.target === UI.cmdkOverlay) closeCmdk();
  });
  UI.cmdkInput.addEventListener("input", () => renderCmdkList(UI.cmdkInput.value));
  window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      openCmdk();
    } else if (ev.key === "Escape") {
      closeCmdk();
    }
  });
}

async function main() {
  setupTabs();
  setupActions();
  setupCmdk();

  await loadManifest();
  syncUIFromState();

  setStatus("idle", "Idle…");
}

main().catch(err => {
  setStatus("bad", "Init error…");
  logLine(`[init error] ${err?.message || String(err)}`);
});
