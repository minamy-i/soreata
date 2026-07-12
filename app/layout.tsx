import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GlobalNav from "./components/GlobalNav";
import Footer from "./components/Footer";
import { ActiveTeamProvider } from "@/lib/use-active-team";

export const metadata: Metadata = {
  title: "それ！できて当たり前？",
  description: "困りごとに必要な力と、対応のヒントを提案します。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Suspense>
          <ActiveTeamProvider>
            <GlobalNav />
            {children}
          </ActiveTeamProvider>
        </Suspense>
        <Footer />
      </body>
    </html>
  );
}
