import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import styles from "./Settings.module.css";
import SideBar from "../../Components/SideBar/SideBar";
import {
    FaBell,
    FaSave,
    FaTimes,
    FaVolumeUp,
    FaVolumeMute,
    FaCheck,
    FaExclamationTriangle,
    FaSearch,
    FaAndroid,
    FaEye,
    FaEyeSlash,
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

// Device detection
const isAndroid = () => /android/i.test(navigator.userAgent);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function Settings() {
    const { user } = useUser();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        emailNotifications: true,
        pushNotifications: false,
        soundEnabled: true,
        browserNotificationsEnabled: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [browserPermission, setBrowserPermission] = useState(
        "Notification" in window ? Notification.permission : "unsupported"
    );
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [testNotificationSent, setTestNotificationSent] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState({
        isAndroid: false,
        isIOS: false,
    });

    // Initialize
    useEffect(() => {
        if (user.isAuthenticated === null) return;

        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }

        // Detect device
        setDeviceInfo({
            isAndroid: isAndroid(),
            isIOS: isIOS(),
        });

        // Load saved settings
        const savedSettings = localStorage.getItem("notificationSettings");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setForm(parsed);
            } catch (err) {
                console.error("Error loading saved settings:", err);
            }
        }

        // Update permission state
        if ("Notification" in window) {
            setBrowserPermission(Notification.permission);
        }

        return () => {
            // Cleanup
        };
    }, [user, navigate]);

    const handleToggle = useCallback((field) => {
        setForm(prev => {
            const newValue = !prev[field];
            const updatedForm = { ...prev, [field]: newValue };

            if (field === "browserNotificationsEnabled" && newValue) {
                requestBrowserPermission(updatedForm);
            } else if (field === "browserNotificationsEnabled" && !newValue) {
                setSuccess("Browser notifications disabled");
                setTimeout(() => setSuccess(null), 3000);
            }

            return updatedForm;
        });
    }, []);

    const requestBrowserPermission = useCallback(async (updatedForm = null) => {
        if (!("Notification" in window)) {
            setError("Your browser does not support notifications");
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setBrowserPermission(permission);

            if (permission === "granted") {
                const finalForm = updatedForm || form;
                setForm({ ...finalForm, browserNotificationsEnabled: true });

                // Show a success notification immediately
                createNotification("Notifications Enabled", "You'll now receive notifications from our app.");

                setSuccess("Browser notifications enabled!");
                setTimeout(() => setSuccess(null), 3000);
                return true;
            }

            if (permission === "denied") {
                setError("Notifications have been blocked. Please enable them in your browser settings.");
                const finalForm = updatedForm || form;
                setForm({ ...finalForm, browserNotificationsEnabled: false });
                return false;
            }

            // Default case
            const finalForm = updatedForm || form;
            setForm({ ...finalForm, browserNotificationsEnabled: false });
            return false;

        } catch (err) {
            console.error("Error requesting notification permission:", err);
            setError("Failed to request notification permission");
            const finalForm = updatedForm || form;
            setForm({ ...finalForm, browserNotificationsEnabled: false });
            return false;
        }
    }, [form]);

    const createNotification = useCallback((title, body) => {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        try {
            // Try to use service worker if available
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready
                    .then(registration => {
                        registration.showNotification(title, {
                            body: body,
                            icon: '/favicon.ico',
                            badge: '/favicon.ico',
                            tag: `notification-${Date.now()}`,
                            vibrate: [200, 100, 200],
                            silent: !form.soundEnabled,
                        });
                    })
                    .catch(err => {
                        console.log("Service Worker notification failed, falling back to Notification API");
                        fallbackNotification(title, body);
                    });
            } else {
                // Fallback to regular Notification API
                fallbackNotification(title, body);
            }
        } catch (err) {
            console.error("Error creating notification:", err);
            fallbackNotification(title, body);
        }
    }, [form.soundEnabled]);

    const fallbackNotification = (title, body) => {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `notification-${Date.now()}`,
                silent: !form.soundEnabled,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 5000);
        } catch (err) {
            console.error("Fallback notification also failed:", err);
            // Last resort: Use a custom alert/div
            showCustomAlert(title, body);
        }
    };

    const showCustomAlert = (title, body) => {
        // Create a custom alert element
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        alertDiv.innerHTML = `
            <strong>${title}</strong>
            <p style="margin: 8px 0 0 0; font-size: 14px;">${body}</p>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.parentNode.removeChild(alertDiv);
                }
            }, 300);
        }, 5000);

        // Add CSS animations if not present
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    };

    const handleTestNotification = () => {
        setError(null);
        setSuccess(null);

        if (browserPermission === "granted") {
            createNotification("Test Notification", "This is a test notification from our app.");
            setTestNotificationSent(true);
            setTimeout(() => setTestNotificationSent(false), 3000);
            setSuccess("Test notification sent!");
            setTimeout(() => setSuccess(null), 3000);
        } else if (browserPermission === "default") {
            requestBrowserPermission();
        } else if (browserPermission === "denied") {
            setError("Notifications are blocked. Please enable them in your browser settings.");
        } else {
            setError("Your browser does not support notifications.");
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            localStorage.setItem("notificationSettings", JSON.stringify(form));

            if (form.browserNotificationsEnabled && browserPermission !== "granted") {
                const permissionGranted = await requestBrowserPermission();
                if (!permissionGranted) {
                    setError("Could not enable browser notifications. Please grant permission.");
                    setIsLoading(false);
                    return;
                }
            }

            setSuccess("Settings saved successfully!");
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error("Error saving settings:", err);
            setError("Failed to save settings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setForm({
            emailNotifications: true,
            pushNotifications: false,
            soundEnabled: true,
            browserNotificationsEnabled: false,
        });
        setError(null);
        setSuccess(null);
        setTestNotificationSent(false);
        localStorage.removeItem("notificationSettings");

        if ("Notification" in window) {
            setBrowserPermission(Notification.permission);
        }
    };

    const checkNotificationStatus = () => {
        const status = `
Notification Status:
• Permission: ${Notification.permission}
• Browser Support: ${"Notification" in window ? "Yes" : "No"}
• Service Worker: ${'serviceWorker' in navigator ? "Yes" : "No"}
• Device: ${deviceInfo.isAndroid ? "Android" : deviceInfo.isIOS ? "iOS" : "Desktop"}
• Page Active: ${document.hidden ? "Background" : "Foreground"}
        `.trim();
        alert(status);
    };

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
                            <button
                                className={styles.resetBtn}
                                onClick={handleReset}
                                disabled={isLoading}
                            >
                                <FaTimes />
                                <span>Reset</span>
                            </button>
                            <button
                                className={styles.saveBtn}
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className={styles.spinner}></div>
                                ) : (
                                    <>
                                        <FaSave />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
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

                {testNotificationSent && (
                    <div className={styles.testBanner}>
                        <FaBell />
                        <span>Test notification sent! Check your notifications.</span>
                    </div>
                )}

                {/* Settings Grid */}
                <div className={styles.settingsGrid}>
                    {/* Email Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon} style={{ background: '#4f46e5' }}>
                                <MdEmail />
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Email Notifications</h3>
                                <p>Receive email updates about your account</p>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="emailNotifications"
                                checked={form.emailNotifications}
                                onChange={() => handleToggle("emailNotifications")}
                                disabled={isLoading}
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
                            <div className={styles.settingIcon} style={{ background: '#10b981' }}>
                                {form.pushNotifications ? <FaRegBell /> : <FaRegBellSlash />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Push Notifications</h3>
                                <p>Receive push notifications for updates</p>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="pushNotifications"
                                checked={form.pushNotifications}
                                onChange={() => handleToggle("pushNotifications")}
                                disabled={isLoading}
                                className={styles.toggleInput}
                            />
                            <label htmlFor="pushNotifications" className={styles.toggleLabel}>
                                <span className={styles.toggleTrack}></span>
                                <span className={styles.toggleThumb}></span>
                            </label>
                        </div>
                    </div>

                    {/* Notification Sounds */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon} style={{ background: '#f59e0b' }}>
                                {form.soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Notification Sounds</h3>
                                <p>Play sound for notifications</p>
                            </div>
                        </div>
                        <div className={styles.toggleContainer}>
                            <input
                                type="checkbox"
                                id="soundEnabled"
                                checked={form.soundEnabled}
                                onChange={() => handleToggle("soundEnabled")}
                                disabled={isLoading}
                                className={styles.toggleInput}
                            />
                            <label htmlFor="soundEnabled" className={styles.toggleLabel}>
                                <span className={styles.toggleTrack}></span>
                                <span className={styles.toggleThumb}></span>
                            </label>
                        </div>
                    </div>

                    {/* Browser Notifications */}
                    <div className={styles.settingCard}>
                        <div className={styles.settingContent}>
                            <div className={styles.settingIcon} style={{ background: '#ec4899' }}>
                                {browserPermission === "granted" ? <MdNotifications /> : <MdNotificationsOff />}
                            </div>
                            <div className={styles.settingInfo}>
                                <h3>Browser Notifications</h3>
                                <p>Allow desktop notifications from browser</p>
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
                                id="browserNotificationsEnabled"
                                checked={form.browserNotificationsEnabled}
                                onChange={() => handleToggle("browserNotificationsEnabled")}
                                disabled={isLoading || browserPermission === "denied" || browserPermission === "unsupported"}
                                className={styles.toggleInput}
                            />
                            <label htmlFor="browserNotificationsEnabled" className={styles.toggleLabel}>
                                <span className={styles.toggleTrack}></span>
                                <span className={styles.toggleThumb}></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Test Section */}
                <div className={styles.testSection}>
                    <div className={styles.testButtons}>
                        <button
                            className={styles.testBtn}
                            onClick={handleTestNotification}
                            disabled={browserPermission === "denied" || browserPermission === "unsupported"}
                        >
                            <FaBell />
                            <span>Test Notifications</span>
                        </button>
                        <button
                            className={styles.debugBtn}
                            onClick={checkNotificationStatus}
                        >
                            <FaSearch />
                            <span>Debug</span>
                        </button>
                        {deviceInfo.isAndroid && (
                            <button
                                className={styles.androidBtn}
                                onClick={() => alert('For Android: Make sure Chrome notifications are enabled in settings')}
                            >
                                <FaAndroid />
                                <span>Android Help</span>
                            </button>
                        )}
                    </div>

                    {/* Status */}
                    <div className={styles.statusCard}>
                        <div className={styles.statusRow}>
                            <span className={styles.statusLabel}>Status:</span>
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
                            <span className={styles.statusLabel}>App State:</span>
                            <span className={document.hidden ? styles.background : styles.foreground}>
                                {document.hidden ? <><FaEyeSlash /> Background</> : <><FaEye /> Foreground</>}
                            </span>
                        </div>
                    </div>

                    {/* Tips */}
                    {deviceInfo.isAndroid && (
                        <div className={styles.tipCard}>
                            <FaExclamationTriangle />
                            <p>On Android, make sure Chrome notifications are enabled in device settings and browser settings.</p>
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
}