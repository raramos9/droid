import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadRepoConfig } from "../../src/agent/config";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const SUPABASE_URL = "https://test.supabase.co";
const SUPABASE_KEY = "svc-key";

function mockFetchOnce(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadRepoConfig", () => {
  it("returns empty strings when repo is not enrolled", async () => {
    mockFetchOnce([]); // enrolled_repos returns no rows

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result).toEqual({ userConfig: "", repoOverrides: "" });
  });

  it("returns empty strings when repo has no config_overrides or installed_by", async () => {
    mockFetchOnce([{ installed_by: null, config_overrides: null }]);
    // no second fetch needed (installed_by is null)

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result).toEqual({ userConfig: "", repoOverrides: "" });
  });

  it("fetches user config when installed_by is set", async () => {
    mockFetchOnce([{ installed_by: "alice", config_overrides: null }]);
    mockFetchOnce([{ config_text: "my rules" }]);

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result.userConfig).toBe("my rules");
    expect(result.repoOverrides).toBe("");
  });

  it("returns repo overrides when set", async () => {
    mockFetchOnce([{ installed_by: "alice", config_overrides: "repo rules" }]);
    mockFetchOnce([{ config_text: "global rules" }]);

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result.repoOverrides).toBe("repo rules");
  });

  it("returns both userConfig and repoOverrides when both are set", async () => {
    mockFetchOnce([{ installed_by: "alice", config_overrides: "repo rules" }]);
    mockFetchOnce([{ config_text: "global rules" }]);

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result).toEqual({ userConfig: "global rules", repoOverrides: "repo rules" });
  });

  it("returns empty userConfig when user_configs has no row for installed_by", async () => {
    mockFetchOnce([{ installed_by: "alice", config_overrides: null }]);
    mockFetchOnce([]); // no user_configs row

    const result = await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(result.userConfig).toBe("");
  });

  it("queries enrolled_repos with owner and repo", async () => {
    mockFetchOnce([]);

    await loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("owner=eq.acme"),
      expect.anything()
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("repo=eq.api"),
      expect.anything()
    );
  });

  it("throws when enrolled_repos fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("DB error"),
    });

    await expect(loadRepoConfig("acme", "api", SUPABASE_URL, SUPABASE_KEY)).rejects.toThrow();
  });
});
