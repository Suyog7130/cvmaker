import { BaseTool } from './base-tool';
import { PdfLatexOptions, CompileResult } from '../core/types';
export declare class PdfLatex extends BaseTool {
    protected getDriver(): 'pdftex_bibtex8';
    compile(options: PdfLatexOptions): Promise<CompileResult>;
}
//# sourceMappingURL=pdflatex.d.ts.map