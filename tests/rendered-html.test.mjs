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
  assert.equal((source.match(/<TabsContent/g) ?? []).length, 1);
  assert.match(dashboard, /key=\{`\$\{platform\}:\$\{history\.user\}:history`\}/);
});

test("upsolve supports numeric difficulty, tags, and contest type", async () => {
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
