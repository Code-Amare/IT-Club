import { useEffect, useRef } from "react";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import { useUser } from "../../Context/UserContext";

const WS_URL =
    window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
        ? import.meta.env.VITE_WS_URL
        : import.meta.env.VITE_WS_URL_MOBILE;

export default function Notification() {
    const { user, loading } = useUser();

    const wsRef = useRef(null);
    const retryTimeoutRef = useRef(null);
    const retryCountRef = useRef(0);

    const connect = () => {
        if (!user?.id || wsRef.current) return;

        const baseUrl = WS_URL.endsWith("/") ? WS_URL : `${WS_URL}/`;
        const url = `${baseUrl}ws/notification/`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            retryCountRef.current = 0; // reset retries
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            neonToast.info(data.message);
        };

        ws.onerror = () => {
            ws.close();
        };

        ws.onclose = () => {
            wsRef.current = null;

            if (!user?.id) return; // user logged out

            const delay = Math.min(
                1000 * 2 ** retryCountRef.current,
                30000 // max 30s
            );

            retryCountRef.current += 1;


            retryTimeoutRef.current = setTimeout(connect, delay);
        };
    };

    useEffect(() => {
        if (loading || !user?.id) return;

        connect();

        return () => {
            clearTimeout(retryTimeoutRef.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [user?.id, loading]);

    return null;
}
