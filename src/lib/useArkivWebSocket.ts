"use client";

import { useState, useEffect, useRef } from "react";
import { wsPublicClient, ARKIV_WS_RPC } from "./arkivClient";

export interface ArkivWebSocketState {
  isConnected: boolean;
  latestBlock: string | null;
  lastBlockTime: string | null;
  wsUrl: string;
  error: string | null;
  messageCount: number;
}

/**
 * Hook to manage real-time WebSocket connection to Arkiv DB-Chain validator nodes.
 * Listens to on-chain blocks and entity lifecycle events.
 */
export function useArkivWebSocket(onBlockMined?: (blockNumber: bigint) => void): ArkivWebSocketState {
  const [state, setState] = useState<ArkivWebSocketState>({
    isConnected: false,
    latestBlock: null,
    lastBlockTime: null,
    wsUrl: ARKIV_WS_RPC,
    error: null,
    messageCount: 0,
  });

  const onBlockMinedRef = useRef(onBlockMined);
  onBlockMinedRef.current = onBlockMined;

  useEffect(() => {
    if (typeof window === "undefined" || !wsPublicClient) return;

    let unwatch: (() => void) | null = null;
    let isSubscribed = true;

    try {
      // Connect to WebSocket and subscribe to new blocks
      unwatch = (wsPublicClient as any).watchBlockNumber({
        onBlockNumber(blockNumber: bigint) {
          if (!isSubscribed) return;
          const blockStr = blockNumber.toString();
          const timeStr = new Date().toLocaleTimeString();

          setState((prev) => ({
            ...prev,
            isConnected: true,
            latestBlock: blockStr,
            lastBlockTime: timeStr,
            error: null,
            messageCount: prev.messageCount + 1,
          }));

          if (onBlockMinedRef.current) {
            onBlockMinedRef.current(blockNumber);
          }
        },
        onError(err: any) {
          if (!isSubscribed) return;
          console.warn("Arkiv WebSocket stream notice:", err);
          setState((prev) => ({
            ...prev,
            isConnected: false,
            error: err?.message || "WebSocket connection lost, reconnecting...",
          }));
        },
      });

      // Mark connected initially
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    } catch (err: any) {
      console.warn("Failed to initialize Arkiv WebSocket:", err);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: err?.message || "WebSocket subscription failed",
      }));
    }

    return () => {
      isSubscribed = false;
      if (unwatch) {
        try {
          unwatch();
        } catch (e) {
          // ignore cleanup error
        }
      }
    };
  }, []);

  return state;
}
