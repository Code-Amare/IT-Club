import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Register.module.css";
import ThemeToggle from "../../Components/ThemeToggle/ThemeToggle";
import api from "../../Utils/api";
import { LoadingContext } from "../../Context/LoaderContext";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { neonToast } from "../../Components/NeonToast/NeonToast";

const Register = () => {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const { globalLoading } = useContext(LoadingContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            neonToast.error("Passwords do not match");
            return;
        }

        const register = async () => {
            try {
                const res = await api.post("api/users/register/", {
                    fullName,
                    email,
                    password,
                }, { publicApi: true });
                console.log(res)

                neonToast.success("Register successful!");
                navigate(`/verify-email/?email=${email}`);
            } catch (err) {
                const email_sent = err.response?.data?.email_sent || true
                if (!email_sent) {
                    navigate(`/verify-email/?email=${email}`);
                    return neonToast.error("Resend email!");
                }
                const errMsg = err.response?.data?.error || "Something went wrong";
                neonToast.error(errMsg);
            }
        };

        register();
    };

    return (
        <div className={styles.PageContainer}>
            {globalLoading && <FullScreenSpinner />}
            <header className={styles.TopBar}>
                <Link to="/" className={styles.HomeLink}>← Back to Home</Link>
                <ThemeToggle />
            </header>

            <main className={styles.RegisterContainer}>
                <form className={styles.RegisterForm} onSubmit={handleSubmit}>
                    <h2 className={styles.Title}>Create Account</h2>
                    <p className={styles.Subtitle}>Register a new account</p>

                    <label className={styles.Label}>Full Name</label>
                    <input
                        type="text"
                        className={styles.Input}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="your Full Name"
                        required
                    />

                    <label className={styles.Label}>Email</label>
                    <input
                        type="email"
                        className={styles.Input}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />

                    <label className={styles.Label}>Password</label>
                    <input
                        type="password"
                        className={styles.Input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                    />

                    <label className={styles.Label}>Confirm Password</label>
                    <input
                        type="password"
                        className={styles.Input}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                    />

                    <button type="submit" className={styles.RegisterBtn}>Register</button>

                    <p className={styles.LoginPrompt}>
                        Already have an account? <Link to="/login" className={styles.LoginLink}>Login</Link>
                    </p>
                </form>
            </main>
        </div>
    );
};

export default Register;
