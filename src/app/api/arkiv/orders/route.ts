import { NextResponse } from "next/server";
import { queryOpenInrOrders } from "@/lib/arkivOrderbook";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const orders = await queryOpenInrOrders();
    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("API /api/arkiv/orders error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to query orders", orders: [] },
      { status: 500 }
    );
  }
}
