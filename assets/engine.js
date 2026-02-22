// Engine wrapper for TeXlyre BusyTeX (LuaLaTeX/PdfLaTeX/XeLaTeX in browser).

let busytexMod = null;

export async function loadBusyTexModule() {
  if (busytexMod) return busytexMod;

  // Prefer local vendored module.
  try {
    busytexMod = await import("../vendor/texlyre-busytex/index.js");
    return busytexMod;
  } catch (e1) {
    throw new Error(
      "BusyTeX module not found at ./vendor/texlyre-busytex/index.js. Run scripts/vendorize.mjs"
    );
  }
}

export class LatexEngineManager {
  constructor({ busytexBasePath = "/cvmaker/core/busytex", useWorker = true } = {}) {
    this.busytexBasePath = busytexBasePath;
    this.useWorker = useWorker;
    this.runner = null;
    this.engineName = "lualatex";
    this.engine = null;
    this.root = "https://cdn.jsdelivr.net/gh/suyoggarg/cvmaker/core/busytex/"; // Default to CDN, but can be overridden by config
  }

  async initIfNeeded() {
    const mod = await loadBusyTexModule();
    if (this.runner && this.runner.isInitialized()) return;

    this.runner = new mod.BusyTexRunner({
      busytexBasePath: "/cvmaker/core/busytex", // Use empty string to load from worker's own directory
      verbose: false,
      root: this.root
    });

    // initialize(true) enables Web Worker.
    await this.runner.initialize(!!this.useWorker);
  }

  async setEngine(engineName) {
    await this.initIfNeeded();
    if (engineName === this.engineName && this.engine) return;

    const mod = await loadBusyTexModule();
    this.engineName = engineName;

    if (engineName === "xelatex") this.engine = new mod.XeLatex(this.runner);
    else if (engineName === "pdflatex") this.engine = new mod.PdfLatex(this.runner);
    else this.engine = new mod.LuaLatex(this.runner);
  }

  terminate() {
    if (this.runner) this.runner.terminate();
    this.runner = null;
    this.engine = null;
  }

  async compile({ input, bibtex = false, additionalFiles = [], verbose = "info" }) {
    await this.initIfNeeded();
    await this.setEngine(this.engineName);

    const result = await this.engine.compile({
      input,
      bibtex,
      additionalFiles,
      verbose, // 'silent' | 'info' | 'debug'
    });

    return result;
  }
}
