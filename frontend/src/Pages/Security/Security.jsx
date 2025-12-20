import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import api from "../../Utils/api";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import ConfirmAction from "../../Components/ConfirmAction/ConfirmAction";
import AsyncButton from "../../Components/AsyncButton/AsyncButton";
import SideBar from "../../Components/SideBar/SideBar";
import styles from "./Security.module.css";
import {
    FaShieldAlt,
    FaKey,
    FaSignOutAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaEye,
    FaEyeSlash,
    FaMobileAlt,
    FaClock,
    FaLock,
    FaUnlock
} from "react-icons/fa";
import { MdSecurity, MdDevices, MdWarning } from "react-icons/md";
import { IoShieldCheckmark } from "react-icons/io5";

export default function Security() {
    const { user, logout, refreshUser } = useUser();
    const navigate = useNavigate();

    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
    }, [user, navigate]);

    const toggle2FA = async () => {
        setMessage({ text: "", type: "" });
        setTwoFaLoading(true);

        try {
            if (user.twoFaEnabled) {
                await api.post("/api/2fa/disable/");
                setMessage({
                    text: "Two-factor authentication disabled successfully",
                    type: "success"
                });
            } else {
                const response = await api.post("/api/2fa/enable/");

                if (response.data?.setup_qr) {
                    // Navigate to 2FA setup page with QR code
                    navigate("/2fa-setup", {
                        state: {
                            qrCode: response.data.setup_qr,
                            backupCodes: response.data.backup_codes
                        }
                    });
                    return;
                }

                setMessage({
                    text: "Two-factor authentication enabled successfully",
                    type: "success"
                });
            }

            if (typeof refreshUser === "function") {
                await refreshUser();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.message ||
                "Failed to update 2FA settings";
            setMessage({ text: errorMessage, type: "error" });
            neonToast.error(errorMessage, "error");
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordForm(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        // Clear message when user starts typing
        if (message.text) {
            setMessage({ text: "", type: "" });
        }
    };

    const togglePasswordVisibility = (field) => {
        switch (field) {
            case 'current': setShowCurrentPassword(!showCurrentPassword); break;
            case 'new': setShowNewPassword(!showNewPassword); break;
            case 'confirm': setShowConfirmPassword(!showConfirmPassword); break;
        }
    };

    const validatePassword = (password) => {
        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        return {
            ...requirements,
            isValid: Object.values(requirements).every(req => req)
        };
    };

    const submitPasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "" });

        // Validation
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setMessage({
                text: "New passwords do not match",
                type: "error"
            });
            return;
        }

        const passwordValidation = validatePassword(passwordForm.new_password);
        if (!passwordValidation.isValid) {
            setMessage({
                text: "New password does not meet requirements",
                type: "error"
            });
            return;
        }

        setPwLoading(true);

        try {
            await api.post("/api/auth/password/change/", {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            });

            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_password: ""
            });

            setMessage({
                text: "Password changed successfully",
                type: "success"
            });
            neonToast.success("Password changed successfully", "success");

            if (typeof refreshUser === "function") {
                await refreshUser();
            }

        } catch (err) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.message?.[0] ||
                "Failed to change password";
            setMessage({ text: errorMessage, type: "error" });
            neonToast.error(errorMessage, "error");
        } finally {
            setPwLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        try {
            await api.post("/api/auth/logout-all/");
            logout();
            neonToast.success("Logged out from all devices", "success");
        } catch (err) {
            console.error("Logout all error:", err);
            logout(); // Still logout locally
        }
    };

    const getActiveSessions = () => {
        // This would typically come from an API
        return [
            {
                id: 1,
                device: "Chrome on Windows",
                location: "New York, USA",
                lastActive: "2 hours ago",
                current: true
            },
            {
                id: 2,
                device: "Safari on iPhone",
                location: "San Francisco, USA",
                lastActive: "3 days ago",
                current: false
            },
            {
                id: 3,
                device: "Firefox on Mac",
                location: "London, UK",
                lastActive: "1 week ago",
                current: false
            }
        ];
    };

    if (user.isAuthenticated === null) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading security settings...</p>
            </div>
        );
    }

    if (!user.isAuthenticated) return null;

    const activeSessions = getActiveSessions();
    const passwordValidation = validatePassword(passwordForm.new_password);

    return (
        <div className={styles.securityContainer}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaShieldAlt className={styles.titleIcon} />
                            <div>
                                <h1>Security Settings</h1>
                                <p>Manage your account security and privacy</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Banner */}
                {message.text && (
                    <div className={`${styles.messageBanner} ${styles[message.type]}`}>
                        {message.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Main Content */}
                <main className={styles.mainContent}>
                    {/* Two-Factor Authentication Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <IoShieldCheckmark className={styles.cardIcon} />
                                Two-Factor Authentication
                            </h2>
                            <div className={`${styles.statusBadge} ${user.twoFaEnabled ? styles.enabled : styles.disabled}`}>
                                {user.twoFaEnabled ? "Enabled" : "Disabled"}
                            </div>
                        </div>

                        <div className={styles.cardContent}>
                            <div className={styles.settingRow}>
                                <div className={styles.settingInfo}>
                                    <div className={styles.settingIcon}>
                                        <FaMobileAlt />
                                    </div>
                                    <div>
                                        <h3>Two-Factor Authentication (2FA)</h3>
                                        <p>
                                            Add an extra layer of security to your account.
                                            When enabled, you'll need to enter a verification code
                                            from your authenticator app when signing in.
                                        </p>
                                        {user.twoFaEnabled && (
                                            <div className={styles.helperText}>
                                                <FaCheckCircle />
                                                <span>2FA is currently protecting your account</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <AsyncButton
                                    onClick={toggle2FA}
                                    loading={twoFaLoading}
                                    disabled={twoFaLoading}
                                    className={user.twoFaEnabled ? styles.dangerBtn : styles.primaryBtn}
                                >
                                    {user.twoFaEnabled ? (
                                        <>
                                            <FaUnlock />
                                            <span>Disable 2FA</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaLock />
                                            <span>Enable 2FA</span>
                                        </>
                                    )}
                                </AsyncButton>
                            </div>
                        </div>
                    </div>

                    {/* Change Password Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <FaKey className={styles.cardIcon} />
                                Change Password
                            </h2>
                        </div>

                        <form onSubmit={submitPasswordChange} className={styles.form}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Current Password
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            name="current_password"
                                            value={passwordForm.current_password}
                                            onChange={handlePasswordChange}
                                            className={styles.formInput}
                                            placeholder="Enter current password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => togglePasswordVisibility('current')}
                                        >
                                            {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        New Password
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            name="new_password"
                                            value={passwordForm.new_password}
                                            onChange={handlePasswordChange}
                                            className={styles.formInput}
                                            placeholder="Enter new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => togglePasswordVisibility('new')}
                                        >
                                            {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>

                                    {/* Password Requirements */}
                                    <div className={styles.passwordRequirements}>
                                        <h4>Password must contain:</h4>
                                        <ul>
                                            <li className={passwordValidation.minLength ? styles.valid : styles.invalid}>
                                                At least 8 characters
                                            </li>
                                            <li className={passwordValidation.hasUpperCase ? styles.valid : styles.invalid}>
                                                One uppercase letter
                                            </li>
                                            <li className={passwordValidation.hasLowerCase ? styles.valid : styles.invalid}>
                                                One lowercase letter
                                            </li>
                                            <li className={passwordValidation.hasNumbers ? styles.valid : styles.invalid}>
                                                One number
                                            </li>
                                            <li className={passwordValidation.hasSpecialChar ? styles.valid : styles.invalid}>
                                                One special character
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Confirm New Password
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={passwordForm.confirm_password}
                                            onChange={handlePasswordChange}
                                            className={styles.formInput}
                                            placeholder="Confirm new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => togglePasswordVisibility('confirm')}
                                        >
                                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>

                                    {/* Password Match Indicator */}
                                    {passwordForm.new_password && passwordForm.confirm_password && (
                                        <div className={`${styles.matchIndicator} ${passwordForm.new_password === passwordForm.confirm_password
                                                ? styles.matches
                                                : styles.noMatch
                                            }`}>
                                            {passwordForm.new_password === passwordForm.confirm_password
                                                ? "✓ Passwords match"
                                                : "✗ Passwords do not match"}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <AsyncButton
                                    type="submit"
                                    loading={pwLoading}
                                    disabled={pwLoading || !passwordForm.current_password}
                                    className={styles.primaryBtn}
                                >
                                    <FaKey />
                                    <span>Change Password</span>
                                </AsyncButton>
                            </div>
                        </form>
                    </div>

                    {/* Active Sessions Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <MdDevices className={styles.cardIcon} />
                                Active Sessions
                            </h2>
                        </div>

                        <div className={styles.sessionsList}>
                            <div className={styles.sessionHeader}>
                                <span>Device</span>
                                <span>Location</span>
                                <span>Last Active</span>
                                <span>Status</span>
                            </div>

                            {activeSessions.map(session => (
                                <div key={session.id} className={`${styles.sessionItem} ${session.current ? styles.currentSession : ''}`}>
                                    <div className={styles.sessionDevice}>
                                        <FaMobileAlt />
                                        <span>{session.device}</span>
                                    </div>
                                    <div className={styles.sessionLocation}>
                                        {session.location}
                                    </div>
                                    <div className={styles.sessionLastActive}>
                                        <FaClock />
                                        <span>{session.lastActive}</span>
                                    </div>
                                    <div className={styles.sessionStatus}>
                                        {session.current ? (
                                            <span className={styles.currentBadge}>Current</span>
                                        ) : (
                                            <button className={styles.logoutBtn}>
                                                <FaSignOutAlt />
                                                <span>Logout</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.sessionActions}>
                            <ConfirmAction
                                onConfirm={handleLogoutAll}
                                message="Are you sure you want to logout from all devices? This will end all active sessions."
                                confirmText="Logout All"
                                cancelText="Cancel"
                            >
                                <button className={styles.dangerBtn}>
                                    <FaSignOutAlt />
                                    <span>Logout All Devices</span>
                                </button>
                            </ConfirmAction>
                        </div>
                    </div>

                    {/* Security Tips Card */}
                    <div className={`${styles.card} ${styles.tipsCard}`}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <MdSecurity className={styles.cardIcon} />
                                Security Tips
                            </h2>
                        </div>

                        <div className={styles.tipsList}>
                            <div className={styles.tipItem}>
                                <div className={styles.tipIcon}>
                                    <FaShieldAlt />
                                </div>
                                <div className={styles.tipContent}>
                                    <h3>Enable Two-Factor Authentication</h3>
                                    <p>Add an extra layer of security to prevent unauthorized access.</p>
                                </div>
                            </div>

                            <div className={styles.tipItem}>
                                <div className={styles.tipIcon}>
                                    <FaKey />
                                </div>
                                <div className={styles.tipContent}>
                                    <h3>Use Strong Passwords</h3>
                                    <p>Create unique passwords with a mix of letters, numbers, and symbols.</p>
                                </div>
                            </div>

                            <div className={styles.tipItem}>
                                <div className={styles.tipIcon}>
                                    <FaSignOutAlt />
                                </div>
                                <div className={styles.tipContent}>
                                    <h3>Logout from Shared Devices</h3>
                                    <p>Always logout when using public or shared computers.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </SideBar>
        </div>
    );
}