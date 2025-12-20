import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import styles from "./Profile.module.css";
import ConfirmAction from "../../Components/ConfirmAction/ConfirmAction";

export default function Profile() {
    const { user, logout } = useUser();
    const navigate = useNavigate();

    if (user.isAuthenticated === null) {
        return <div className={styles.loading}></div>;
    }

    if (!user.isAuthenticated) {
        navigate("/login");
        return null;
    }

    const handleLogout = () => {
        logout();
    };

    return (
        <div className={styles.profileContainer}>
            <header className={styles.header}>
                <div className={styles.avatar}>
                    {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                </div>
                <div className={styles.headerInfo}>
                    <h2 className={styles.fullName}>{user.fullName || "User"}</h2>
                    <p className={styles.email}>{user.email}</p>
                </div>
                <div className={styles.actions}>
                    <ConfirmAction
                        onConfirm={handleLogout}
                        message="Are you sure you want to logout."
                    >
                        <button className={styles.logoutBtn}>
                            Logout
                        </button>
                    </ConfirmAction>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.card}>
                    <div className={styles.cardRow}>
                        <span className={styles.label}>Role</span>
                        <span className={styles.value}>{user.role || "—"}</span>
                    </div>

                    <div className={styles.cardRow}>
                        <span className={styles.label}>Email verified</span>
                        <span className={styles.badge}>
                            {user.emailVerified ? "Verified" : "Unverified"}
                        </span>
                    </div>

                    <div className={styles.cardRow}>
                        <span className={styles.label}>2FA</span>
                        <span className={styles.value}>
                            {user.twoFaEnabled ? "Enabled" : "Disabled"}
                        </span>
                    </div>

                    <div className={styles.cardRow}>
                        <span className={styles.label}>Has password</span>
                        <span className={styles.value}>{user.hasPassword ? "Yes" : "No"}</span>
                    </div>

                    <div className={styles.cardRow}>
                        <span className={styles.label}>Joined</span>
                        <span className={styles.value}>
                            {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : "—"}
                        </span>
                    </div>
                </section>

                <section className={styles.actionsGrid}>
                    <button className={styles.primaryBtn} onClick={() => navigate("/profile/edit")}>
                        Edit profile
                    </button>
                    <button className={styles.secondaryBtn} onClick={() => navigate("/security")}>
                        Security
                    </button>
                </section>
            </main>
        </div>
    );
}
