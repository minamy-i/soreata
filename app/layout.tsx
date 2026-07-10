import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GlobalNav from "./components/GlobalNav";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "それ！できて当たり前？",
  description: "行動を前提能力に分解し、対応のヒントを提案します。",
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
          <GlobalNav />
        </Suspense>
        {children}
        <Footer />
      </body>
    </html>
  );
}
