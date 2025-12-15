import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import api from "../../Utils/api";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import AsyncButton from "../../Components/AsyncButton/AsyncButton";
import styles from "./EditProfile.module.css";

export default function ProfileEdit() {
    const { user, refreshUser, login, getUser } = useUser();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", email: "" });
    const [profileImage, setProfileImage] = useState(null);
    const [preview, setPreview] = useState(null);


    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        setForm({ username: user.username || "", email: user.email || "" });
    }, [user, navigate]);

    const handleChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        try {
            const data = new FormData();
            data.append("username", form.username);
            data.append("email", form.email);
            if (profileImage) data.append("profile_pic", profileImage);

            const res = await api.patch("/api/users/edit/", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            console.log(res)
            getUser()
            // if (res.status === 200 && res.data.user) {
            //     login({ isAuthenticated: true, ...res.data.user })
            // }

            if (typeof refreshUser === "function") await refreshUser();
            neonToast.success("Profile updated successfully", "success");
            navigate("/profile");
        } catch (err) {
            console.log(err)
            neonToast.error(err.response?.data?.detail || "Failed to update profile", "error");
        }
    };

    if (user.isAuthenticated === null) return <div className={styles.loading}></div>;
    if (!user.isAuthenticated) return null;

    return (
        <div className={styles.profileContainer}>
            <header className={styles.header}>
                <div className={styles.avatar}>
                    {preview ? (
                        <img src={preview} alt="Profile Preview" className={styles.avatarImg} />
                    ) : form.username ? (
                        form.username[0].toUpperCase()
                    ) : (
                        "U"
                    )}
                </div>
                <div className={styles.headerInfo}>
                    <h2 className={styles.username}>Edit Profile</h2>
                    <p className={styles.email}>{user.email}</p>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.card}>
                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                        <div className={styles.fieldRow}>
                            <label className={styles.label}>Profile Image</label>
                            <input type="file" accept="image/*" onChange={handleImageChange} />
                        </div>

                        <div className={styles.fieldRow}>
                            <label className={styles.label}>Username</label>
                            <input
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.fieldRow}>
                            <label className={styles.label}>Email</label>
                            <input
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.actionsGrid}>
                            <AsyncButton onClick={handleSubmit} className={styles.primaryBtn}>
                                Save Changes
                            </AsyncButton>

                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => navigate("/profile")}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </section>

                <section className={styles.card}>
                    <h3 className={styles.label}>Danger</h3>
                    <p className={styles.helperText}>
                        If you want to remove your account, contact support or use the account deletion flow.
                    </p>
                </section>
            </main>
        </div>
    );
}
