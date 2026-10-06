import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridline Daily",
  description: "A once-a-day Formula racing higher or lower challenge.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
