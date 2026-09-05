import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Documentation — Feloop",
  description: "Complete documentation for capturing AI executions, connecting outcomes, detecting patterns, evaluating improvements, and operating governed self-improvement loops.",
};

export default function DocsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
