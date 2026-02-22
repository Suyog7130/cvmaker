import { BaseTool } from './base-tool';
import { LuaLatexOptions, CompileResult } from '../core/types';
export declare class LuaLatex extends BaseTool {
    protected getDriver(): 'luahbtex_bibtex8';
    compile(options: LuaLatexOptions): Promise<CompileResult>;
}
//# sourceMappingURL=lualatex.d.ts.map