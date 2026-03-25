import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/layout/top-bar";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agently.ai",
  description: "Agent Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <TopBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-zinc-900 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
