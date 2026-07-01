import type { Metadata } from "next";
import "./globals.css";
import GlobalNav from "./components/GlobalNav";

export const metadata: Metadata = {
  title: "それ！できて当たり前？",
  description: "「できて当たり前」とされる行動・指示を、要素と必要な能力に分解し対応を提案するアプリ",
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
        <GlobalNav />
        {children}
      </body>
    </html>
  );
}
