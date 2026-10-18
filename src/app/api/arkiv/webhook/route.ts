import { NextResponse } from "next/server";

// In-memory ring buffer for recent Arkiv webhook events (last 50 events)
const recentWebhookEvents: Array<{
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  source: string;
}> = [];

/**
 * GET /api/arkiv/webhook
 * Returns the status of the Arkiv webhook receiver and the list of recent webhook events.
 */
export async function GET() {
  return NextResponse.json({
    status: "active",
    protocol: "Arkiv-Webhooks/v1",
    chain: "Arkiv Tiramisu (7738577)",
    wsEndpoint: "wss://rpc.tiramisu.db-chain.testnet.arkiv.network",
    totalEventsReceived: recentWebhookEvents.length,
    recentEvents: recentWebhookEvents.slice(0, 10),
  });
}

/**
 * POST /api/arkiv/webhook
 * Ingests real-time webhook payloads from Arkiv validators, relayers, or client simulators.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventType = body?.event || body?.type || "TX_NOTIFICATION";
    
    const eventRecord = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: eventType,
      payload: body,
      timestamp: new Date().toISOString(),
      source: request.headers.get("x-arkiv-source") || "arkiv-relayer",
    };

    recentWebhookEvents.unshift(eventRecord);
    if (recentWebhookEvents.length > 50) {
      recentWebhookEvents.pop();
    }

    return NextResponse.json({
      received: true,
      eventId: eventRecord.id,
      timestamp: eventRecord.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to parse webhook body" },
      { status: 400 }
    );
  }
}
