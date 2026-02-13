import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import styles from "./VerifyEmail.module.css";
import api from "../../Utils/api";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { LoadingContext } from "../../Context/LoaderContext";
import Header from "../../Components/Header/Header";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import { useUser } from "../../Context/UserContext";
import { FaEnvelope, FaSpinner } from "react-icons/fa"; // Icons

const VerifyEmail = () => {
    const [code, setCode] = useState("");
    const [verifying, setVerifying] = useState(false); // Loading for verify
    const [resending, setResending] = useState(false); // Loading for resend
    const user = useUser();
    const { globalLoading } = useContext(LoadingContext);
    const navigate = useNavigate();
    const location = useLocation(); // Get location

    const handleVerify = async () => {
        if (code.length < 4) return;

        setVerifying(true);
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || "";
            email = email.replaceAll("/", "");
            await api.post("/api/users/verify-code/", { code, email });
            neonToast.success("Login successful");
            await user.getUser();
            navigate("/profile");
        } catch (err) {
            let errMsg = err.response?.data?.error || "Verification failed";
            neonToast.error(errMsg);
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || "";
            email = email.replaceAll("/", "");
            await api.post("/api/users/send-code/", { email });
            neonToast.success("Verification code sent successfully.");
        } catch (err) {
            let errMsg = err.response?.data?.error || "Failed to resend code";
            neonToast.error(errMsg);
        } finally {
            setResending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleVerify();
        }
    };

    return (
        <div className={styles.PageContainer}>
            <Header />
            {globalLoading && <FullScreenSpinner />}
            <main className={styles.MainContainer}>
                <div className={styles.VerificationBox}>
                    <div className={styles.IconContainer}>
                        <FaEnvelope className={styles.EmailIcon} />
                    </div>

                    <h2 className={styles.Title}>Verify Your Email</h2>
                    <p className={styles.Subtitle}>
                        Enter the 6-digit verification code sent to your email address
                    </p>

                    <div className={styles.InputWrapper}>
                        <input
                            type="text"
                            className={styles.Input}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter 6-digit code"
                            maxLength="6"
                            disabled={verifying || resending}
                        />
                    </div>

                    <div className={styles.ButtonGroup}>
                        <button
                            className={`${styles.PrimaryBtn} ${code.length < 4 ? styles.Disabled : ''}`}
                            onClick={handleVerify}
                            disabled={code.length < 4 || verifying || resending}
                        >
                            {verifying ? (
                                <>
                                    <FaSpinner className={styles.Spinner} />
                                    Verifying...
                                </>
                            ) : (
                                "Verify Email"
                            )}
                        </button>

                        <button
                            className={styles.SecondaryBtn}
                            onClick={handleResend}
                            disabled={resending || verifying}
                        >
                            {resending ? (
                                <>
                                    <FaSpinner className={styles.Spinner} />
                                    Sending...
                                </>
                            ) : (
                                "Resend Code"
                            )}
                        </button>
                    </div>

                    <div className={styles.HelpText}>
                        <p>Didn't receive the code? Check your spam folder or resend.</p>
                        <p>Code expires in 10 minutes.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmail;