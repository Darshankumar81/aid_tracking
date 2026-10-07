import { useEffect, useRef } from "react";

const RECONNECT_DELAY_MS = 3000;

/** Connect to a WebSocket URL, parse JSON messages, and reconnect on disconnect. */
export function useWebSocket(url, onMessage) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url) return undefined;

    let stopped = false;
    let reconnectTimer;
    let socket;

    const connect = () => {
      if (stopped) return;

      try {
        socket = new WebSocket(url);
      } catch (error) {
        console.error("Unable to create WebSocket connection:", error);
        scheduleReconnect();
        return;
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error("Unable to parse WebSocket JSON message:", error);
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket connection error:", event);
      };

      socket.onclose = () => {
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (!stopped && reconnectTimer === undefined) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined;
          connect();
        }, RECONNECT_DELAY_MS);
      }
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      // Prevent the intentional close from triggering a new reconnect attempt.
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [url]);
}

export default useWebSocket;
