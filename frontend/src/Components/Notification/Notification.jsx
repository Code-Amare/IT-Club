    import { useEffect } from "react";
    import { neonToast } from "../../Components/NeonToast/NeonToast";

    const WS_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? import.meta.env.VITE_WS_URL
        : import.meta.env.VITE_WS_URL_MOBILE;

    export default function Notification() {
        useEffect(() => {
            const baseUrl = WS_URL.endsWith('/') ? WS_URL : `${WS_URL}/`;
            const url = `${baseUrl}ws/notification/`;
            const ws = new WebSocket(url);

            ws.onopen = () => console.log("Connected:", url);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                neonToast.info(data.message);

                if (data?.is_push_notif && "Notification" in window) {
                    if (window.Notification.permission === "granted") {
                        new window.Notification("MegaLearn", { body: data.message });
                    } else if (window.Notification.permission !== "denied") {
                        window.Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                                new window.Notification("MegaLearn", { body: data.message });
                            }
                        });
                    }
                }
            };

            return () => ws.close();
        }, []);

        return null;
    }