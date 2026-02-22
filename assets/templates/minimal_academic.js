// Minimal academic CV template that avoids relying on non-core packages.
// Designed to compile even in constrained TeX environments.

function escTex(s) {
  return String(s || "")
    .replaceAll("\\", "\\textbackslash{}")
    .replaceAll("&", "\\&")
    .replaceAll("%", "\\%")
    .replaceAll("$", "\\$")
    .replaceAll("#", "\\#")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("^", "\\^{}")
    .replaceAll("~", "\\~{}");
}

function linesToItemize(lines) {
  const items = (lines || "")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
  if (!items.length) return "";
  return [
    "\\begin{itemize}",
    ...items.map(x => `  \\item ${escTex(x)}`),
    "\\end{itemize}"
  ].join("\n");
}

export function renderMinimalAcademic(state) {
  const p = state.profile;

  const headerLinks = (p.links || [])
    .map(l => escTex(l))
    .join(" \\\\ ");

  const eduBlocks = (state.education || []).map(e => {
    const detail = linesToItemize(e.details || "");
    return [
      `\\textbf{${escTex(e.degree)}} \\hfill ${escTex(e.from)}--${escTex(e.to)}`,
      `${escTex(e.institution)}${e.location ? `, ${escTex(e.location)}` : ""}`,
      detail
    ].filter(Boolean).join("\n");
  });

  const expBlocks = (state.experience || []).map(e => {
    const detail = linesToItemize(e.details || "");
    return [
      `\\textbf{${escTex(e.title)}} \\hfill ${escTex(e.from)}--${escTex(e.to)}`,
      `${escTex(e.organization)}${e.location ? `, ${escTex(e.location)}` : ""}`,
      detail
    ].filter(Boolean).join("\n");
  });

  const skills = (state.skills || []).map(s => escTex(s.name || s)).filter(Boolean);
  const skillsLine = skills.length ? skills.join(", ") : "";

  const customBlocks = (state.customBlocks || []).map(b => b.latex || "").filter(Boolean);

  const customPreamble = state.customPreamble || "";

  return `
\\documentclass[11pt]{article}

% Basic page geometry without extra packages
\\setlength{\\oddsidemargin}{0in}
\\setlength{\\evensidemargin}{0in}
\\setlength{\\textwidth}{6.5in}
\\setlength{\\topmargin}{-0.4in}
\\setlength{\\textheight}{9.2in}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

${customPreamble}

\\begin{document}

{\\LARGE \\textbf{${escTex(p.fullName)}}}\\\\
${p.tagline ? `{\\large ${escTex(p.tagline)}}\\\\` : ""}
${p.email ? `${escTex(p.email)} \\\\` : ""}
${p.website ? `${escTex(p.website)} \\\\` : ""}
${p.location ? `${escTex(p.location)} \\\\` : ""}
${headerLinks ? `${headerLinks} \\\\` : ""}

\\vspace{6pt}
\\hrule
\\vspace{8pt}

${eduBlocks.length ? `\\section*{Education}\n${eduBlocks.map(x => x + "\n\\vspace{6pt}\n").join("\n")}` : ""}

${expBlocks.length ? `\\section*{Experience}\n${expBlocks.map(x => x + "\n\\vspace{6pt}\n").join("\n")}` : ""}

${skillsLine ? `\\section*{Skills}\n${skillsLine}\n` : ""}

${customBlocks.length ? `\\section*{Additional}\n${customBlocks.join("\n\n")}\n` : ""}

\\end{document}
`.trim();
}
