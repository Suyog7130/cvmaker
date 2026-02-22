import { BaseTool } from './base-tool';
import { XeLatexOptions, CompileResult } from '../core/types';
export declare class XeLatex extends BaseTool {
    protected getDriver(): 'xetex_bibtex8_dvipdfmx';
    compile(options: XeLatexOptions): Promise<CompileResult>;
}
//# sourceMappingURL=xelatex.d.ts.map