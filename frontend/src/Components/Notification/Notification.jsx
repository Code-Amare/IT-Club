import { useEffect } from "react";
import { neonToast } from "../../Components/NeonToast/NeonToast"

export default function Notification() {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '');

    useEffect(() => {
        const url = `wss://${API_BASE_URL}ws/notification/`
        const ws = new WebSocket(url);

        ws.onopen = () => console.log("Connected to notification WebSocket");
        ws.onclose = () => console.log("Disconnected from notification WebSocket");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            neonToast.info(data.message);
            console.log(data)
            if (data?.is_push_notif) {
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

}
