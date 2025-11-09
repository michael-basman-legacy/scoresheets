#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Recursively walk a directory and collect all PDF file paths.
 * @param {String} dir - Directory to start from.
 * @return {String[]} - Array of absolute file paths to PDFs.
 */
async function walkForPdfs(dir) {
  const results = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkForPdfs(full)));
    } else if (entry.isFile() && entry.name.endsWith(".pdf") || entry.name.endsWith("jpg")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Generate a simple HTML index file linking to the given PDF paths.
 * Writes the file "index.html" in the current working directory.
 * @param {String[]} pdfPaths - Array of absolute PDF file paths.
 * @return {Promise<void>} - Resolves when index.html has been written.
 */
async function generateHtmlIndex(pdfPaths) {
  const title = "Michael Basman Legacy Audio Cassette Booklets";

	const listItems = pdfPaths
	.map((absPath) => {
	// Path relative to docs directory for href
	const relToDocs = path.relative(path.join(process.cwd(), "docs"), absPath).split(path.sep).join("/");
	const href = encodeURI(relToDocs);
	return ` <li><a href="${href}">${relToDocs}</a></li>`;
	})
	.join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 2rem; }
    h1 { font-size: 1.5rem; }
    ul { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Index of audio chess CASSette booklets:</p>
  <ul>
${listItems}
  </ul>
</body>
</html>`;

  await fs.promises.writeFile("docs/index.html", html, "utf8");
}

(async function main() {
  try {
    const docsDir = path.join(process.cwd(), "docs");
    const exists = await fs.promises.stat(docsDir).then(() => true).catch(() => false);
    if (!exists) {
      console.error("Error: docs directory not found in current working directory.");
      process.exit(1);
    }

    const pdfs = await walkForPdfs(docsDir);
	
	const pdfObjs = pdfs.map(name => ({
        name,
        tokens: path.basename(name).match(/\d+|\D+/g).map(t => (isNaN(t) ? t.toLowerCase() : Number(t)))
    }));

	pdfObjs.sort((a, b) => {
	  const len = Math.max(a.tokens.length, b.tokens.length);
	  for (let i = 0; i < len; i++) {
		const x = a.tokens[i], y = b.tokens[i];
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		if (typeof x === 'number' && typeof y === 'number') {
		  if (x !== y) return x - y;
		} else if (x !== y) {
		  return x < y ? -1 : 1;
		}
	  }
	  return 0;
	});

    await generateHtmlIndex(pdfObjs.map(obj => obj.name));
    console.log("index.html has been written with", pdfs.length, "PDF(s).");
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
})();
