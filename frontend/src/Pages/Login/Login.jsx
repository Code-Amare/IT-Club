import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import styles from "./Login.module.css";
import ThemeToggle from "../../Components/ThemeToggle/ThemeToggle";
import api from "../../Utils/api";
import { LoadingContext } from "../../Context/LoaderContext";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import { useSite } from "../../Context/SiteContext";
import { useUser } from "../../Context/UserContext";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Destructure specifically and alias 'login' to 'updateUserContext'
    const user = useUser();
    const { site } = useSite(); // site.isTwoFaMandatory
    const { globalLoading } = useContext(LoadingContext);

    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await api.post("api/users/login/", { email, password }, { publicApi: true });

            user.getUser();

            if (site.isTwoFaMandatory) {
                return navigate(`/verify-email/?email=${email}`);
            }

            neonToast.success("Login successful!");

            const params = new URLSearchParams(location.search);
            const next = params.get("next") || "/admin";
            navigate(next);

        } catch (err) {
            console.error(err);
            alert(err)
            const errMsg = err.response?.data?.error || "Something went wrong";
            neonToast.error(errMsg);
        }
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