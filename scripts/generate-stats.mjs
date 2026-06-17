import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const USERNAME = "mrLogerman";
const statsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "mrLogerman-stats");

if (!process.env.PAT_1) {
  console.error("Set PAT_1 to a GitHub token with repo + read:user scopes.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${process.env.PAT_1}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

/** Sum author commits across all owned repos (public + private). */
async function fetchTotalCommitsFromRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?affiliation=owner&per_page=100&page=${page}`,
      { headers },
    );
    if (!res.ok) {
      throw new Error(`Failed to list repos: ${res.status}`);
    }
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  let total = 0;
  for (const repo of repos) {
    const res = await fetch(
      `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contributors?anon=true&per_page=100`,
      { headers },
    );
    if (res.status === 204 || !res.ok) continue;

    const text = await res.text();
    if (!text) continue;

    const contributors = JSON.parse(text);
    const mine =
      contributors.find((c) => c.login === USERNAME) ??
      contributors.find((c) => !c.login);

    total += mine?.contributions ?? 0;
  }

  return total;
}

/** Sum stargazers across all owned repos (public + private). */
async function fetchTotalStarsFromRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?affiliation=owner&per_page=100&page=${page}`,
      { headers },
    );
    if (!res.ok) {
      throw new Error(`Failed to list repos: ${res.status}`);
    }
    const batch = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0);
}

const { fetchStats } = await import(
  pathToFileURL(join(statsRoot, "src", "fetchers", "stats.js")).href
);
const { renderStatsCard } = await import(
  pathToFileURL(join(statsRoot, "src", "cards", "stats.js")).href
);

const stats = await fetchStats(USERNAME, false, [], false, false, false);
stats.totalCommits = await fetchTotalCommitsFromRepos();
stats.totalStars = await fetchTotalStarsFromRepos();

const userRes = await fetch("https://api.github.com/user", { headers });
const { followers } = await userRes.json();

const { calculateRank } = await import(
  pathToFileURL(join(statsRoot, "src", "calculateRank.js")).href
);
stats.rank = calculateRank({
  all_commits: true,
  commits: stats.totalCommits,
  prs: stats.totalPRs,
  issues: stats.totalIssues,
  reviews: stats.totalReviews,
  repos: 0,
  stars: stats.totalStars,
  followers,
});

const CARD_WIDTH = 467;

const svg = renderStatsCard(stats, {
  theme: "tokyonight",
  hide_border: true,
  show_icons: true,
  include_all_commits: true,
  card_width: CARD_WIDTH,
  hide: ["contribs"],
});

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
writeFileSync(join(outDir, "github-stats.svg"), svg, "utf8");
console.log(
  `Wrote assets/github-stats.svg (commits: ${stats.totalCommits}, stars: ${stats.totalStars}, rank: ${stats.rank.level})`,
);
