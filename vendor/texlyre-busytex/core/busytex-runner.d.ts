import { BusyTexConfig, CompileResult, FileInput } from './types';
export declare class BusyTexRunner {
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
//# sourceMappingURL=busytex-runner.d.ts.map