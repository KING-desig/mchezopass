import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MchezoPass | Kenya Gaming Community",
  description: "Find your squad, build your team, and compete with Kenya's gaming community.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
