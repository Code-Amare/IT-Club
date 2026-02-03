import { createContext, useContext, useEffect, useState } from "react";
import api from "../Utils/api";

const NotifContext = createContext();

export function NotifProvider({ children }) {
    const [notificationPreview, setNotificationPreview] = useState([])
    const [notification, setNotification] = useState([])
    const [notifUnreadCount, setNotifUnreadCount] = useState(0)

    const getNotif = async () => {
        try {
            const res = await api.get("api/realtime/notif/")
            setNotification(res.data?.notif)
            setNotificationPreview(res.data?.notif_preview)
            setNotifUnreadCount(res.data?.unread_count)
            console.log(res.data)

        } catch (err) {
            console.log(err)
        }
    }
    useEffect(() => {
        getNotif()
    }, [])

    const incrementNotif = () => {
        setNotifUnreadCount((prevCount) => prevCount + 1);

    }
    const addNotifications = (newItems) => {
        setNotificationPreview((prev) => [...newItems, ...prev]);
        setNotification((prev) => [...newItems, ...prev])
    };


    return (
        <NotifContext.Provider value={{ notificationPreview, notifUnreadCount, notification, incrementNotif, addNotifications, setNotifUnreadCount, getNotif }}>
            {children}
        </NotifContext.Provider>
    );
}

export function useNotifContext() {
    const context = useContext(NotifContext);
    if (!context) {
        throw new Error("useNotifContext must be used inside MyProvider");
    }
    return context;
}
