import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Companion - Build Apps with AI",
  description: "Describe your app idea, and watch it come to life. Code Companion builds and deploys web apps from simple conversations.",
  keywords: ["AI", "code generation", "web apps", "no-code", "Vercel"],
  authors: [{ name: "Code Companion" }],
  openGraph: {
    title: "Code Companion - Build Apps with AI",
    description: "Describe your app idea, and watch it come to life.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-950 text-white">
        {children}
      </body>
    </html>
  );
}
