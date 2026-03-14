import {
  getEnrolledRepos,
  getRunsForRepo,
  getRunForIssue,
  getPendingActions,
  getRunsMapByIssueNumber,
  getPendingActionsCount,
} from "./queries"

// Mock Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockSingle = jest.fn()
const mockFilter = jest.fn()
const mockOr = jest.fn()
const mockIn = jest.fn()

const chainMock = {
  select: mockSelect,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  filter: mockFilter,
  or: mockOr,
  in: mockIn,
}

// each mock returns chainMock for chaining
beforeEach(() => {
  jest.clearAllMocks()
  mockSelect.mockReturnValue(chainMock)
  mockEq.mockReturnValue(chainMock)
  mockOrder.mockReturnValue(chainMock)
  mockLimit.mockReturnValue(chainMock)
  mockSingle.mockReturnValue(chainMock)
  mockFilter.mockReturnValue(chainMock)
  mockOr.mockReturnValue(chainMock)
  mockIn.mockReturnValue(chainMock)
})

const mockFrom = jest.fn().mockReturnValue(chainMock)

jest.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

describe("getEnrolledRepos", () => {
  it("queries enrolled_repos filtered by installed_by", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    await getEnrolledRepos("user123")

    expect(mockFrom).toHaveBeenCalledWith("enrolled_repos")
    expect(mockSelect).toHaveBeenCalledWith("*")
    expect(mockEq).toHaveBeenCalledWith("installed_by", "user123")
  })

  it("returns repos array on success", async () => {
    const repos = [{ id: 1, owner: "acme", repo: "api", installed_by: "user123" }]
    mockEq.mockResolvedValueOnce({ data: repos, error: null })

    const result = await getEnrolledRepos("user123")

    expect(result).toEqual(repos)
  })

  it("throws on Supabase error", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getEnrolledRepos("user123")).rejects.toThrow("DB error")
  })
})

describe("getRunsForRepo", () => {
  it("queries agent_runs filtered by owner and repo", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await getRunsForRepo("acme", "api")

    expect(mockFrom).toHaveBeenCalledWith("agent_runs")
    expect(mockEq).toHaveBeenCalledWith("repo_owner", "acme")
    expect(mockEq).toHaveBeenCalledWith("repo_name", "api")
    expect(mockOrder).toHaveBeenCalledWith("updated_at", { ascending: false })
  })

  it("returns runs array on success", async () => {
    const runs = [{ run_id: "run-1", status: "completed" }]
    mockOrder.mockResolvedValueOnce({ data: runs, error: null })

    const result = await getRunsForRepo("acme", "api")

    expect(result).toEqual(runs)
  })

  it("throws on Supabase error", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getRunsForRepo("acme", "api")).rejects.toThrow("DB error")
  })
})

describe("getRunForIssue", () => {
  it("queries agent_runs with JSON path filter for issueNumber", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })

    await getRunForIssue("acme", "api", 42)

    expect(mockFrom).toHaveBeenCalledWith("agent_runs")
    expect(mockFilter).toHaveBeenCalledWith(
      "goal->context",
      "cs",
      expect.stringContaining("42")
    )
  })

  it("returns null when not found", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })

    const result = await getRunForIssue("acme", "api", 42)

    expect(result).toBeNull()
  })

  it("throws on unexpected error", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getRunForIssue("acme", "api", 42)).rejects.toThrow("DB error")
  })
})

describe("getPendingActions", () => {
  it("queries pending_actions for a run_id with status pending", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await getPendingActions("run-1")

    expect(mockFrom).toHaveBeenCalledWith("pending_actions")
    expect(mockEq).toHaveBeenCalledWith("run_id", "run-1")
    expect(mockEq).toHaveBeenCalledWith("status", "pending")
  })

  it("returns pending actions array", async () => {
    const actions = [{ id: 1, run_id: "run-1", tool: "pushCode", status: "pending" }]
    mockOrder.mockResolvedValueOnce({ data: actions, error: null })

    const result = await getPendingActions("run-1")

    expect(result).toEqual(actions)
  })
})

describe("getRunsMapByIssueNumber", () => {
  it("maps runs by goal.context.issueNumber", async () => {
    const runs = [
      { run_id: "run-1", goal: { context: { issueNumber: 10 } }, status: "completed" },
      { run_id: "run-2", goal: { context: { issueNumber: 20 } }, status: "running" },
    ]
    mockOrder.mockResolvedValueOnce({ data: runs, error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.get(10)).toEqual(runs[0])
    expect(map.get(20)).toEqual(runs[1])
    expect(map.size).toBe(2)
  })

  it("returns empty map when no runs exist", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.size).toBe(0)
  })

  it("ignores runs without issueNumber in goal context", async () => {
    const runs = [
      { run_id: "run-1", goal: { context: { issueNumber: 10 } }, status: "completed" },
      { run_id: "run-2", goal: { context: {} }, status: "running" },
      { run_id: "run-3", goal: {}, status: "failed" },
    ]
    mockOrder.mockResolvedValueOnce({ data: runs, error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.size).toBe(1)
    expect(map.get(10)).toEqual(runs[0])
  })

  it("keeps first run when multiple exist for same issue (duplicate key guard)", async () => {
    const runs = [
      { run_id: "run-1", goal: { context: { issueNumber: 10 } }, status: "completed" },
      { run_id: "run-2", goal: { context: { issueNumber: 10 } }, status: "running" },
    ]
    mockOrder.mockResolvedValueOnce({ data: runs, error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.size).toBe(1)
    expect(map.get(10)?.run_id).toBe("run-1")
  })
})

describe("getPendingActionsCount", () => {
  it("returns 0 when no enrolled repos", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(0)
  })

  it("returns 0 when no runs for enrolled repos", async () => {
    // Step 1: getEnrolledRepos
    mockEq.mockResolvedValueOnce({
      data: [{ owner: "acme", repo: "api" }],
      error: null,
    })
    // Step 2: get run_ids
    mockOr.mockResolvedValueOnce({ data: [], error: null })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(0)
  })

  it("returns count of pending actions across all enrolled repos", async () => {
    // Step 1: getEnrolledRepos
    mockEq.mockResolvedValueOnce({
      data: [{ owner: "acme", repo: "api" }],
      error: null,
    })
    // Step 2: get run_ids
    mockOr.mockResolvedValueOnce({
      data: [{ run_id: "run-1" }, { run_id: "run-2" }],
      error: null,
    })
    // Step 3: count pending actions
    mockEq.mockResolvedValueOnce({ count: 5, error: null })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(5)
  })

  it("returns 0 when count is null", async () => {
    mockEq.mockResolvedValueOnce({
      data: [{ owner: "acme", repo: "api" }],
      error: null,
    })
    mockOr.mockResolvedValueOnce({
      data: [{ run_id: "run-1" }],
      error: null,
    })
    mockEq.mockResolvedValueOnce({ count: null, error: null })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(0)
  })

  it("throws when getEnrolledRepos fails", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getPendingActionsCount("user123")).rejects.toThrow("DB error")
  })

  it("throws when fetching runs fails", async () => {
    mockEq.mockResolvedValueOnce({
      data: [{ owner: "acme", repo: "api" }],
      error: null,
    })
    mockOr.mockResolvedValueOnce({ data: null, error: { message: "runs error" } })

    await expect(getPendingActionsCount("user123")).rejects.toThrow("runs error")
  })
})
