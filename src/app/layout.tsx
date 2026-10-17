import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "zkUPI-Arkiv — Censorship-Resistant ZK P2P UPI Orderbook on Arkiv DB-Chain",
  description:
    "Decentralized, zero-knowledge P2P UPI-to-Crypto orderbook on Arkiv (Tiramisu Testnet). Auto-expiring liquidity quotes, zero real PII stored on-chain, and zero-screenshot zkTLS notarized settlements.",
  keywords: ["Arkiv", "Tiramisu", "P2P", "UPI", "zkTLS", "Zero Knowledge", "Groth16", "Web3", "Ethereum"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
