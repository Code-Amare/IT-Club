import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import SideBar from "../../../Components/SideBar/SideBar";
import AttendanceSessionCard from "../../../Components/AttendanceSessionCard/AttendanceSessionCard";
import {
    FaCalendarPlus,
    FaFilter,
    FaSync,
    FaCalendarAlt,
    FaChartBar,
    FaSearch
} from "react-icons/fa";
import styles from "./AttendanceList.module.css";

export default function AttendanceList() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // 'all', 'open', 'closed'
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        closed: 0
    });

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/attendance/sessions/");
            const sessionsData = res.data || [];
            setSessions(sessionsData);

            // Calculate stats
            const openSessions = sessionsData.filter(s => !s.is_ended);
            const closedSessions = sessionsData.filter(s => s.is_ended);

            setStats({
                total: sessionsData.length,
                open: openSessions.length,
                closed: closedSessions.length
            });
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSessions = sessions.filter(session => {
        // Apply status filter
        if (filter === "open" && session.is_ended) return false;
        if (filter === "closed" && !session.is_ended) return false;

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
                session.title.toLowerCase().includes(searchLower) ||
                session.id.toString().includes(searchTerm)
            );
        }

        return true;
    });

    const getSortedSessions = () => {
        return [...filteredSessions].sort((a, b) => {
            // Put open sessions first, then sort by creation date (newest first)
            if (a.is_ended !== b.is_ended) {
                return a.is_ended ? 1 : -1;
            }
            return new Date(b.created_at) - new Date(a.created_at);
        });
    };

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaCalendarAlt />
                            <div>
                                <h1>Attendance Sessions</h1>
                                <p>Manage and monitor attendance sessions</p>
                            </div>
                        </div>

                        <div className={styles.headerActions}>
                            <button
                                onClick={fetchSessions}
                                className={styles.secondaryBtn}
                                disabled={loading}
                            >
                                <FaSync className={loading ? styles.spin : ""} />
                                <span>Refresh</span>
                            </button>

                            <Link to="/admin/attendance/create/" className={styles.primaryBtn}>
                                <FaCalendarPlus />
                                <span>New Session</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <FaCalendarAlt />
                        </div>
                        <div>
                            <h3>Total Sessions</h3>
                            <p>{stats.total}</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.statOpen}`}>
                        <div className={styles.statIcon}>
                            <div className={styles.openDot} />
                        </div>
                        <div>
                            <h3>Open Sessions</h3>
                            <p>{stats.open}</p>
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.statClosed}`}>
                        <div className={styles.statIcon}>
                            <div className={styles.closedDot} />
                        </div>
                        <div>
                            <h3>Closed Sessions</h3>
                            <p>{stats.closed}</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <FaChartBar />
                        </div>
                        <div>
                            <h3>Avg Participants</h3>
                            <p>
                                {sessions.length > 0
                                    ? Math.round(
                                        sessions.reduce((acc, s) => acc + (s.targets?.length || 0), 0) /
                                        sessions.length
                                    )
                                    : 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search sessions by title or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filterTabs}>
                        <button
                            className={`${styles.filterTab} ${filter === "all" ? styles.active : ""}`}
                            onClick={() => setFilter("all")}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            className={`${styles.filterTab} ${filter === "open" ? styles.active : ""}`}
                            onClick={() => setFilter("open")}
                        >
                            Open ({stats.open})
                        </button>
                        <button
                            className={`${styles.filterTab} ${filter === "closed" ? styles.active : ""}`}
                            onClick={() => setFilter("closed")}
                        >
                            Closed ({stats.closed})
                        </button>
                    </div>
                </div>

                {/* Sessions List */}
                <div className={styles.sessionsSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Attendance Sessions</h2>
                        <span className={styles.sessionCount}>
                            {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p>Loading sessions...</p>
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaCalendarAlt />
                            <h3>No sessions found</h3>
                            <p>
                                {searchTerm || filter !== "all"
                                    ? "Try adjusting your search or filter"
                                    : "Create your first attendance session to get started"}
                            </p>
                            {(!searchTerm && filter === "all") && (
                                <Link to="/admin/attendance/sessions/new" className={styles.primaryBtn}>
                                    <FaCalendarPlus />
                                    <span>Create Session</span>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className={styles.sessionsGrid}>
                            {getSortedSessions().map((session) => (
                                <AttendanceSessionCard key={session.id} session={session} />
                            ))}
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
}