export type ChangelogEntry = {
  id: string
  date: string
  title: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    id: "2026-09-11-loading-speed",
    date: "Sep 11, 2026",
    title: "Latest updates",
    changes: ["Made profile loading much faster."],
  },
  {
    id: "2026-09-10-contest-records",
    date: "Sep 10, 2026",
    title: "Latest updates",
    changes: [
      "Corrected incomplete problem lists.",
      "Added a feedback form.",
    ],
  },
]

export const latestChangelogId = changelog[0].id
