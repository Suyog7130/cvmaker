// Engine wrapper for TeXlyre BusyTeX (LuaLaTeX/PdfLaTeX/XeLaTeX in browser).

let busytexMod = null;

// Global scope in assets/engine.js
let pipelineInstance = null;

  // Ensure DOM is ready before initializing BusyTeX
  function initializePipeline() {
    console.log("Initializing BusyTeX engine (this may take a moment)...");
    pipelineInstance = new BusytexPipeline({
      root: APP_BASE + "core/busytex/",
      template: "moderncv",
      engine: "lualatex"
    });
    // Optional: wait for it to be ready
    return pipelineInstance.initialize().then(() => pipelineInstance);
  }

  if (!pipelineInstance) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        return initializePipeline();
      } else {
        return new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', () => {
            initializePipeline().then(resolve);
          });
        });
      }
    } else {
      throw new Error('BusyTeX requires a browser DOM environment.');
    }
  }
  return pipelineInstance;
}


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

// Optionally pass onLoading callback to show progress to user
export class LatexEngineManager {
  constructor({ busytexBasePath = "/cvmaker/core/busytex", useWorker = true, onLoading = null } = {}) {
    this.busytexBasePath = busytexBasePath;
    this.useWorker = useWorker;
    this.runner = null;
    this.engineName = "lualatex";
    this.engine = null;
    this.root = "";
    this.onLoading = onLoading; // Callback for loading status
  }

  async initIfNeeded() {
    const mod = await loadBusyTexModule();
    if (this.runner && this.runner.isInitialized()) return;

    // Notify user that WASM is loading (if callback provided)
    if (typeof this.onLoading === 'function') {
      this.onLoading('Downloading and compiling BusyTeX engine (WASM)... This may take up to a minute on first load.');
    } else {
      console.log('Downloading and compiling BusyTeX engine (WASM)... This may take up to a minute on first load.');
    }

    this.runner = new mod.BusyTexRunner({
      busytexBasePath: "/cvmaker/core/busytex", // Use empty string to load from worker's own directory
      verbose: false,
      root: this.root
    });

    // initialize(true) enables Web Worker.
    await this.runner.initialize(!!this.useWorker);

    // Loading complete
    if (typeof this.onLoading === 'function') {
      this.onLoading(null);
    }
  }
// Server-side/deployment note:
// To further reduce WASM load/compile time, serve busytex.wasm with gzip or brotli compression and correct MIME type (application/wasm).
// Consider using a CDN for faster delivery. If possible, use instantiateStreaming in the worker/module for best performance.

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
