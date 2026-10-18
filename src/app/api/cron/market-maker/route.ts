import { NextResponse } from "next/server";
import { queryOpenInrOrders, createP2POrder } from "@/lib/arkivOrderbook";
import { getBurnerWalletClient } from "@/lib/arkivClient";
import { generateSyntheticUpi } from "@/lib/syntheticGuard";

/**
 * Vercel Cron & Keeper Endpoint
 *
 * Can be triggered automatically by Vercel Cron or on-demand to maintain
 * active on-chain liquidity on the Arkiv Tiramisu DB-Chain.
 */
export async function GET(request: Request) {
  try {
    // 1. Query existing on-chain orders from Tiramisu
    const existingOrders = await queryOpenInrOrders();
    const openOrders = existingOrders.filter((o) => o.attributes?.status === "OPEN");

    // 2. Check if automated server keeper key is provided in environment variables
    const keeperKey = (process.env.KEEPER_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}`;

    if (!keeperKey) {
      return NextResponse.json({
        success: true,
        message: "On-chain query successful. Server keeper is in decentralized client-signer mode.",
        activeOnChainOrders: openOrders.length,
        note: "To enable automated server-side liquidity posting, add KEEPER_PRIVATE_KEY in Vercel environment variables.",
      });
    }

    // 3. If keeper key exists and liquidity is low (< 3 open orders), post a quote on Arkiv
    let createdTx = null;
    if (openOrders.length < 3) {
      const { account, client } = getBurnerWalletClient(keeperKey);
      const orderId = `KEEPER-${Math.floor(10000 + Math.random() * 90000)}`;

      createdTx = await createP2POrder(client, {
        orderId,
        makerAddress: account.address,
        amountInr: 5000,
        usdcAmount: "57.14",
        rateInrPerUsdc: 87.5,
        syntheticUpiAlias: generateSyntheticUpi("keeper", "okhdfc"),
        ttlMinutes: 60,
      });
    }

    return NextResponse.json({
      success: true,
      activeOnChainOrders: openOrders.length,
      autoReplenished: !!createdTx,
      createdEntityKey: createdTx?.key || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Cron keeper error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to execute keeper query",
      },
      { status: 500 }
    );
  }
}
