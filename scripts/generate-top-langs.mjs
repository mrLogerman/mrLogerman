import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const statsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "mrLogerman-stats");

if (!process.env.PAT_1) {
  console.error("Set PAT_1 to a GitHub token with repo + read:user scopes.");
  process.exit(1);
}

const { fetchTopLanguages } = await import(
  pathToFileURL(join(statsRoot, "src", "fetchers", "top-languages.js")).href
);
const { renderTopLanguages } = await import(
  pathToFileURL(join(statsRoot, "src", "cards", "top-languages.js")).href
);

const topLangs = await fetchTopLanguages("mrLogerman", [], 1, 0);

const svg = renderTopLanguages(topLangs, {
  theme: "tokyonight",
  hide_border: true,
  layout: "compact",
  langs_count: 8,
  hide_title: false,
  custom_title: "Most Used Languages",
});

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
writeFileSync(join(outDir, "top-langs.svg"), svg, "utf8");
console.log("Wrote assets/top-langs.svg");
