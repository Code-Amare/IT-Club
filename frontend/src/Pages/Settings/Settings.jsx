import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import api from "../../Utils/api";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import AsyncButton from "../../Components/AsyncButton/AsyncButton";
import styles from "./Settings.module.css";
import SideBar from "../../Components/SideBar/SideBar";
import {
    FaBell,
    FaSave,
    FaTimes,
    FaCheck,
    FaExclamationTriangle,
    FaSearch,
    FaClock,
    FaCog,
} from "react-icons/fa";
import {
    MdNotifications,
    MdNotificationsOff,
    MdErrorOutline,
    MdInfoOutline
} from "react-icons/md";

export default function Settings() {
    const { user, getUser } = useUser();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [browserPermission, setBrowserPermission] = useState(
        "Notification" in window ? Notification.permission : "unsupported"
    );

    // Initialize permission state
    useEffect(() => {
        if (user.isAuthenticated === null) return;

        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }

        // Update permission state
        if ("Notification" in window) {
            setBrowserPermission(Notification.permission);
        }
    }, [user, navigate]);

    // Handle master notification toggle
    const handleNotifToggle = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post("/api/users/notif/");

            // Refresh user data from context
            await getUser();

            const newState = response.data?.notif_enabled;
            const action = newState ? "enabled" : "disabled";
            const message = response.data?.message

            if (response.data?.notif_enabled) {
                neonToast.success(message)
            }
            else {
                neonToast.warning(message)
            }

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to update notifications";
            setError(errorMessage);
            neonToast.error(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle push notification toggle
    const handlePushToggle = async () => {
        setIsLoading(true);
        setError(null);

        // Can't enable push if master notifications are disabled
        if (!user.notifEnabled) {
            setError("Enable notifications first to use push notifications");
            setIsLoading(false);
            return;
        }

        // If trying to enable push notifications
        if (!user.pushNotifEnabled) {
            // Check if browser permission is already granted
            if (browserPermission === "granted") {
                // Permission is granted, we can enable push notifications
                await togglePushSetting();
            } else if (browserPermission === "default") {
                // Request permission first
                const granted = await requestBrowserPermission();
                if (granted) {
                    await togglePushSetting();
                } else {
                    setIsLoading(false);
                }
            } else if (browserPermission === "denied") {
                setError("Notifications are blocked. Please enable them in your browser settings.");
                neonToast.error("Browser notifications are blocked. Enable them in browser settings.", "error");
                setIsLoading(false);
            }
        } else {
            // Disabling push notifications
            await togglePushSetting();
        }
    };

    const togglePushSetting = async () => {
        try {
            const response = await api.post("/api/users/push-notif/");

            // Refresh user data from context
            await getUser();

            const newState = response.data?.push_notif_enabled;
            const message = response.data?.message

            if (response.data?.push_notif_enabled) {
                neonToast.success(message)
            }
            else {
                neonToast.warning(message)
            }

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to update push notifications";
            setError(errorMessage);
            neonToast.error(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const requestBrowserPermission = async () => {
        if (!("Notification" in window)) {
            setError("Your browser does not support notifications");
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setBrowserPermission(permission);

            if (permission === "granted") {
                setSuccess("Browser notifications enabled!");
                return true;
            } else if (permission === "denied") {
                setError("Notifications have been blocked. Please enable them in your browser settings.");
                return false;
            }
            return false;

        } catch (err) {
            console.error("Error requesting notification permission:", err);
            setError("Failed to request notification permission");
            return false;
        }
    };

    const checkNotificationStatus = () => {
        const status = `
Notification Status:
• Notifications: ${user.notifEnabled ? "Enabled" : "Disabled"}
• Push Notifications: ${user.pushNotifEnabled ? "Enabled" : "Disabled"}
• Browser Permission: ${browserPermission}
• Browser Support: ${"Notification" in window ? "Yes" : "No"}
• Page Active: ${document.hidden ? "Background" : "Foreground"}
        `.trim();
        alert(status);
    };

    const handleTestPushNotification = () => {
        if (!user.pushNotifEnabled) {
            setError("Push notifications are not enabled");
            return;
        }

        if (browserPermission !== "granted") {
            if (browserPermission === "default") {
                requestBrowserPermission();
            } else {
                setError("Please enable browser notifications first");
            }
            return;
        }

        if (!("Notification" in window)) {
            setError("Your browser does not support notifications");
            return;
        }

        try {
            const notification = new Notification("Test Notification", {
                body: "This is a test push notification from our app.",
                icon: '/favicon.ico',
                tag: `test-${Date.now()}`,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
            setSuccess("Test notification sent!");

        } catch (err) {
            console.error("Error creating test notification:", err);
            setError("Failed to send test notification");
        }
    };

    // Sync push notifications with permission when permission changes
    useEffect(() => {
        // If permission is not granted, push notifications should be false
        if (browserPermission !== "granted" && user.pushNotifEnabled) {
            // If push is enabled but permission is not granted, disable it
            // This handles the case where permission was revoked or denied
            // We'll disable it on the backend
            if (user.isAuthenticated) {
                api.post("/api/users/push-notif/").then(() => {
                    getUser();
                }).catch(console.error);
            }
        }
    }, [browserPermission, user.pushNotifEnabled, user.isAuthenticated, getUser]);

    if (user.isAuthenticated === null) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaCog className={styles.titleIcon} />
                            <div>
                                <h1>Notification Settings</h1>
                                <p>Manage your notification preferences</p>
                            </div>
                        </div>
                        <div className={styles.actionButtons}>
                            <AsyncButton
                                onClick={() => {
                                    getUser();
                                    setSuccess("Settings refreshed");
                                }}
                                loading={isLoading}
                                disabled={isLoading}
                                className={styles.resetBtn}
                            >
                                <FaTimes />
                                <span>Refresh</span>
                            </AsyncButton>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className={styles.errorBanner}>
                        <MdErrorOutline />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className={styles.successBanner}>
                        <FaCheck />
                        <span>{success}</span>
                    </div>
                )}

                {/* Settings Grid */}
                <div className={styles.settingsGrid}>
                    {/* Master Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon}>
                                {user.notifEnabled ? <MdNotifications /> : <MdNotificationsOff />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Notifications</h3>
                                <p>Enable or disable all notifications from the system</p>
                                <div className={styles.currentStatus}>
                                    Current status:
                                    <span className={user.notifEnabled ? styles.statusEnabled : styles.statusDisabled}>
                                        {user.notifEnabled ? "Enabled" : "Disabled"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <AsyncButton
                                onClick={handleNotifToggle}
                                loading={isLoading}
                                disabled={isLoading}
                                className={`${styles.toggleBtn} ${user.notifEnabled ? styles.toggleBtnEnabled : styles.toggleBtnDisabled}`}
                            >
                                {user.notifEnabled ? "Disable" : "Enable"}
                            </AsyncButton>
                        </div>
                    </div>

                    {/* Push Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon}>
                                {user.pushNotifEnabled ? <FaBell /> : <FaBell style={{ opacity: 0.5 }} />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Push Notifications</h3>
                                <p>Show browser popup notifications when enabled</p>
                                {/* ADDED BACK: Permission status label */}
                                <div className={styles.permissionStatus}>
                                    {browserPermission === "granted" && (
                                        <span className={styles.statusGranted}>
                                            <FaCheck /> Browser permission granted
                                        </span>
                                    )}
                                    {browserPermission === "denied" && (
                                        <span className={styles.statusDenied}>
                                            <FaTimes /> Browser permission denied
                                        </span>
                                    )}
                                    {browserPermission === "default" && (
                                        <span className={styles.statusDefault}>
                                            <FaClock /> Click to grant browser permission
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <AsyncButton
                                onClick={handlePushToggle}
                                loading={isLoading}
                                disabled={isLoading || !user.notifEnabled || browserPermission === "denied" || browserPermission === "unsupported"}
                                className={`${styles.toggleBtn} ${user.pushNotifEnabled ? styles.toggleBtnEnabled : styles.toggleBtnDisabled}`}
                            >
                                {user.pushNotifEnabled ? "Disable" : "Enable"}
                            </AsyncButton>
                        </div>
                    </div>
                </div>

                {/* Test Section */}
                <div className={styles.testSection}>
                    <div className={styles.testButtons}>
                        <AsyncButton
                            onClick={handleTestPushNotification}
                            loading={false}
                            disabled={!user.pushNotifEnabled || browserPermission !== "granted"}
                            className={styles.testBtn}
                        >
                            <FaBell />
                            <span>Test Push Notification</span>
                        </AsyncButton>

                        <button
                            className={styles.debugBtn}
                            onClick={checkNotificationStatus}
                        >
                            <FaSearch />
                            <span>Check Status</span>
                        </button>

                        {browserPermission === "default" && user.notifEnabled && (
                            <button
                                className={styles.enableBtn}
                                onClick={requestBrowserPermission}
                            >
                                <MdNotifications />
                                <span>Enable Browser Notifications</span>
                            </button>
                        )}
                    </div>

                    {/* Status */}
                    <div className={styles.statusCard}>
                        <div className={styles.statusRow}>
                            <span className={styles.statusLabel}>Browser Status:</span>
                            <span className={`
                                ${styles.statusValue}
                                ${browserPermission === "granted" ? styles.active : ''}
                                ${browserPermission === "denied" ? styles.blocked : ''}
                                ${browserPermission === "default" ? styles.pending : ''}
                            `}>
                                {browserPermission === "granted" && <><FaCheck /> Ready</>}
                                {browserPermission === "denied" && <><FaTimes /> Blocked</>}
                                {browserPermission === "default" && <><FaClock /> Pending</>}
                                {browserPermission === "unsupported" && <><FaTimes /> Unsupported</>}
                            </span>
                        </div>
                        <div className={styles.statusRow}>
                            <span className={styles.statusLabel}>Notifications:</span>
                            <span className={user.notifEnabled ? styles.active : styles.inactive}>
                                {user.notifEnabled ? <><FaCheck /> Enabled</> : <><FaTimes /> Disabled</>}
                            </span>
                        </div>
                        <div className={styles.statusRow}>
                            <span className={styles.statusLabel}>Push Notifications:</span>
                            <span className={user.pushNotifEnabled ? styles.active : styles.inactive}>
                                {user.pushNotifEnabled ? <><FaCheck /> Enabled</> : <><FaTimes /> Disabled</>}
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className={styles.infoCard}>
                        <MdInfoOutline />
                        <div className={styles.infoContent}>
                            <h4>How notifications work:</h4>
                            <ul>
                                <li><strong>Notifications</strong>: Master switch for all system notifications</li>
                                <li><strong>Push Notifications</strong>: Browser popup notifications (requires browser permission)</li>
                                <li>Push notifications only work when the main notifications are enabled</li>
                                <li>If you disable notifications, push notifications will be automatically disabled</li>
                                <li>You can manage browser permissions in your browser settings</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
}