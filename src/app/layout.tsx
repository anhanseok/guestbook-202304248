import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "방명록",
  description: "이름과 메시지를 남기는 미니 방명록",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fdf8f0] text-stone-900">{children}</body>
    </html>
  );
}
