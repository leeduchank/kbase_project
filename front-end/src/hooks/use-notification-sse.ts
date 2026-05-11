import { useEffect, useRef, useCallback, useState } from "react";
import { API_BASE, TOKEN_KEY } from "@/lib/api/client";

interface NotificationEvent {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

interface UnreadCountEvent {
  unreadCount: number;
}

interface UseNotificationSSEOptions {
  onNotification?: (notification: NotificationEvent) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onConnected?: () => void;
  onError?: () => void;
}

/**
 * Hook that establishes a Server-Sent Events (SSE) connection
 * for real-time notification delivery.
 * 
 * Automatically reconnects on disconnect with exponential backoff.
 */
export function useNotificationSSE(options: UseNotificationSSEOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const MAX_RECONNECT_DELAY = 30000; // 30 seconds max
  const BASE_RECONNECT_DELAY = 1000; // 1 second base

  const connect = useCallback(() => {
    // Get token from localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token || token === "null" || token === "undefined") {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // EventSource doesn't support custom headers, so we pass the token as a query parameter.
    // The backend SSE endpoint accepts ?token= for authentication.
    const sseUrl = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0; // Reset on successful connection
      options.onConnected?.();
    });

    eventSource.addEventListener("notification", (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);
        options.onNotification?.(data);
      } catch (e) {
        console.error("[SSE] Failed to parse notification event:", e);
      }
    });

    eventSource.addEventListener("unread-count", (event) => {
      try {
        const data: UnreadCountEvent = JSON.parse(event.data);
        options.onUnreadCountUpdate?.(data.unreadCount);
      } catch (e) {
        console.error("[SSE] Failed to parse unread-count event:", e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
      options.onError?.();

      // Exponential backoff reconnect
      const delay = Math.min(
        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY
      );
      reconnectAttemptRef.current += 1;

      console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})...`);
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [options.onNotification, options.onUnreadCountUpdate, options.onConnected, options.onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, reconnect: connect, disconnect };
}
