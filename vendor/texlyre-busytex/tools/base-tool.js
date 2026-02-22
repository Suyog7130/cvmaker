import { Logger } from '../utils/logger';
export class BaseTool {
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
//# sourceMappingURL=base-tool.js.map