class Logger {
    constructor(verbose = false) {
        this.verbose = verbose;
    }
    debug(message, ...args) {
        if (this.verbose) {
            console.debug(`[BusyTeX Debug] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        console.info(`[BusyTeX] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.warn(`[BusyTeX Warning] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[BusyTeX Error] ${message}`, ...args);
    }
}

class ErrorHandler {
    static handle(error, context) {
        const message = this.getMessage(error);
        const fullMessage = context ? `${context}: ${message}` : message;
        return new Error(fullMessage);
    }
    static getMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}

class BusyTexRunner {
    /**
     * Initializes a new instance of the BusyTeX wrapper class.
     * 
     * @param {Object} config - Configuration object for BusyTeX setup
     * @param {string} [config.busytexBasePath='/core/busytex'] - Base path for BusyTeX resources
     * @param {boolean} [config.verbose=false] - Enable verbose logging output
     */
    constructor(config = {}) {
        this.initialized = false;
        this.worker = null;
        this.busytexPipeline = null;
        this.config = {
            busytexBasePath: (config.busytexBasePath || '/cvmaker/core/busytex').replace(/\/+$/, ''),
            verbose: config.verbose ?? false
        };
        // Remove any trailing slashes (including multiple)
        this.config.busytexBasePath = this.config.busytexBasePath.replace(/\/+$/, '');
        this.logger = new Logger(this.config.verbose);
    }
    async initialize(useWorker = true) {
        if (this.initialized)
            return;
        this.logger.info('Initializing BusyTeX...');
        try {
            if (useWorker) {
                await this.initializeWorker();
            }
            else {
                await this.initializeDirect();
            }
            this.initialized = true;
            this.logger.info('BusyTeX initialized successfully');
        }
        catch (error) {
            throw ErrorHandler.handle(error, 'Failed to initialize BusyTeX');
        }
    }
    async initializeWorker() {
        return new Promise((resolve, reject) => {
            const workerPath = `${this.config.busytexBasePath}/busytex_worker.js`;
            this.worker = new Worker(workerPath);
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for BusyTeX worker to initialize'));
            }, 120000);
            this.worker.onmessage = ({ data }) => {
                if (data.initialized) {
                    clearTimeout(timeout);
                    this.logger.debug('BusyTeX worker initialized:', data.initialized);
                    resolve();
                }
                else if (data.exception) {
                    clearTimeout(timeout);
                    reject(new Error(data.exception));
                }
            };
            this.worker.onerror = (error) => {
                clearTimeout(timeout);
                reject(new Error(`Worker error: ${error.message}`));
            };
            // Avoid repeating busytexBasePath if already included
            const busytexJs = `${this.config.busytexBasePath}/busytex.js`;
            const busytexWasm = `${this.config.busytexBasePath}/busytex.wasm`;
            const texliveBasic = `${this.config.busytexBasePath}/texlive-basic.js`;
            const texliveExtras = `${this.config.busytexBasePath}/texlive-extra.js`;
            this.worker.postMessage({
                busytex_js: busytexJs,
                busytex_wasm: busytexWasm,
                preload_data_packages_js: [texliveBasic, texliveExtras],
                data_packages_js: [texliveBasic],
                texmf_local: [],
                preload: true
            });
        });
    }
    async initializeDirect() {
        const pipelineScript = `${this.config.busytexBasePath}/busytex_pipeline.js`;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = pipelineScript;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        const BusytexPipeline = window.BusytexPipeline;
        const busytexJs = `${this.config.busytexBasePath}/busytex.js`;
        const busytexWasm = `${this.config.busytexBasePath}/busytex.wasm`;
        const texliveBasic = `${this.config.busytexBasePath}/texlive-basic.js`;
        const texliveExtras = `${this.config.busytexBasePath}/texlive-extra.js`;
        this.busytexPipeline = new BusytexPipeline(
            busytexJs,
            busytexWasm,
            [texliveBasic, texliveExtras],
            [texliveBasic],
            [],
            (msg) => this.logger.debug(msg),
            (versions) => this.logger.debug('Applet versions:', versions),
            true,
            BusytexPipeline.ScriptLoaderDocument
        );
        await this.busytexPipeline.on_initialized_promise;
    }
    convertFilesToBusyTexFormat(files) {
        return files.map(f => ({
            path: f.path,
            contents: f.content
        }));
    }
    async compile(files, mainTexPath, bibtex = null, verbose = 'silent', driver = 'xetex_bibtex8_dvipdfmx', dataPackagesJs = null) {
        if (!this.initialized) {
            throw new Error('BusyTeX not initialized. Call initialize() first.');
        }
        this.logger.info(`Compiling ${mainTexPath}...`);
        const busytexFiles = this.convertFilesToBusyTexFormat(files);
        if (this.worker) {
            return this.compileWithWorker(busytexFiles, mainTexPath, bibtex, verbose, driver, dataPackagesJs);
        }
        else {
            return this.compileDirect(busytexFiles, mainTexPath, bibtex, verbose, driver, dataPackagesJs);
        }
    }
    async compileWithWorker(files, mainTexPath, bibtex, verbose, driver, dataPackagesJs) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }
            const timeout = setTimeout(() => {
                reject(new Error('Compilation timeout'));
            }, 120000);
            this.worker.onmessage = ({ data }) => {
                if (data.print) {
                    this.logger.debug(data.print);
                }
                else if (data.pdf !== undefined) {
                    clearTimeout(timeout);
                    resolve({
                        success: data.exit_code === 0,
                        pdf: data.pdf,
                        synctex: data.synctex,
                        log: data.log,
                        exitCode: data.exit_code,
                        logs: data.logs
                    });
                }
                else if (data.exception) {
                    clearTimeout(timeout);
                    reject(new Error(data.exception));
                }
            };
            this.worker.postMessage({
                files,
                main_tex_path: mainTexPath,
                bibtex,
                verbose,
                driver,
                data_packages_js: dataPackagesJs
            });
        });
    }
    async compileDirect(files, mainTexPath, bibtex, verbose, driver, dataPackagesJs) {
        const result = await this.busytexPipeline.compile(files, mainTexPath, bibtex, verbose, driver, dataPackagesJs);
        return {
            success: result.exit_code === 0,
            pdf: result.pdf,
            synctex: result.synctex,
            log: result.log,
            exitCode: result.exit_code,
            logs: result.logs
        };
    }
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        if (this.busytexPipeline) {
            this.busytexPipeline.terminate();
            this.busytexPipeline = null;
        }
        this.initialized = false;
        this.logger.info('BusyTeX terminated');
    }
    isInitialized() {
        return this.initialized;
    }
    getConfig() {
        return { ...this.config };
    }
}

class BaseTool {
    constructor(runner, verbose = false) {
        this.runner = runner;
        this.logger = new Logger(verbose);
    }
    async compile(options) {
        if (!this.runner.isInitialized()) {
            await this.runner.initialize();
        }
        const mainTexPath = this.getMainTexPath(options);
        const files = this.prepareFiles(options, mainTexPath);
        return this.runner.compile(files, mainTexPath, options.bibtex ?? null, options.verbose ?? 'silent', options.driver ?? this.getDriver(), options.dataPackagesJs ?? null);
    }
    getMainTexPath(options) {
        if (options.additionalFiles && options.additionalFiles.length > 0) {
            const mainFile = options.additionalFiles.find(f => f.path === 'main.tex');
            if (mainFile) {
                return 'main.tex';
            }
        }
        return 'main.tex';
    }
    prepareFiles(options, mainTexPath) {
        const files = [];
        files.push({ path: mainTexPath, content: options.input });
        if (options.additionalFiles) {
            files.push(...options.additionalFiles);
        }
        return files;
    }
}

class PdfLatex extends BaseTool {
    getDriver() {
        return 'pdftex_bibtex8';
    }
    async compile(options) {
        return super.compile({ ...options, driver: this.getDriver() });
    }
}

class XeLatex extends BaseTool {
    getDriver() {
        return 'xetex_bibtex8_dvipdfmx';
    }
    async compile(options) {
        return super.compile({ ...options, driver: this.getDriver() });
    }
}

class LuaLatex extends BaseTool {
    getDriver() {
        return 'luahbtex_bibtex8';
    }
    async compile(options) {
        return super.compile({ ...options, driver: this.getDriver() });
    }
}

export { BusyTexRunner, Logger, LuaLatex, PdfLatex, XeLatex };
//# sourceMappingURL=index.js.map
