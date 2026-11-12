import { cn } from "@/lib/utils";

export type PennyMood = "happy" | "curious" | "party" | "sleepy";

/**
 * Penny: a coin with two dot eyes. Appears in empty states, onboarding and
 * success moments. Never in the cost report itself.
 */
export function Penny({
  mood = "happy",
  size = 96,
  className,
  title,
}: {
  mood?: PennyMood;
  size?: number;
  className?: string;
  title?: string;
}) {
  const eyeY = mood === "curious" ? 50 : 52;
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={(size * 120) / 100}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* soft ground shadow */}
      <ellipse cx="50" cy="111" rx="26" ry="4" fill="var(--line)" />
      {/* coin body with a milled inner ring */}
      <circle cx="50" cy="60" r="42" fill="var(--sun)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="50" cy="60" r="33" fill="none" stroke="var(--on-accent)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      {/* eyes */}
      {mood === "sleepy" ? (
        <path d="M32 52 q5 4 10 0 M58 52 q5 4 10 0" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="37" cy={eyeY} r="4.5" fill="var(--on-accent)" />
          <circle cx="63" cy={eyeY} r="4.5" fill="var(--on-accent)" />
          <circle cx="38.5" cy={eyeY - 1.5} r="1.3" fill="var(--sun)" />
          <circle cx="64.5" cy={eyeY - 1.5} r="1.3" fill="var(--sun)" />
        </>
      )}
      {/* cheeks and mouth */}
      <circle cx="28" cy="63" r="3.5" fill="var(--status-fix)" fillOpacity="0.55" />
      <circle cx="72" cy="63" r="3.5" fill="var(--status-fix)" fillOpacity="0.55" />
      {mood === "party" ? (
        <path d="M43 62 q7 10 14 0 z" fill="var(--on-accent)" />
      ) : mood === "curious" ? (
        <circle cx="50" cy="66" r="3" fill="var(--on-accent)" />
      ) : (
        <path d="M43 64 q7 6 14 0" fill="none" stroke="var(--on-accent)" strokeWidth="3" strokeLinecap="round" />
      )}
      {/* curious Penny investigates with a magnifying glass */}
      {mood === "curious" ? (
        <g>
          <circle cx="80" cy="84" r="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
          <path d="M87 91 l8 9" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : null}
      {mood === "party" ? (
        <path d="M50 16 l-9 -9 M50 16 l0 -11 M50 16 l9 -9" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}
