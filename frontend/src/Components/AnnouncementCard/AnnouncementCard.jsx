import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../Utils/api";
import {
    FaStar,
    FaRegStar,
    FaEdit,
    FaTrash,
    FaUser,
    FaCalendarAlt,
    FaUsers
} from "react-icons/fa";
import styles from "./AnnouncementCard.module.css";

export default function AnnouncementCard({ announcement, onUpdate }) {
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const formattedDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/api/announcement/${announcement.id}/`);
            onUpdate(); // refresh list
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className={`${styles.card} ${announcement.is_important ? styles.important : ""}`}>
            <div className={styles.header}>
                <div className={styles.titleWrapper}>
                    <h3 className={styles.title}>{announcement.title}</h3>
                    {announcement.is_important ? (
                        <FaStar className={styles.starIcon} />
                    ) : (
                        <FaRegStar className={styles.starOutline} />
                    )}
                </div>
                <div className={styles.actions}>
                    <Link
                        to={`/admin/announcement/edit/${announcement.id}/`}
                        className={styles.editBtn}
                    >
                        <FaEdit />
                    </Link>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className={styles.deleteBtn}
                        disabled={deleting}
                    >
                        <FaTrash />
                    </button>
                </div>
            </div>

            <div className={styles.details}>
                <div className={styles.detailItem}>
                    <FaCalendarAlt />
                    <span>{formattedDate(announcement.announcement_date)}</span>
                </div>
                <div className={styles.detailItem}>
                    <FaUser />
                    <span>{announcement.created_by?.full_name || announcement.created_by?.username || "Unknown"}</span>
                </div>
                <div className={styles.detailItem}>
                    <FaUsers />
                    <span>{announcement.users?.length || 0} recipients</span>
                </div>
            </div>

            {showConfirm && (
                <div className={styles.confirmOverlay}>
                    <div className={styles.confirmDialog}>
                        <p>Delete this announcement?</p>
                        <div className={styles.confirmActions}>
                            <button onClick={handleDelete} disabled={deleting}>
                                {deleting ? "Deleting..." : "Yes"}
                            </button>
                            <button onClick={() => setShowConfirm(false)}>No</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}