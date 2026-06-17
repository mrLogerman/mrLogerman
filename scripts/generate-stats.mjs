import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const statsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "mrLogerman-stats");

if (!process.env.PAT_1) {
  console.error("Set PAT_1 to a GitHub token with repo + read:user scopes.");
  process.exit(1);
}

const { fetchStats } = await import(
  pathToFileURL(join(statsRoot, "src", "fetchers", "stats.js")).href
);
const { renderStatsCard } = await import(
  pathToFileURL(join(statsRoot, "src", "cards", "stats.js")).href
);

const stats = await fetchStats("mrLogerman", true, [], false, false, false);

const svg = renderStatsCard(stats, {
  theme: "tokyonight",
  hide_border: true,
  show_icons: true,
  include_all_commits: true,
});

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
writeFileSync(join(outDir, "github-stats.svg"), svg, "utf8");
console.log(`Wrote assets/github-stats.svg (commits: ${stats.totalCommits})`);
