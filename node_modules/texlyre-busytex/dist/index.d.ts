interface BusyTexConfig {
    busytexBasePath?: string;
    verbose?: boolean;
}
interface CompileOptions {
    input: string;
    bibtex?: boolean;
    verbose?: 'silent' | 'info' | 'debug';
    driver?: 'xetex_bibtex8_dvipdfmx' | 'pdftex_bibtex8' | 'luahbtex_bibtex8' | 'luatex_bibtex8';
    dataPackagesJs?: string[];
    additionalFiles?: FileInput[];
}
interface FileInput {
    path: string;
    content: string;
}
interface CompileResult {
    success: boolean;
    pdf?: Uint8Array;
    synctex?: Uint8Array;
    log: string;
    exitCode: number;
    logs: LogEntry[];
}
interface LogEntry {
    cmd: string;
    texmflog: string;
    missfontlog: string;
    log: string;
    aux: string;
    stdout: string;
    stderr: string;
    exit_code: number;
}
interface PdfLatexOptions extends CompileOptions {
}
interface XeLatexOptions extends CompileOptions {
}
interface LuaLatexOptions extends CompileOptions {
}

declare class BusyTexRunner {
    private config;
    private logger;
    private initialized;
    private worker;
    private busytexPipeline;
    constructor(config?: BusyTexConfig);
    initialize(useWorker?: boolean): Promise<void>;
    private initializeWorker;
    private initializeDirect;
    private convertFilesToBusyTexFormat;
    compile(files: FileInput[], mainTexPath: string, bibtex?: boolean | null, verbose?: 'silent' | 'info' | 'debug', driver?: 'xetex_bibtex8_dvipdfmx' | 'pdftex_bibtex8' | 'luahbtex_bibtex8' | 'luatex_bibtex8', dataPackagesJs?: string[] | null): Promise<CompileResult>;
    private compileWithWorker;
    private compileDirect;
    terminate(): void;
    isInitialized(): boolean;
    getConfig(): Required<BusyTexConfig>;
}

declare class Logger {
    private verbose;
    constructor(verbose?: boolean);
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

declare abstract class BaseTool {
    protected runner: BusyTexRunner;
    protected logger: Logger;
    constructor(runner: BusyTexRunner, verbose?: boolean);
    protected abstract getDriver(): 'xetex_bibtex8_dvipdfmx' | 'pdftex_bibtex8' | 'luahbtex_bibtex8' | 'luatex_bibtex8';
    compile(options: CompileOptions): Promise<CompileResult>;
    private getMainTexPath;
    private prepareFiles;
}

declare class PdfLatex extends BaseTool {
    protected getDriver(): 'pdftex_bibtex8';
    compile(options: PdfLatexOptions): Promise<CompileResult>;
}

declare class XeLatex extends BaseTool {
    protected getDriver(): 'xetex_bibtex8_dvipdfmx';
    compile(options: XeLatexOptions): Promise<CompileResult>;
}

declare class LuaLatex extends BaseTool {
    protected getDriver(): 'luahbtex_bibtex8';
    compile(options: LuaLatexOptions): Promise<CompileResult>;
}

export { BusyTexRunner, Logger, LuaLatex, PdfLatex, XeLatex };
export type { BusyTexConfig, CompileOptions, CompileResult, FileInput, LogEntry, LuaLatexOptions, PdfLatexOptions, XeLatexOptions };
