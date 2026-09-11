import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the WA:AC application from the public home", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>[^<]*WA:AC<\/title>/i);
  assert.match(html, /WA:AC/);
  assert.match(html, /Codeforces player search/);
  assert.match(html, /Search a Codeforces handle/);
  assert.doesNotMatch(html, />AtCoder<\/a>/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("uses the locally hosted Cabinet Grotesk font", async () => {
  const source = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(source, /font-family: "Cabinet Grotesk Local"/);
  assert.match(source, /url\("\/fonts\/CabinetGrotesk-Variable\.woff2"\)/);
  assert.match(source, /--font-sans: var\(--font-cabinet-grotesk\)/);
  assert.match(source, /"Apple SD Gothic Neo"/);
});

test("the site header exposes a locally read changelog", async () => {
  const [header, dialog, entries] = await Promise.all([
    readFile(
      new URL("../components/shadcn-dashboard/shadcn-site-header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/whats-new-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/changelog.ts", import.meta.url), "utf8"),
  ]);

  assert.match(header, /<WhatsNewDialog \/>/);
  assert.match(dialog, /waac:last-seen-update/);
  assert.match(dialog, /window\.localStorage\.setItem/);
  assert.match(dialog, /What&apos;s new/);
  assert.match(entries, /Corrected incomplete problem lists\./);
  assert.match(entries, /Added a feedback form\./);
  assert.doesNotMatch(entries, /Sep 9, 2026/);
});

test("match history includes pagination and stale-state guards", async () => {
  const [source, dashboard] = await Promise.all([
    readFile(
      new URL("../components/shadcn-dashboard/shadcn-data-table.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/shadcn-dashboard/dashboard.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(source, /useState<5 \| 10 \| 20>\(10\)/);
  assert.match(source, /function changeView/);
  assert.match(source, /function changePageSize/);
  assert.match(source, /function changePage/);
  assert.match(source, /setOpenContest\(null\)/);
  assert.match(source, /No contests match this view\./);
  assert.match(source, /space-y-2 md:hidden/);
  assert.match(source, /hidden overflow-hidden rounded-lg border md:block/);
  assert.match(source, /Last AC \{duration\(session\)\}/);
  assert.equal((source.match(/<TabsContent/g) ?? []).length, 1);
  assert.match(dashboard, /key=\{`\$\{platform\}:\$\{history\.user\}:history`\}/);
});

test("profile header keeps its compact layout through medium-width screens", async () => {
  const source = await readFile(
    new URL("../components/shadcn-dashboard/shadcn-profile-header.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /md:flex md:flex-row/);
  assert.match(source, /grid-cols-4 gap-3 md:w-auto/);
  assert.doesNotMatch(source, /sm:flex sm:flex-row/);
});

test("site search moves to a full-width second header row on narrow screens", async () => {
  const [header, codeforces, atcoder] = await Promise.all([
    readFile(
      new URL("../components/shadcn-dashboard/shadcn-site-header.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/codeforces/codeforces-search.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atcoder/atcoder-search.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(header, /grid-cols-\[auto_1fr\]/);
  assert.match(header, /<div className="ml-auto w-full max-w-md min-w-0">/);
  assert.match(header, /sm:flex/);
  assert.match(header, /order-3 col-span-2 ml-auto flex items-center gap-2 sm:order-none sm:col-auto/);
  assert.doesNotMatch(header, /min-\[800px\]/);
  assert.match(codeforces, /flex w-full min-w-0 items-center/);
  assert.match(atcoder, /flex w-full min-w-0 items-center/);
});

test("chart image export includes the rendered legend labels", async () => {
  const [chart, exporter] = await Promise.all([
    readFile(new URL("../components/ui/chart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/share-chart.ts", import.meta.url), "utf8"),
  ]);

  assert.match(chart, /data-slot="chart-legend-item"/);
  assert.match(chart, /data-slot="chart-legend-swatch"/);
  assert.match(chart, /data-slot="chart-legend-label"/);
  assert.match(exporter, /function appendChartLegend/);
  assert.match(exporter, /appendChartLegend\(exportSvg, chart, bounds/);
});

test("upsolve supports numeric difficulty, tags, attempt state, and contest type", async () => {
  const source = await readFile(
    new URL(
      "../components/shadcn-dashboard/shadcn-upsolve-queue.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /const MIN_DIFFICULTY = 800/);
  assert.match(source, /const MAX_DIFFICULTY = 3500/);
  assert.match(source, /<Slider/);
  assert.match(source, /minStepsBetweenThumbs=\{1\}/);
  assert.match(source, /Any tag/);
  assert.match(source, /<CollapsibleContent[\s\S]*Problem tag[\s\S]*Any tag/);
  assert.match(source, /moreFilterCount/);
  assert.match(source, /Any attempt/);
  assert.match(source, /Only attempted/);
  assert.match(source, /useState<AttemptFilter>\("attempted"\)/);
  assert.match(source, /divide-y md:hidden/);
  assert.match(source, /hidden md:block/);
  assert.match(source, /Latest contest/);
  assert.match(source, /7 days/);
  assert.match(source, /30 days/);
  assert.match(source, /All time/);
  assert.match(source, /Actual \+ virtual/);
  assert.match(source, /Actual only/);
  assert.match(source, /Virtual only/);
  assert.doesNotMatch(source, /<Collapsible defaultOpen/);
  assert.doesNotMatch(source, /Latest 10 contests|During contest|Attempted or not/);
});

test("Codeforces builds histories without runtime catalog requests", async () => {
  const source = await readFile(new URL("../app/api/codeforces/route.ts", import.meta.url), "utf8");

  assert.match(source, /storedCatalog\.contestMetadata/);
  assert.match(source, /return buildHistory\(user, ratings, submissions, storedContests\)/);
  assert.doesNotMatch(source, /"problemset\.problems"/);
  assert.doesNotMatch(source, /"contest\.list"/);
});

test("Codeforces fills known gaps in the global problem catalog", async () => {
  const [source, script, analytics] = await Promise.all([
    readFile(new URL("../app/api/codeforces/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/backfill-codeforces-contests.mjs", import.meta.url), "utf8"),
    readFile(new URL("../components/site-analytics.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /contestProblemOverrides/);
  assert.match(source, /backfilledContestCatalog/);
  assert.match(source, /completeContestProblems\(/);
  assert.match(script, /contest\.standings/);
  assert.match(script, /problemset\.problems/);
  assert.match(script, /readProblemsBeforeStandingsRows/);
  assert.doesNotMatch(script, /showUnofficial/);
  assert.match(script, /ratingDisagreements/);
  assert.match(script, /syncContestMetadata/);
  assert.match(script, /startTimeSeconds/);
  assert.match(script, /durationSeconds/);
  assert.match(script, /Run the same command to resume/);
  assert.match(analytics, /return "Home"/);
});

test("Codeforces backfill skips access-restricted legacy contests", async () => {
  const source = await readFile(
    new URL("../scripts/backfill-codeforces-contests.mjs", import.meta.url),
    "utf8",
  );

  assert.match(source, /PERMANENTLY_UNAVAILABLE_CONTEST_IDS/);
  assert.match(source, /1597, 1596, 1595/);
  assert.match(source, /826, 728, 726, 693/);
  assert.match(source, /!PERMANENTLY_UNAVAILABLE_CONTEST_IDS\.has\(contest\.id\)/);
});

test("random search resolves the handle before loading its history", async () => {
  const [route, search, randomCatalog] = await Promise.all([
    readFile(new URL("../app/api/codeforces/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/codeforces/codeforces-search.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/codeforces-random-handles.json", import.meta.url), "utf8"),
  ]);

  assert.match(route, /searchParams\.get\("randomHandle"\)/);
  assert.match(route, /codeforces-random-handles\.json/);
  assert.doesNotMatch(route, /user\.ratedList/);
  assert.match(route, /\{ handle: user\.handle \}/);
  assert.ok(JSON.parse(randomCatalog).handles.length >= 1_000);
  assert.match(search, /Choosing a random player…/);
  assert.match(search, /setHandle\(nextHandle\)/);
  assert.match(search, /loadPlayer\(nextHandle\)/);
});

test("Codeforces user-specific APIs run in the browser", async () => {
  const [route, search] = await Promise.all([
    readFile(new URL("../app/api/codeforces/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/codeforces/codeforces-search.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(search, /https:\/\/codeforces\.com\/api\/\$\{method\}/);
  assert.match(search, /directCodeforcesRequest<CfSubmissionIdentity\[]>\("user\.status"/);
  assert.match(search, /directCodeforcesRequest<CfRatingIdentity\[]>\("user\.rating"/);
  assert.match(search, /ratingsPromise/);
  assert.match(search, /ratingPending: true/);
  assert.match(search, /body: JSON\.stringify\(\{ user, ratings: \[\], submissions \}\)/);
  assert.match(search, /statistics are visible/);
  assert.match(search, /void directCodeforcesRequest<CfUser\[]>\("user\.info"/);
  assert.match(search, /method: "POST"/);
  assert.match(route, /export async function POST/);
  assert.match(route, /buildHistoryWithCatalog/);
  assert.doesNotMatch(route, /codeforcesRequest<CfSubmission\[]>\("user\.status"/);
  assert.doesNotMatch(route, /codeforcesRequest<CfRating\[]>\("user\.rating"/);
});

test("feedback stays minimal and saves through the Worker", async () => {
  const [dialog, worker, migration] = await Promise.all([
    readFile(new URL("../components/feedback-dialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0001_feedback.sql", import.meta.url), "utf8"),
  ]);

  assert.match(dialog, /<textarea/);
  assert.doesNotMatch(dialog, /placeholder=/);
  assert.doesNotMatch(dialog, /feedback-contact|feedback-type/);
  assert.match(worker, /url\.pathname === "\/api\/feedback"/);
  assert.match(worker, /INSERT INTO feedback \(message, section, country, fingerprint\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS feedback/);
});

test("analytics distinguishes anonymous new and returning visitors", async () => {
  const [analytics, siteAnalytics, worker] = await Promise.all([
    readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/site-analytics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(analytics, /waac_analytics_visitor_id/);
  assert.match(analytics, /waac_analytics_session_id/);
  assert.match(analytics, /waac_analytics_last_activity/);
  assert.match(analytics, /30 \* 60 \* 1_000/);
  assert.match(analytics, /return_visit/);
  assert.match(analytics, /visitor_new/);
  assert.match(analytics, /visitor_returning/);
  assert.match(siteAnalytics, /recordVisitorSession\(section, platform\)/);
  assert.match(worker, /cleanId\(payload\?\.visitorId\)/);
  assert.match(worker, /cleanId\(payload\?\.sessionId\)/);
  assert.match(worker, /WA_NEW_VISITORS/);
  assert.match(worker, /WA_RETURNING_SESSIONS/);
});
