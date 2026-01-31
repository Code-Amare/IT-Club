import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    FaUsers,
    FaUserPlus,
    FaUpload,
} from "react-icons/fa";
import styles from "./Students.module.css";

export default function Students() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        fetchStats();
    }, [user, navigate]);

    const fetchStats = async () => {
        try {
            const res = await api.get("/api/management/students/stats/");
            setStats(res.data.overall || stats);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaUsers />
                            <div>
                                <h1>Students</h1>
                                <p>Manage student accounts</p>
                            </div>
                        </div>

                        <div className={styles.headerActions}>
                            <Link to="/admin/students/bulk" className={styles.secondaryBtn}>
                                <FaUpload />
                                <span>Bulk Upload</span>
                            </Link>

                            <Link to="/admin/student/add" className={styles.primaryBtn}>
                                <FaUserPlus />
                                <span>Add Student</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <h3>Total Students</h3>
                        <p>{stats.total}</p>
                    </div>

                    <div className={styles.statCard}>
                        <h3>Active</h3>
                        <p>{stats.active}</p>
                    </div>

                    <div className={styles.statCard}>
                        <h3>Inactive</h3>
                        <p>{stats.inactive}</p>
                    </div>
                </div>
            </SideBar>
        </div>
    );
}
