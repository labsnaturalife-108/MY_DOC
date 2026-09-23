import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MY_DOC — Личный медицинский AI-ассистент",
  description: "Интеллектуальная система ведения пациентов, анализа исследований и мультимодельный медицинский чат",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="min-h-screen flex flex-col font-sans bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
