import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDecryptToken = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/crypto", () => ({
  decryptToken: mockDecryptToken,
  encryptToken: vi.fn(),
  timingSafeCompare: vi.fn(),
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

import { getUserToken } from "../../src/lib/userToken";

const SUPABASE_URL = "https://test.supabase.co";
const SUPABASE_KEY = "svc-key";
const ENC_KEY = "a".repeat(64);

function makeResponse(data: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserToken", () => {
  it("returns decrypted token when enrolled_repo and user_token found", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse([{ installed_by: "octocat" }]))
      .mockResolvedValueOnce(makeResponse([{ encrypted_token: "enc", iv: "iv123" }]));
    mockDecryptToken.mockResolvedValue("ghp_secret");

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBe("ghp_secret");
    expect(mockDecryptToken).toHaveBeenCalledWith("enc", "iv123", ENC_KEY);
  });

  it("returns null when enrolled_repo not found", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when user_token not found", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse([{ installed_by: "octocat" }]))
      .mockResolvedValueOnce(makeResponse([]));

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBeNull();
  });

  it("returns null when decryption fails and logs error", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse([{ installed_by: "octocat" }]))
      .mockResolvedValueOnce(makeResponse([{ encrypted_token: "enc", iv: "iv123" }]));
    mockDecryptToken.mockRejectedValue(new Error("bad key"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns null when enrolled_repos fetch fails", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("error", false));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBeNull();
    errorSpy.mockRestore();
  });

  it("queries enrolled_repos with correct owner and repo filters", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    await getUserToken("myorg", "myrepo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("myorg");
    expect(url).toContain("myrepo");
  });

  it("URL-encodes special characters in owner and repo", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse([]));

    await getUserToken("org/special", "repo name", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("org%2Fspecial");
    expect(url).toContain("repo%20name");
  });

  it("fetches only needed columns from enrolled_repos and user_tokens", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse([{ installed_by: "octocat" }]))
      .mockResolvedValueOnce(makeResponse([{ encrypted_token: "enc", iv: "iv123" }]));
    mockDecryptToken.mockResolvedValue("ghp_secret");

    await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    const enrolledUrl = mockFetch.mock.calls[0][0] as string;
    const tokenUrl = mockFetch.mock.calls[1][0] as string;
    expect(enrolledUrl).toContain("select=installed_by");
    expect(tokenUrl).toContain("select=encrypted_token,iv");
  });

  it("returns null when decrypted token is empty string", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse([{ installed_by: "octocat" }]))
      .mockResolvedValueOnce(makeResponse([{ encrypted_token: "enc", iv: "iv123" }]));
    mockDecryptToken.mockResolvedValue("");

    const result = await getUserToken("acme", "repo", SUPABASE_URL, SUPABASE_KEY, ENC_KEY);

    expect(result).toBeNull();
  });
});
