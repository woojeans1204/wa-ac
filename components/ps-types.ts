export type Submission = {
  id: number
  result: string
  epoch_second: number
  language?: string
  contestClock?: { elapsedSecond?: number; insideSession?: boolean }
}

export type Problem = {
  problemId: string
  index: string
  title?: string
  difficulty?: number | null
  difficultyColor?: string | null
  attempted: boolean
  solved: boolean
  submissions: Submission[]
}

export type Session = {
  sessionId: string
  type: "actual" | "virtual" | "practice"
  contestId: string
  contestTitle?: string
  startAt: string
  sourceUrl?: string
  metrics: {
    solved: number
    attempted: number
    failedSubmissions: number
    submissionCount: number
    highestSolvedDifficulty?: number | null
    lastAcEpochSecond?: number | null
  }
  problems: Problem[]
}

export type UpsolveItem = {
  id: string
  sourceSessionId: string
  contestId: string
  contestTitle?: string
  contestStartAt: string
  problemId: string
  problemIndex: string
  problemTitle?: string
  difficulty?: number | null
  difficultyColor?: string | null
  attemptedInContest: boolean
  completed: boolean
  completedAt?: string | null
  problemUrl: string
}

export type History = {
  user: string
  summary: {
    sessions: number
    actualSessions: number
    virtualSessions: number
    practiceSessions: number
    submissions: number
  }
  sessions: Session[]
  upsolves?: UpsolveItem[]
  raw?: {
    actualHistory?: Array<{
      contestId: string
      title?: string
      dateText: string
      rank?: number | null
      performance?: number | null
      newRating?: number | null
      ratingDiff?: number | null
    }>
  }
}
