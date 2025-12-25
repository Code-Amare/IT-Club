import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./VerifyEmail.module.css";
import api from "../../Utils/api";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { useContext } from "react";
import { LoadingContext } from "../../Context/LoaderContext";
import Header from "../../Components/Header/Header";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import { useUser } from "../../Context/UserContext";

const VerifyEmail = () => {
    const [code, setCode] = useState("");
    const user = useUser();
    const { globalLoading } = useContext(LoadingContext);
    const navigate = useNavigate();

    const handleVerify = async () => {
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || "";
            email = email.replaceAll("/", "");
            await api.post("/api/users/verify-code/", { "code": code, "email": email });
            neonToast.success("Login successful");
            await user.getUser();
            navigate("/profile");
        } catch (err) {
            let errMsg = err.response?.data?.error;
            if (errMsg) {
                neonToast.error(errMsg);
            }
        }
    };

    const handleResend = async () => {
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || "";
            email = email.replaceAll("/", "");
            await api.post("/api/users/send-code/", { email });
            neonToast.success("Verification code sent successfully.");
        } catch (err) {
            let errMsg = err.response?.data?.error;
            if (errMsg) {
                neonToast.error(errMsg);
            }
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
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12L11 14L15 10M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4Z"
                                stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                        />
                    </div>

                    <div className={styles.ButtonGroup}>
                        <button
                            className={`${styles.PrimaryBtn} ${code.length < 4 ? styles.Disabled : ''}`}
                            onClick={handleVerify}
                            disabled={code.length < 4}
                        >
                            Verify Email
                        </button>

                        <button className={styles.SecondaryBtn} onClick={handleResend}>
                            Resend Code
                        </button>
                    </div>

                    <div className={styles.HelpText}>
                        <p>Didn't receive the code? Check your spam folder or resend.</p>
                        <p>Code expires in 15 minutes.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmail;