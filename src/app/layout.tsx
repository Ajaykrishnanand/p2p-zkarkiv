import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phantom UPI — Censorship-Resistant ZK P2P UPI Orderbook on Arkiv DB-Chain",
  description:
    "Phantom UPI: Decentralized, zero-knowledge P2P UPI-to-Crypto orderbook on Arkiv DB-Chain (Tiramisu Testnet). Auto-expiring liquidity quotes, zero real PII stored on-chain, and zero-screenshot zkTLS notarized settlements.",
  keywords: ["Phantom UPI", "PhantomUPI", "Arkiv", "Tiramisu", "P2P", "UPI", "zkTLS", "Zero Knowledge", "Groth16", "Web3", "Ethereum"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="bg-[#FAF6F0] text-slate-900 antialiased selection:bg-[#EA3815]/20 selection:text-[#EA3815]">
        {children}
      </body>
    </html>
  );
}
