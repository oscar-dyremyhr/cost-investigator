import type { ReactNode } from "react";
import AppShell from "@/screens/app/AppShell";

export default function Layout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
