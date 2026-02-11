import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import SideBar from "../../../Components/SideBar/SideBar"; // <-- now using SideBar
import {
    FaBullhorn,
    FaStar,
    FaRegStar,
    FaUser,
    FaCalendarAlt,
    FaExclamationTriangle
} from "react-icons/fa";
import styles from "./UserAnnouncements.module.css";

export default function UserAnnouncements() {
    const { user } = useUser();
    const navigate = useNavigate();

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        fetchAnnouncements();
    }, [user, navigate]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/announcement/user/");
            const data = res.data.announcements || [];
            console.log(data)
            setAnnouncements(data);
        } catch (err) {
            console.error("Error fetching announcements:", err);
            if (err.response?.status === 404) {
                setAnnouncements([]);
            } else {
                setError("Failed to load announcements. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getProfilePic = (creator) => {
        return creator?.profile_pic_url || null;
    };

    const getCreatorName = (creator) => {
        return creator?.full_name || creator?.username || creator?.email || "Unknown";
    };

    const sortedAnnouncements = [...announcements].sort((a, b) => {
        const dateA = new Date(a.announcement_date || a.created_at);
        const dateB = new Date(b.announcement_date || b.created_at);
        return dateB - dateA;
    });

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <h1>
                        <FaBullhorn /> Announcements
                    </h1>
                    <p>Stay updated with the latest news</p>
                </div>

                {/* Error message */}
                {error && (
                    <div className={styles.error}>
                        <FaExclamationTriangle />
                        <span>{error}</span>
                    </div>
                )}

                {/* Loading state */}
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Loading announcements...</p>
                    </div>
                ) : sortedAnnouncements.length === 0 ? (
                    <div className={styles.empty}>
                        <FaBullhorn />
                        <h3>No announcements yet</h3>
                        <p>You don’t have any announcements at the moment.</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {sortedAnnouncements.map((announcement) => (
                            <div
                                key={announcement.id}
                                className={`${styles.card} ${announcement.is_important ? styles.importantCard : ""
                                    }`}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.titleWrapper}>
                                        <h3 className={styles.title}>{announcement.title}</h3>
                                        {announcement.is_important ? (
                                            <FaStar className={styles.starIcon} />
                                        ) : (
                                            <FaRegStar className={styles.starOutline} />
                                        )}
                                    </div>
                                </div>

                                <div className={styles.cardBody}>
                                    <div className={styles.metaItem}>
                                        <FaCalendarAlt />
                                        <span>{formatDate(announcement.announcement_date)}</span>
                                    </div>

                                    <div className={styles.creator}>
                                        <div className={styles.creatorAvatar}>
                                            {getProfilePic(announcement.created_by) ? (
                                                <img
                                                    src={getProfilePic(announcement.created_by)}
                                                    alt={getCreatorName(announcement.created_by)}
                                                    className={styles.avatarImage}
                                                />
                                            ) : (
                                                <div className={styles.avatarPlaceholder}>
                                                    <FaUser />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.creatorInfo}>
                                            <span className={styles.creatorLabel}>Posted by</span>
                                            <span className={styles.creatorName}>
                                                {getCreatorName(announcement.created_by)}
                                            </span>
                                        </div>
                                    </div>

                                    {announcement.created_at !== announcement.updated_at && (
                                        <div className={styles.updatedAt}>
                                            Updated: {formatDate(announcement.updated_at)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SideBar>
        </div>
    );
}