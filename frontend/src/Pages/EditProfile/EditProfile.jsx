import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Context/UserContext";
import api from "../../Utils/api";
import { neonToast } from "../../Components/NeonToast/NeonToast";
import AsyncButton from "../../Components/AsyncButton/AsyncButton";
import styles from "./EditProfile.module.css";
import {
    FaUserEdit,
    FaCamera,
    FaSave,
    FaTimes,
    FaUser,
    FaEnvelope,
    FaExclamationTriangle,
} from "react-icons/fa";
import { MdPerson, MdImage, MdWarning } from "react-icons/md";
import SideBar from "../../Components/SideBar/SideBar";

export default function ProfileEdit() {
    const { user, refreshUser, login, getUser } = useUser();
    const navigate = useNavigate();
    const [form, setForm] = useState({ fullName: "", email: "" });
    const [profileImage, setProfileImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        setForm({ fullName: user.fullName || "", email: user.email || "" });
    }, [user, navigate]);

    const handleChange = (e) =>
        setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 10 * 1024 * 1024) {
                neonToast.error("Image size must be less than 10MB", "error");
                return;
            }
            // Validate file type
            if (!file.type.startsWith("image/")) {
                neonToast.error("Please select an image file", "error");
                return;
            }
            setProfileImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setProfileImage(null);
        setPreview(null);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const data = new FormData();
            data.append("full_name", form.fullName.trim());
            data.append("email", form.email.trim());
            if (profileImage) data.append("profile_pic", profileImage);

            const res = await api.patch("/api/users/edit/", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            getUser();

            neonToast.success("Profile updated successfully", "success");
            navigate("/profile");
        } catch (err) {
            console.error("Update error:", err);
            const errorMessage =
                err.response?.data?.detail ||
                err.response?.data?.message ||
                "Failed to update profile";
            neonToast.error(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (user.isAuthenticated === null) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user.isAuthenticated) return null;

    return (
        <div className={styles.editProfileContainer}>
            {/* Header */}
            <SideBar>
                <div className={styles.profileHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarContainer}>
                                <label htmlFor="profileImage" className={styles.avatarUpload}>
                                    {preview ? (
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className={styles.avatarImage}
                                        />
                                    ) : user.profilePicURL ? (
                                        <img
                                            src={user.profilePicURL}
                                            alt={user.fullName}
                                            className={styles.avatarImage}
                                            onError={(e) => {
                                                e.target.style.display = "none";
                                                e.target.nextElementSibling.style.display = "flex";
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`${styles.avatarFallback} ${(preview || user.profilePicURL) ? styles.hidden : ""
                                            }`}
                                    >
                                        <MdPerson />
                                    </div>
                                    <div className={styles.uploadOverlay}>
                                        <FaCamera />
                                        <span>Change Photo</span>
                                    </div>
                                </label>
                                <input
                                    id="profileImage"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className={styles.fileInput}
                                />
                                {preview && (
                                    <button
                                        type="button"
                                        className={styles.removeImageBtn}
                                        onClick={removeImage}
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                            <div className={styles.userInfo}>
                                <h1 className={styles.fullName}>
                                    <FaUserEdit /> Edit Profile
                                </h1>
                                <div className={styles.emailSection}>
                                    <FaEnvelope />
                                    <span className={styles.email}>{user.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className={styles.mainContent}>
                    {/* Edit Form Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <FaUserEdit className={styles.cardIcon} />
                                Personal Information
                            </h2>
                        </div>

                        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        <FaUser />
                                        <span>Full Name</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={form.fullName}
                                        onChange={handleChange}
                                        className={styles.formInput}
                                        placeholder="Enter your full name"
                                        maxLength={100}
                                    />
                                    <div className={styles.characterCount}>
                                        {form.fullName.length}/100 characters
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        <FaEnvelope />
                                        <span>Email Address</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        className={styles.formInput}
                                        placeholder="Enter your email"
                                    />
                                    <p className={styles.helperText}>
                                        Changing your email will require verification
                                    </p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        <MdImage />
                                        <span>Profile Photo</span>
                                    </label>
                                    <div className={styles.fileUploadContainer}>
                                        <label htmlFor="profileImage" className={styles.fileUploadBtn}>
                                            <FaCamera />
                                            <span>Choose Image</span>
                                        </label>
                                        <input
                                            id="profileImage"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className={styles.fileInput}
                                        />
                                        <p className={styles.helperText}>
                                            JPG, PNG, or GIF • Max 5MB
                                        </p>
                                        {preview && (
                                            <div className={styles.previewContainer}>
                                                <img
                                                    src={preview}
                                                    alt="Preview"
                                                    className={styles.imagePreview}
                                                />
                                                <button
                                                    type="button"
                                                    className={styles.previewRemoveBtn}
                                                    onClick={removeImage}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <AsyncButton
                                    onClick={handleSubmit}
                                    className={styles.primaryBtn}
                                    loading={isLoading}
                                    disabled={isLoading}
                                >
                                    <FaSave />
                                    <span>Save Changes</span>
                                </AsyncButton>

                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => navigate("/profile")}
                                    disabled={isLoading}
                                >
                                    <FaTimes />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    <div className={`${styles.card} ${styles.dangerZone}`}>
                        <div className={styles.cardHeader}>
                            <h2>
                                <MdWarning className={styles.dangerIcon} />
                                Danger Zone
                            </h2>
                        </div>
                        <div className={styles.dangerContent}>
                            <div className={styles.warningBox}>
                                <FaExclamationTriangle className={styles.warningIcon} />
                                <div className={styles.warningContent}>
                                    <h3>Account Deletion</h3>
                                    <p>
                                        Deleting your account will permanently remove all your data,
                                        including profile information, learning tasks, and projects.
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.dangerActions}>
                                <button
                                    type="button"
                                    className={styles.dangerBtn}
                                    onClick={() => navigate("/support")}
                                >
                                    Contact Support
                                </button>
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => navigate("/account/deletion")}
                                >
                                    Request Account Deletion
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </SideBar>
        </div>
    );
}