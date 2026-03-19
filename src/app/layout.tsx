import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculator",
  description: "A clean, keyboard-friendly calculator built with Next.js and Tailwind CSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black antialiased">{children}</body>
    </html>
  );
}
