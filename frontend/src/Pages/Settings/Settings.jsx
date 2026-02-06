import React, { useState, useEffect, useCallback } from "react";
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
    FaAndroid,
    FaClock,
    FaCog,
    FaRegBell,
    FaRegBellSlash
} from "react-icons/fa";
import {
    MdNotifications,
    MdNotificationsOff,
    MdEmail,
    MdErrorOutline,
    MdInfoOutline
} from "react-icons/md";

export default function Settings() {
    const { user, refreshUser } = useUser();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        emailNotifications: false,
        pushNotifications: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [browserPermission, setBrowserPermission] = useState(
        "Notification" in window ? Notification.permission : "unsupported"
    );

    // Initialize from API
    useEffect(() => {
        if (user.isAuthenticated === null) return;

        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }

        // Fetch current notification settings from API
        fetchNotificationSettings();

        // Update permission state
        if ("Notification" in window) {
            setBrowserPermission(Notification.permission);
        }
    }, [user, navigate]);

    const fetchNotificationSettings = async () => {
        try {
            // Fetch email notifications
            const notifRes = await api.get("/api/users/notif/");
            const emailEnabled = notifRes.data?.notif_enabled || false;

            // Fetch push notifications
            const pushRes = await api.get("/api/users/push-notif/");
            const pushEnabled = pushRes.data?.push_notif_enabled || false;

            setForm({
                emailNotifications: emailEnabled,
                pushNotifications: pushEnabled,
            });
        } catch (err) {
            console.error("Error fetching notification settings:", err);
            // Fallback to user context
            setForm({
                emailNotifications: user.notifEnabled || false,
                pushNotifications: user.pushNotifEnabled || false,
            });
        }
    };

    // Handle push notification toggle with permission logic
    const handlePushToggle = async () => {
        const newValue = !form.pushNotifications;

        // If trying to enable push notifications
        if (newValue) {
            // Check if browser permission is already granted
            if (browserPermission === "granted") {
                // Permission is granted, we can enable push notifications
                await updatePushSetting(true);
            } else if (browserPermission === "default") {
                // Request permission first
                const granted = await requestBrowserPermission();
                if (granted) {
                    await updatePushSetting(true);
                }
            } else if (browserPermission === "denied") {
                setError("Notifications are blocked. Please enable them in your browser settings.");
                neonToast.error("Browser notifications are blocked. Enable them in browser settings.", "error");
            }
        } else {
            // Disabling push notifications
            await updatePushSetting(false);
        }
    };

    const updatePushSetting = async (value) => {
        try {
            await api.patch("/api/users/push-notif/", {
                push_notif_enabled: value
            });

            setForm(prev => ({ ...prev, pushNotifications: value }));

            if (refreshUser) {
                await refreshUser();
            }

            const action = value ? "enabled" : "disabled";
            neonToast.success(`Push notifications ${action}`, "success");

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to update push notifications";
            neonToast.error(errorMessage, "error");
        }
    };

    const handleEmailToggle = async () => {
        const newValue = !form.emailNotifications;

        try {
            await api.patch("/api/users/notif/", {
                notif_enabled: newValue
            });

            setForm(prev => ({ ...prev, emailNotifications: newValue }));

            if (refreshUser) {
                await refreshUser();
            }

            const action = newValue ? "enabled" : "disabled";
            neonToast.success(`Email notifications ${action}`, "success");

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to update email notifications";
            neonToast.error(errorMessage, "error");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Save email notifications
            await api.patch("/api/users/notif/", {
                notif_enabled: form.emailNotifications
            });

            // Save push notifications
            await api.patch("/api/users/push-notif/", {
                push_notif_enabled: form.pushNotifications
            });

            // Refresh user context
            if (refreshUser) {
                await refreshUser();
            }

            setSuccess("Settings saved successfully!");
            neonToast.success("Notification settings updated", "success");

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to save settings";
            setError(errorMessage);
            neonToast.error(errorMessage, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            // Reset to current API values
            await fetchNotificationSettings();

            setError(null);
            setSuccess("Settings refreshed");

        } catch (err) {
            setError("Failed to reset settings");
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
• Email Notifications: ${form.emailNotifications ? "Enabled" : "Disabled"}
• Push Notifications: ${form.pushNotifications ? "Enabled" : "Disabled"}
• Browser Permission: ${browserPermission}
• Browser Support: ${"Notification" in window ? "Yes" : "No"}
• Page Active: ${document.hidden ? "Background" : "Foreground"}
        `.trim();
        alert(status);
    };

    const handleTestPushNotification = () => {
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
        if (browserPermission !== "granted" && form.pushNotifications) {
            // This handles the case where permission was revoked or denied
            setForm(prev => ({ ...prev, pushNotifications: false }));

            // Also update the backend if needed
            if (user.isAuthenticated) {
                updatePushSetting(false).catch(console.error);
            }
        }

        // If permission is granted but user.pushNotifEnabled is false, sync with backend
        if (browserPermission === "granted" && user.pushNotifEnabled === false && form.pushNotifications) {
            setForm(prev => ({ ...prev, pushNotifications: false }));
        }
    }, [browserPermission, user.pushNotifEnabled]);

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
                                onClick={handleReset}
                                loading={isLoading}
                                disabled={isLoading || isSaving}
                                className={styles.resetBtn}
                            >
                                <FaTimes />
                                <span>Refresh</span>
                            </AsyncButton>
                            <AsyncButton
                                onClick={handleSave}
                                loading={isSaving}
                                disabled={isLoading || isSaving}
                                className={styles.saveBtn}
                            >
                                <FaSave />
                                <span>Save Changes</span>
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
                    {/* Email Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon}>
                                <MdEmail />
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Email Notifications</h3>
                                <p>Receive email updates about your account activities</p>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                checked={form.emailNotifications}
                                onChange={handleEmailToggle}
                                disabled={isLoading || isSaving}
                                className={styles.toggleInput}
                            />
                            <label htmlFor="emailNotifications" className={styles.toggleLabel}>
                                <span className={styles.toggleTrack}></span>
                                <span className={styles.toggleThumb}></span>
                            </label>
                        </div>
                    </div>

                    {/* Push Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon}>
                                {form.pushNotifications ? <MdNotifications /> : <MdNotificationsOff />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Push Notifications</h3>
                                <p>Receive browser notifications for real-time updates</p>
                                <div className={styles.permissionStatus}>
                                    {browserPermission === "granted" && (
                                        <span className={styles.statusGranted}>
                                            <FaCheck /> Permission granted
                                        </span>
                                    )}
                                    {browserPermission === "denied" && (
                                        <span className={styles.statusDenied}>
                                            <FaTimes /> Permission denied
                                        </span>
                                    )}
                                    {browserPermission === "default" && (
                                        <span className={styles.statusDefault}>
                                            <FaClock /> Click to enable
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="pushNotifications"
                                checked={form.pushNotifications}
                                onChange={handlePushToggle}
                                disabled={isLoading || isSaving || browserPermission === "denied" || browserPermission === "unsupported"}
                                className={styles.toggleInput}
                            />
                            <label htmlFor="pushNotifications" className={styles.toggleLabel}>
                                <span className={styles.toggleTrack}></span>
                                <span className={styles.toggleThumb}></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Test Section */}
                <div className={styles.testSection}>
                    <div className={styles.testButtons}>
                        <AsyncButton
                            onClick={handleTestPushNotification}
                            loading={false}
                            disabled={!form.pushNotifications || browserPermission !== "granted"}
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

                        {browserPermission === "default" && (
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
                            <span className={styles.statusLabel}>Email Notifications:</span>
                            <span className={form.emailNotifications ? styles.active : styles.inactive}>
                                {form.emailNotifications ? <><FaCheck /> Enabled</> : <><FaTimes /> Disabled</>}
                            </span>
                        </div>
                        <div className={styles.statusRow}>
                            <span className={styles.statusLabel}>Push Notifications:</span>
                            <span className={form.pushNotifications ? styles.active : styles.inactive}>
                                {form.pushNotifications ? <><FaCheck /> Enabled</> : <><FaTimes /> Disabled</>}
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className={styles.infoCard}>
                        <MdInfoOutline />
                        <div className={styles.infoContent}>
                            <h4>How notifications work:</h4>
                            <ul>
                                <li><strong>Email notifications</strong> are sent to your registered email address</li>
                                <li><strong>Push notifications</strong> require browser permission to work</li>
                                <li>If browser permissions are revoked, push notifications will be automatically disabled</li>
                                <li>You can manage browser permissions in your browser settings</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
}