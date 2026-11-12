import { describe, expect, it } from "vitest";
import { invite, nameFromEmail, owner, remove } from "@/lib/team";
import { resetDemo, useAlertRules, useDiscounts, useRecommendations, useTeam } from "@/store/app";

describe("team", () => {
  it("adds a teammate with a readable name", () => {
    const result = invite([owner], " Ana.Lima@Northstar.example ", "member", 10);
    expect("added" in result && result.added).toMatchObject({ name: "Ana Lima", email: "ana.lima@northstar.example", role: "member" });
    expect(nameFromEmail("j_okafor-smith@x.example")).toBe("J Okafor Smith");
  });
  it("explains why an invite is refused", () => {
    expect(invite([owner], "not-an-email", "member", 10)).toEqual({ error: "That doesn’t look like an email address." });
    expect(invite([owner], owner.email.toUpperCase(), "viewer", 10)).toEqual({ error: "That person is already on your team." });
    expect(invite([owner], "a@b.example", "viewer", 1)).toEqual({ error: "All your seats are taken. A larger plan has more." });
  });
  it("never removes the owner", () => {
    const team = [owner, { id: "m1", name: "A", email: "a@b.example", role: "member" as const }];
    expect(remove(team, "m1")).toEqual([owner]);
    expect(remove(team, "owner")).toEqual(team);
  });
});

describe("reset demo", () => {
  it("clears saved choices but keeps the theme", () => {
    const store = new Map<string, string>();
    const local = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    // Object.keys(localStorage) must list the keys, as it does in a browser.
    const proxy = new Proxy(local, { ownKeys: () => [...store.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
    Object.defineProperty(globalThis, "window", { value: { localStorage: proxy }, configurable: true });
    store.set("cost-investigator-theme", "dark");
    store.set("cost-investigator-budget-v1", "{}");
    store.set("cost-investigator-reports-v1", "[]");
    store.set("someone-elses-key", "1");
    useRecommendations.setState({ statuses: { a: "done" } });
    useAlertRules.setState({ overrides: { b: { enabled: false } } });
    useTeam.setState({ invited: [{ id: "m", name: "M", email: "m@x.example", role: "viewer" }] });
    useDiscounts.setState({ discounts: { overallPercent: 12, byProduct: {} } });
    resetDemo();
    expect(useDiscounts.getState().discounts).toEqual({ overallPercent: 0, byProduct: {} });
    expect([...store.keys()].sort()).toEqual(["cost-investigator-theme", "someone-elses-key"]);
    expect(useRecommendations.getState().statuses).toEqual({});
    expect(useAlertRules.getState().overrides).toEqual({});
    expect(useTeam.getState().invited).toEqual([]);
  });
});
