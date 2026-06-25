/**
 * Lightweight Markdown → HTML renderer for blog article bodies.
 *
 * Shared by the client article view (`client/src/pages/article.tsx`) and the
 * build-time prerenderer (`scripts/generate-prerender.ts`) so there is a single
 * source of truth for how article content is rendered. Output is sanitized with
 * DOMPurify on the client before injection; the prerender pipeline only ever
 * processes first-party content authored in `client/src/data/articles.ts`.
 */
export function renderArticleMarkdown(content: string): string {
  let html = content;

  // Process tables first (before other transformations)
  html = html.replace(/(\|[^\n]+\|\n)+/g, (tableMatch) => {
    const rows = tableMatch.trim().split("\n");
    let tableHtml = '<table class="w-full border-collapse my-6 text-sm">';

    rows.forEach((row, index) => {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:]+\|$/.test(row.trim())) {
        return;
      }

      const cells = row.split("|").filter((cell) => cell.trim() !== "");
      const isHeader = index === 0;
      const cellTag = isHeader ? "th" : "td";
      const cellClass = isHeader
        ? "border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-left"
        : "border border-slate-300 px-4 py-3";

      tableHtml += "<tr>";
      cells.forEach((cell) => {
        tableHtml += `<${cellTag} class="${cellClass}">${cell.trim()}</${cellTag}>`;
      });
      tableHtml += "</tr>";
    });

    tableHtml += "</table>";
    return tableHtml;
  });

  // Headers
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");

  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquotes (lines starting with >)
  html = html.replace(/(^> .*(?:\n> .*)*)/gm, (block) => {
    const text = block
      .split("\n")
      .map((l) => l.replace(/^> ?/, ""))
      .join(" ");
    return `<blockquote class="border-l-4 border-primary/40 pl-4 italic my-6 text-foreground">${text}</blockquote>`;
  });

  // Lists - tag ordered vs unordered separately so we can wrap correctly
  html = html.replace(/^\d+\. (.*$)/gim, '<li data-ol="1">$1</li>');
  html = html.replace(/^\- (.*$)/gim, '<li data-ul="1">$1</li>');

  // Wrap consecutive ordered list items in <ol>
  html = html.replace(/(<li data-ol="1">.*?<\/li>\n?)+/g, (match) =>
    `<ol class="my-4 ml-6 list-decimal space-y-2">${match.replace(/ data-ol="1"/g, "")}</ol>`,
  );
  // Wrap consecutive unordered list items in <ul>
  html = html.replace(/(<li data-ul="1">.*?<\/li>\n?)+/g, (match) =>
    `<ul class="my-4 ml-6 list-disc space-y-2">${match.replace(/ data-ul="1"/g, "")}</ul>`,
  );

  // Paragraphs - split by double newlines
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (
        block.startsWith("<h") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<table") ||
        block.startsWith("<pre") ||
        block.startsWith("<blockquote")
      ) {
        return block;
      }
      return `<p>${block}</p>`;
    })
    .join("\n");

  // Clean up any remaining single newlines in paragraphs
  html = html.replace(/<p>([^<]*)<\/p>/g, (_match, content) => {
    return `<p>${content.replace(/\n/g, " ")}</p>`;
  });

  return html;
}
