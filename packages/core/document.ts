/**
 * Metadata exported from app/layout.tsx to generate the HTML document shell.
 */
export interface DocumentHead {
  /** Page title */
  title?: string;
  /** HTML lang attribute (default: "en") */
  lang?: string;
  /** Extra <meta> tags, e.g. [{ name: "description", content: "..." }] */
  meta?: Record<string, string>[];
  /** CSS file paths → <link rel="stylesheet"> */
  links?: string[];
  /** Inline CSS strings → <style>...</style> */
  styles?: string[];
}

export interface DocumentOptions {
  /** HTML to place inside the root element. */
  bodyHtml?: string;
  /** Stylesheet paths emitted by the selected bundler. */
  stylesheets?: string[];
  /** Module script paths emitted by the selected bundler. */
  scripts?: string[];
  /** Module paths to preload before hydration. */
  modulePreloads?: string[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a DocumentHead to a full HTML string ready to serve as index.html.
 */
export function renderDocument(
  head: DocumentHead = {},
  options: DocumentOptions = {},
): string {
  const lang = head.lang || "en";
  const title = head.title || "Ultimate.js";

  let h = "";
  h += `\n  <meta charset="UTF-8" />`;
  h +=
    `\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
  h += `\n  <title>${escapeHtml(title)}</title>`;

  if (head.meta) {
    for (const m of head.meta) {
      const attrs = Object.entries(m)
        .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
        .join(" ");
      h += `\n  <meta ${attrs} />`;
    }
  }

  if (head.links) {
    for (const href of head.links) {
      h += `\n  <link rel="stylesheet" href="${escapeHtml(href)}" />`;
    }
  }

  if (head.styles) {
    for (const css of head.styles) {
      h += `\n  <style>${css}</style>`;
    }
  }

  for (const href of options.stylesheets ?? []) {
    h += `\n  <link rel="stylesheet" href="${escapeHtml(href)}" />`;
  }

  for (const href of options.modulePreloads ?? []) {
    h += `\n  <link rel="modulepreload" href="${escapeHtml(href)}" />`;
  }

  for (const src of options.scripts ?? ["/assets/client.js"]) {
    h += `\n  <script type="module" src="${escapeHtml(src)}"></script>`;
  }

  const bodyHtml = options.bodyHtml ?? "";

  return `<!doctype html>
<html lang="${lang}">
<head>${h}
</head>
<body>
  <div id="root">${bodyHtml}</div>
</body>
</html>`;
}
