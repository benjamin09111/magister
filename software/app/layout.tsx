import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "6TiSCH Multi-Objective Simulator | NG-RES Routing Platform",
  description: "Interactive web simulation platform for 6TiSCH TSCH multi-objective scheduling and routing algorithms, including Minimal Overlap (MO) and Ant Colony Optimization (MO+ACO).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-darkbg text-slate-200 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
