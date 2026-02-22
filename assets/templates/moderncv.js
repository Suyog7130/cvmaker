// ModernCV template scaffold.
// This will only compile if you provide moderncv class/sty files + their dependencies.
// Put them in static/classes/moderncv/ and list in manifest.json.

export function renderModernCv(state) {
  const p = state.profile;
  const customPreamble = state.customPreamble || "";

  return `
\\documentclass[11pt,a4paper]{moderncv}

\\moderncvstyle{classic}
\\moderncvcolor{blue}

${customPreamble}

\\name{${p.fullName || ""}}{}
\\email{${p.email || ""}}
\\homepage{${p.website || ""}}

\\begin{document}
\\makecvtitle

\\section{Education}
% TODO: generate \\cventry here

\\section{Experience}
% TODO: generate \\cventry here

\\end{document}
`.trim();
}
