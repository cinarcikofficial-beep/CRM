import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionGuard from "./components/SessionGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verytech CRM",
  description: "Verytech Case Management & Knowledge Base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <SessionGuard />
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800">
          ©2026 - Designed By Kerim KAPLAN
        </footer>
      </body>
    </html>
  );
}