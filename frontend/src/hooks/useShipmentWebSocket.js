import { useEffect } from "react";

export function useShipmentWebSocket(onEventReceived) {
  useEffect(() => {
    const ws = new WebSocket("wss://aid-tracking.onrender.com/ws/shipments");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event) {
          // Trigger optional toast library (e.g., react-toastify or sonner)
          console.log("Real-time alert:", data);
          if (onEventReceived) onEventReceived(data);
        }
      } catch (err) {
        // Echo text fallback
      }
    };

    return () => ws.close();
  }, [onEventReceived]);
}