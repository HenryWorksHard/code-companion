import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Companion ✨ Build Apps with AI Magic",
  description: "Meet Kui-chan, your cute AI coding companion! Describe your app idea and watch it come to life~ Build and deploy web apps from simple conversations.",
  keywords: ["AI", "code generation", "web apps", "no-code", "Vercel", "cute", "kawaii"],
  authors: [{ name: "Code Companion" }],
  openGraph: {
    title: "Code Companion ✨ Build Apps with AI Magic",
    description: "Meet Kui-chan, your cute AI coding companion! Describe your app idea and watch it come to life~",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Quicksand:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        {/* Cubism 4 Core SDK - required for Live2D Cubism 4 models */}
        <Script
          src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
