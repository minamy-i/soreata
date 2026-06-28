import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "それ！できて当たり前？",
  description: "「できて当たり前」とされる行動・指示を、要素と必要な能力に分解し対策を提案するアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
