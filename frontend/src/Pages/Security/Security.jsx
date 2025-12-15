import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import api from "../../Utils/api";
import ConfirmAction from "../../Components/ConfirmAction/ConfirmAction";
import styles from "./Security.module.css";

export default function Security() {
    const { user, logout, refreshUser } = useUser();
    const navigate = useNavigate();
    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
    }, [user, navigate]);

    const toggle2FA = async () => {
        setMsg("");
        setTwoFaLoading(true);
        try {
            if (user.twoFaEnabled) {
                await api.post("/api/2fa/disable/");
            } else {
                await api.post("/api/2fa/enable/");
            }
            if (typeof refreshUser === "function") await refreshUser();
            setMsg(user.twoFaEnabled ? "2FA disabled" : "2FA enabled");
        } catch (err) {
            setMsg(err.response?.data?.detail || "Failed to toggle 2FA");
        } finally {
            setTwoFaLoading(false);
        }
    };

    const handlePwChange = (e) => setPwForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    const submitPassword = async (e) => {
        e.preventDefault();
        setMsg("");
        if (pwForm.new_password !== pwForm.confirm_password) {
            setMsg("New passwords do not match");
            return;
        }
        setPwLoading(true);
        try {
            await api.post("/api/auth/password/change/", {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwForm({ current_password: "", new_password: "", confirm_password: "" });
            setMsg("Password changed");
            if (typeof refreshUser === "function") await refreshUser();
        } catch (err) {
            setMsg(err.response?.data?.detail || "Failed to change password");
        } finally {
            setPwLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        try {
            await api.post("/api/auth/logout-all/");
            logout();
        } catch {
            logout();
        }
    };

    if (user.isAuthenticated === null) return <div className={styles.loading}></div>;
    if (!user.isAuthenticated) return null;

    return (
        <div className={styles.profileContainer}>
            <header className={styles.header}>
                <div className={styles.avatar}>{user.username ? user.username[0].toUpperCase() : "U"}</div>
                <div className={styles.headerInfo}>
                    <h2 className={styles.username}>Security</h2>
                    <p className={styles.email}>{user.email}</p>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.card}>
                    <div className={styles.cardRow}>
                        <span className={styles.label}>Two-factor authentication</span>
                        <button className={styles.primaryBtn} onClick={toggle2FA} disabled={twoFaLoading}>
                            {twoFaLoading ? "Working..." : user.twoFaEnabled ? "Disable 2FA" : "Enable 2FA"}
                        </button>
                    </div>

                    <form onSubmit={submitPassword} className={styles.form}>
                        <h3 className={styles.label}>Change password</h3>

                        <div className={styles.fieldRow}>
                            <label className={styles.label}>Current password</label>
                            <input name="current_password" type="password" value={pwForm.current_password} onChange={handlePwChange} className={styles.input} />
                        </div>

                        <div className={styles.fieldRow}>
                            <label className={styles.label}>New password</label>
                            <input name="new_password" type="password" value={pwForm.new_password} onChange={handlePwChange} className={styles.input} />
                        </div>

                        <div className={styles.fieldRow}>
                            <label className={styles.label}>Confirm new</label>
                            <input name="confirm_password" type="password" value={pwForm.confirm_password} onChange={handlePwChange} className={styles.input} />
                        </div>

                        <div className={styles.actionsGrid}>
                            <button type="submit" className={styles.primaryBtn} disabled={pwLoading}>
                                {pwLoading ? "Saving..." : "Change password"}
                            </button>
                        </div>
                    </form>

                    {msg && <div className={styles.helperText}>{msg}</div>}
                </section>

                <section className={styles.card}>
                    <h3 className={styles.label}>Sessions</h3>
                    <p className={styles.helperText}>Logout from all devices (revokes refresh tokens).</p>
                    <ConfirmAction onConfirm={handleLogoutAll} message="Logout from all devices?">
                        <button className={styles.secondaryBtn}>Logout all</button>
                    </ConfirmAction>
                </section>
            </main>
        </div>
    );
}
