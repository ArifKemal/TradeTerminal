import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeTerminal — VectorBT Financial Analysis",
  description: "Professional backtesting and technical analysis platform powered by VectorBT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
