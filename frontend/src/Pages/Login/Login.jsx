import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import ThemeToggle from "../../Components/ThemeToggle/ThemeToggle";
import api from "../../Utils/api";
import { LoadingContext } from "../../Context/LoaderContext";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { neonToast } from "../../Components/NeonToast/NeonToast";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { globalLoading } = useContext(LoadingContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        const login = async () => {
            try {
                const res = await api.post("api/users/login/", { email, password });
                console.log("Login successful:", res.data);
                if (res.data.verify_email == true) {
                    return navigate(`/verify-email/?email=${email}`)
                }
                neonToast.success("Login successfull!")
                const params = new URLSearchParams(location.search);
                const next = params.get("next") || "/profile";

                navigate(next);
            } catch (err) {
                const email_sent = err.response?.data?.email_sent
                console.log(`email_sent: ${email_sent}`)
                if (!email_sent) {
                    navigate(`/verify-email/?email=${email}`);
                    return neonToast.error("Resend email!");
                }
                console.log(err)
                const errMsg = err.response?.data?.error || "Something went wrong";
                neonToast.error(errMsg)
            }
        };

        login();
    };

    return (
        <div className={styles.PageContainer}>
            {globalLoading && <FullScreenSpinner />}
            <header className={styles.TopBar}>
                <Link to="/" className={styles.HomeLink}>← Back to Home</Link>
                <ThemeToggle />
            </header>

            <main className={styles.LoginContainer}>
                <form className={styles.LoginForm} onSubmit={handleSubmit}>
                    <h2 className={styles.Title}>Welcome Back</h2>
                    <p className={styles.Subtitle}>Log in to your account</p>

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
                        placeholder="Enter your password"
                        required
                    />

                    <button type="submit" className={styles.LoginBtn}>Login</button>

                    <p className={styles.RegisterPrompt}>
                        Don’t have an account yet? <Link to="/register" className={styles.RegisterLink}>Register</Link>
                    </p>
                </form>
            </main>
        </div>
    );
};

export default Login;
