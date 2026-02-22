# CV Maker (Static, Browser LaTeX CV Builder)

This is a static website project that lets you build a CV in the browser using a two-pane UI.

- Left pane: template selection, profile, sections, bibliography, advanced settings, import/export, console
- Right pane: live PDF preview, with download and open buttons
- LaTeX compilation runs inside the browser via BusyTeX (WebAssembly), no server required

## What is included in this zip

This zip contains the full web UI and template system, plus glue code for BusyTeX.

It does **not** include the BusyTeX WebAssembly assets, because they are large (often hundreds of megabytes). You download them once with the command below.

## Requirements

- Node.js (only needed once to download BusyTeX assets and vendor the JS module)
- A static web server for local testing (any is fine)
  - Python: `python3 -m http.server 8080`
  - Node: `npx serve`

## Quick start (local)

From the project root:

```bash
npm init -y
npm i texlyre-busytex
npx texlyre-busytex download-assets ./core
node scripts/vendorize.mjs
python3 -m http.server 8080
```

Open:

- `http://localhost:8080/`

Then click **Compile**.

## Deploy to your website

This is a pure static site. Copy the whole folder to a path on your site, for example:

- `https://your-domain.example/cv-maker/`

Important notes:

- Keep `.nojekyll` if you use GitHub Pages, so the `core/` folder is served correctly.
- Make sure your host serves `.js` as `text/javascript` and supports large files if you include BusyTeX assets.

## BusyTeX assets

BusyTeX assets are downloaded into:

- `core/busytex/`

You should deploy that folder too if you want the compiler to work on the hosted site.

If you do not deploy it, the UI will still load, but compilation will fail because the engine assets are missing.

## Templates and class files

Templates are declared in:

- `static/classes/manifest.json`

Each template entry can list files that are automatically injected into compilation as `additionalFiles`.

### ModernCV

The `moderncv` option is included as a scaffold. To make it compile:

1. Put `moderncv.cls` and any needed `.sty` files into:
   - `static/classes/moderncv/`
2. Add all required file names to the `files` list in `manifest.json`

If your ModernCV setup relies on fonts or many packages, you may need to add them too. Browser TeX environments can be more limited than a full TeX Live install.

## Import and export

- Export LaTeX: writes `cv.tex` with an embedded `%% CVMAKER_JSON:` header so the UI state can be restored
- Export JSON: writes `cv.json`
- Import LaTeX:
  - If it contains `%% CVMAKER_JSON:`, it restores the full UI state
  - Otherwise, it switches to Raw LaTeX mode and compiles your file as-is

## Console and command palette

- Console tab shows compile logs and errors
- Ctrl+K opens a command palette for quick actions

## Folder layout

```text
cv-maker/
  index.html
  .nojekyll
  assets/
    app.js
    engine.js
    storage.js
    import_export.js
    style.css
    templates/
      minimal_academic.js
      moderncv.js
  static/
    classes/
      manifest.json
      minimal-academic/
        template.meta.json
      moderncv/
        template.meta.json
    examples/
      sample-importable.tex
  scripts/
    vendorize.mjs
  core/
    busytex/
      (downloaded assets go here)
  vendor/
    texlyre-busytex/
      (vendored JS module goes here)
```

## Notes, limitations

- Running LaTeX in the browser is powerful but not identical to a full desktop TeX Live.
- If a template uses packages not present in the BusyTeX distribution, compilation can fail until you add the required files.
- If you want “template-driven forms” that change per class, we can extend `manifest.json` with a JSON schema and generate the UI dynamically.

## License

This project skeleton is provided as-is. You should check licenses of any LaTeX class files you add and the BusyTeX package you download.
