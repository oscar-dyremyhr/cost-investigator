export type Role = "owner" | "member" | "viewer";
export type Member = { id: string; name: string; email: string; role: Role };

export const roleLabels: Record<Role, string> = { owner: "Owner", member: "Member", viewer: "Viewer" };
export const roleNotes: Record<Exclude<Role, "owner">, string> = {
  member: "Can change budgets, alerts and recommendations.",
  viewer: "Can read everything and open reports.",
};

/** The account owner in the sample company. */
export const owner: Member = { id: "owner", name: "Sam Rivera", email: "sam.rivera@northstar.example", role: "owner" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** "ana.lima@x.example" becomes "Ana Lima". */
export const nameFromEmail = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

/** Adds a teammate, or says in plain words why it cannot. */
export function invite(members: Member[], rawEmail: string, role: Exclude<Role, "owner">, seats: number): { members: Member[]; added: Member } | { error: string } {
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email)) return { error: "That doesn’t look like an email address." };
  if (members.some((m) => m.email.toLowerCase() === email)) return { error: "That person is already on your team." };
  if (members.length >= seats) return { error: "All your seats are taken. A larger plan has more." };
  const added: Member = { id: `member-${email}`, name: nameFromEmail(email) || email, email, role };
  return { members: [...members, added], added };
}

/** The owner can never be removed. */
export const remove = (members: Member[], id: string) => members.filter((m) => m.id !== id || m.role === "owner");
