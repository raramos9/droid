import {
  getEnrolledRepos,
  getRunsForRepo,
  getRunForIssue,
  getPendingActions,
  getRunsMapByIssueNumber,
  getPendingActionsCount,
  getAllPendingActionsWithContext,
  getRepoConfigOverrides,
  updateRepoConfigOverrides,
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
const mockUpsert = jest.fn()
const mockUpdate = jest.fn()

const chainMock = {
  select: mockSelect,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
  filter: mockFilter,
  or: mockOr,
  in: mockIn,
  upsert: mockUpsert,
  update: mockUpdate,
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
  mockUpsert.mockReturnValue(chainMock)
  mockUpdate.mockReturnValue(chainMock)
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
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await getRunsForRepo("acme", "api")

    expect(mockFrom).toHaveBeenCalledWith("agent_runs")
    expect(mockEq).toHaveBeenCalledWith("repo_owner", "acme")
    expect(mockEq).toHaveBeenCalledWith("repo_name", "api")
    expect(mockOrder).toHaveBeenCalledWith("updated_at", { ascending: false })
  })

  it("applies a limit of 100 to prevent loading all runs", async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await getRunsForRepo("acme", "api")

    expect(mockLimit).toHaveBeenCalledWith(100)
  })

  it("returns runs array on success", async () => {
    const runs = [{ run_id: "run-1", status: "completed" }]
    mockLimit.mockResolvedValueOnce({ data: runs, error: null })

    const result = await getRunsForRepo("acme", "api")

    expect(result).toEqual(runs)
  })

  it("throws on Supabase error", async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

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
    mockLimit.mockResolvedValueOnce({ data: runs, error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.get(10)).toEqual(runs[0])
    expect(map.get(20)).toEqual(runs[1])
    expect(map.size).toBe(2)
  })

  it("returns empty map when no runs exist", async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.size).toBe(0)
  })

  it("ignores runs without issueNumber in goal context", async () => {
    const runs = [
      { run_id: "run-1", goal: { context: { issueNumber: 10 } }, status: "completed" },
      { run_id: "run-2", goal: { context: {} }, status: "running" },
      { run_id: "run-3", goal: {}, status: "failed" },
    ]
    mockLimit.mockResolvedValueOnce({ data: runs, error: null })

    const map = await getRunsMapByIssueNumber("acme", "api")

    expect(map.size).toBe(1)
    expect(map.get(10)).toEqual(runs[0])
  })

  it("keeps first run when multiple exist for same issue (duplicate key guard)", async () => {
    const runs = [
      { run_id: "run-1", goal: { context: { issueNumber: 10 } }, status: "completed" },
      { run_id: "run-2", goal: { context: { issueNumber: 10 } }, status: "running" },
    ]
    mockLimit.mockResolvedValueOnce({ data: runs, error: null })

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

  it("uses a join query on pending_actions instead of separate runs query", async () => {
    // Step 1: getEnrolledRepos
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    // Step 2: pending_actions join agent_runs
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    await getPendingActionsCount("user123")

    const fromCalls = mockFrom.mock.calls.map((c: unknown[]) => c[0])
    expect(fromCalls).toContain("pending_actions")
    expect(fromCalls).not.toContain("agent_runs")
  })

  it("returns count of pending actions filtered to enrolled repos", async () => {
    // Step 1: getEnrolledRepos
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    // Step 2: pending_actions with join — returns 3 actions for enrolled repo
    mockEq.mockResolvedValueOnce({
      data: [
        { id: 1, agent_runs: { repo_owner: "acme", repo_name: "api" } },
        { id: 2, agent_runs: { repo_owner: "acme", repo_name: "api" } },
        { id: 3, agent_runs: { repo_owner: "other", repo_name: "repo" } },
      ],
      error: null,
    })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(2)
  })

  it("returns 0 when join query returns empty data", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockEq.mockResolvedValueOnce({ data: [], error: null })

    const result = await getPendingActionsCount("user123")

    expect(result).toBe(0)
  })

  it("throws when getEnrolledRepos fails", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getPendingActionsCount("user123")).rejects.toThrow("DB error")
  })

  it("throws when pending actions query fails", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "actions error" } })

    await expect(getPendingActionsCount("user123")).rejects.toThrow("actions error")
  })
})

describe("getAllPendingActionsWithContext", () => {
  it("returns empty array when no enrolled repos", async () => {
    mockEq.mockResolvedValueOnce({ data: [], error: null })
    const result = await getAllPendingActionsWithContext("user123")
    expect(result).toEqual([])
  })

  it("uses join query on pending_actions instead of separate runs query", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await getAllPendingActionsWithContext("user123")

    const fromCalls = mockFrom.mock.calls.map((c: unknown[]) => c[0])
    expect(fromCalls).toContain("pending_actions")
    expect(fromCalls).not.toContain("agent_runs")
  })

  it("returns empty array when join query returns no actions", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockOrder.mockResolvedValueOnce({ data: [], error: null })
    const result = await getAllPendingActionsWithContext("user123")
    expect(result).toEqual([])
  })

  it("enriches pending actions with repo context from joined run", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          run_id: "run-1",
          tool: "pushCode",
          args: {},
          status: "pending",
          tool_use_id: "tui-1",
          created_at: "2026-01-01",
          agent_runs: {
            run_id: "run-1",
            repo_owner: "acme",
            repo_name: "api",
            goal: { context: { issueNumber: 5, title: "Fix bug" } },
          },
        },
      ],
      error: null,
    })

    const result = await getAllPendingActionsWithContext("user123")

    expect(result).toHaveLength(1)
    expect(result[0].repo_owner).toBe("acme")
    expect(result[0].repo_name).toBe("api")
    expect(result[0].issue_number).toBe(5)
    expect(result[0].issue_title).toBe("Fix bug")
    expect(result[0].tool).toBe("pushCode")
  })

  it("filters out actions for repos not in enrolled set", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1, run_id: "run-1", tool: "pushCode", args: {}, status: "pending",
          tool_use_id: "tui-1", created_at: "2026-01-01",
          agent_runs: { run_id: "run-1", repo_owner: "acme", repo_name: "api", goal: {} },
        },
        {
          id: 2, run_id: "run-2", tool: "pushCode", args: {}, status: "pending",
          tool_use_id: "tui-2", created_at: "2026-01-01",
          agent_runs: { run_id: "run-2", repo_owner: "other", repo_name: "repo", goal: {} },
        },
      ],
      error: null,
    })

    const result = await getAllPendingActionsWithContext("user123")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it("throws when getEnrolledRepos fails", async () => {
    mockEq.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })
    await expect(getAllPendingActionsWithContext("user123")).rejects.toThrow("DB error")
  })

  it("throws when pending actions query fails", async () => {
    mockEq.mockResolvedValueOnce({ data: [{ owner: "acme", repo: "api" }], error: null })
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: "actions error" } })
    await expect(getAllPendingActionsWithContext("user123")).rejects.toThrow("actions error")
  })
})

describe("getRepoConfigOverrides", () => {
  it("returns overrides when found", async () => {
    mockSingle.mockResolvedValueOnce({ data: { config_overrides: "repo rules" }, error: null })

    const result = await getRepoConfigOverrides("acme", "api")

    expect(mockFrom).toHaveBeenCalledWith("enrolled_repos")
    expect(mockEq).toHaveBeenCalledWith("owner", "acme")
    expect(mockEq).toHaveBeenCalledWith("repo", "api")
    expect(result).toBe("repo rules")
  })

  it("returns null when not found", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } })

    const result = await getRepoConfigOverrides("acme", "api")

    expect(result).toBeNull()
  })

  it("returns null when config_overrides is null", async () => {
    mockSingle.mockResolvedValueOnce({ data: { config_overrides: null }, error: null })

    const result = await getRepoConfigOverrides("acme", "api")

    expect(result).toBeNull()
  })

  it("throws on unexpected error", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB error" } })

    await expect(getRepoConfigOverrides("acme", "api")).rejects.toThrow("DB error")
  })
})

describe("updateRepoConfigOverrides", () => {
  it("updates with correct args including installedBy filter", async () => {
    mockEq.mockReturnValueOnce(chainMock)
    mockEq.mockReturnValueOnce(chainMock)
    mockSelect.mockResolvedValueOnce({ data: [{ id: 1 }], error: null })

    await updateRepoConfigOverrides("acme", "api", "repo rules", "alice")

    expect(mockFrom).toHaveBeenCalledWith("enrolled_repos")
    expect(mockUpdate).toHaveBeenCalledWith({ config_overrides: "repo rules" })
    expect(mockEq).toHaveBeenCalledWith("owner", "acme")
    expect(mockEq).toHaveBeenCalledWith("repo", "api")
    expect(mockEq).toHaveBeenCalledWith("installed_by", "alice")
  })

  it("throws when no matching repo found", async () => {
    mockEq.mockReturnValueOnce(chainMock)
    mockEq.mockReturnValueOnce(chainMock)
    mockSelect.mockResolvedValueOnce({ data: [], error: null })

    await expect(updateRepoConfigOverrides("acme", "api", "rules", "alice")).rejects.toThrow(
      "Repo not found or not enrolled by this user"
    )
  })

  it("throws on DB error", async () => {
    mockEq.mockReturnValueOnce(chainMock)
    mockEq.mockReturnValueOnce(chainMock)
    mockSelect.mockResolvedValueOnce({ data: null, error: { message: "update failed" } })

    await expect(updateRepoConfigOverrides("acme", "api", "rules", "alice")).rejects.toThrow("update failed")
  })
})
