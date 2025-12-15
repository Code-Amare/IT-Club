import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./VerifyEmail.module.css";
import api from "../../Utils/api";
import FullScreenSpinner from "../../Components/FullScreenSpinner/FullScreenSpinner";
import { useContext } from "react";
import { LoadingContext } from "../../Context/LoaderContext";
import Header from "../../Components/Header/Header"
import { neonToast } from "../../Components/NeonToast/NeonToast"
import { useUser } from "../../Context/UserContext";

const VerifyEmail = () => {
    const [code, setCode] = useState("");
    const user = useUser()
    const { globalLoading } = useContext(LoadingContext);
    const navigate = useNavigate();

    const handleVerify = async () => {
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || ""
            email = email.replaceAll("/", "")
            const res = await api.post("/api/users/verify-code/", { "code": code, "email": email, });
            neonToast.success("Login successfull")
            user.login({
                role: res.data.user.role,
                email: res.data.user.email,
                emailVerified: res.data.user.email_verified,
                twoFaEnabled: res.data.user.twofa_enabled,
                hasPassword: res.data.user.has_password,
                dateJoined: res.data.user.date_joined,
                username: res.data.user.username,
            });
            navigate("/profile");
        } catch (err) {
            // let errMsg = err.response?.data?.error
            let errMsg = err.response.data.error
            if (errMsg) {

                neonToast.error(errMsg)
            }
        }
    };

    const handleResend = async () => {
        try {
            const params = new URLSearchParams(location.search);
            let email = params.get("email") || ""
            email = email.replaceAll("/", "")
            await api.post("/api/users/send-code/", { email });
            neonToast.success("Verification code sent successfully.")
        } catch (err) {
            let errMsg = err.response?.data?.error
            if (errMsg) {
                neonToast.error(errMsg)
            }
        }
    };

    return (
        <div className={styles.PageContainer}>
            <Header />
            {globalLoading && <FullScreenSpinner />}
            <main className={styles.MainContainer}>
                <div className={styles.VerificationBox}>
                    <h2 className={styles.Title}>Verify Your Email</h2>
                    <p className={styles.Subtitle}>
                        Enter the code sent to your email to verify your account.
                    </p>

                    <input
                        type="text"
                        className={styles.Input}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter verification code"
                    />


                    <div className={styles.ButtonGroup}>
                        <button className={styles.PrimaryBtn} onClick={handleVerify}>
                            Verify
                        </button>
                        <button className={styles.SecondaryBtn} onClick={handleResend}>
                            Resend Code
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VerifyEmail;
