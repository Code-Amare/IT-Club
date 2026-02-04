import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    FaArrowLeft,
    FaCalendarAlt,
    FaUsers,
    FaUser,
    FaEnvelope,
    FaCalendarCheck,
    FaCalendarTimes,
    FaClock,
    FaIdBadge,
    FaFilter,
    FaCheckCircle,
    FaTimesCircle,
    FaHourglassHalf,
    FaEdit,
    FaTrash,
    FaLock,
    FaUnlock
} from "react-icons/fa";
import styles from "./SessionDetail.module.css";

export default function SessionDetail() {
    const { user } = useUser();
    const navigate = useNavigate();
    const { sessionId } = useParams();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // 'all', 'present', 'absent'
    const [searchTerm, setSearchTerm] = useState("");

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        absent: 0,
        pending: 0
    });

    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        fetchSessionDetail();
    }, [user, navigate, sessionId]);

    const fetchSessionDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/attendance/sessions/${sessionId}/`);
            const sessionData = res.data.session || res.data;
            console.log("Session data:", sessionData);
            setSession(sessionData);

            // Calculate initial stats (you might need to fetch attendance data separately)
            updateStats(sessionData.users || []);
        } catch (error) {
            console.error("Error fetching session:", error);
            setError("Failed to load session details. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (users) => {
        // This is a placeholder - you'll need to integrate with actual attendance data
        const total = users.length;
        const present = 0; // Get from attendance data
        const absent = 0; // Get from attendance data
        const pending = total - present - absent;

        setStats({ total, present, absent, pending });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCloseSession = async () => {
        if (!window.confirm("Are you sure you want to close this session? This will mark all unmarked users as absent.")) {
            return;
        }

        try {
            const res = await api.post(`/api/attendance/sessions/close/${sessionId}/`);
            if (res.status === 200) {
                setSession({ ...session, is_ended: true });
                // Refresh session data
                fetchSessionDetail();
            }
        } catch (error) {
            console.error("Error closing session:", error);
            setError("Failed to close session. Please try again.");
        }
    };

    const handleOpenSession = async () => {
        try {
            const res = await api.post(`/api/attendance/sessions/open/${sessionId}/`);
            if (res.status === 200) {
                setSession({ ...session, is_ended: false });
                // Refresh session data
                fetchSessionDetail();
            }
        } catch (error) {
            console.error("Error opening session:", error);
            setError("Failed to open session. Please try again.");
        }
    };

    const handleDeleteSession = async () => {
        if (!window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
            return;
        }

        try {
            await api.delete(`/api/attendance/sessions/${sessionId}/`);
            navigate("/admin/attendance/sessions");
        } catch (error) {
            console.error("Error deleting session:", error);
            setError("Failed to delete session. Please try again.");
        }
    };

    const filteredUsers = (session?.users || []).filter(user => {
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            return (
                user.full_name?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower) ||
                user.id?.toString().includes(searchTerm)
            );
        }
        return true;
    });

    const getStatusIcon = (user) => {
        // This is a placeholder - you'll need to integrate with actual attendance data
        const attendanceStatus = "pending"; // Get from attendance data

        switch (attendanceStatus) {
            case "present":
                return <FaCheckCircle className={styles.statusPresent} />;
            case "absent":
                return <FaTimesCircle className={styles.statusAbsent} />;
            default:
                return <FaHourglassHalf className={styles.statusPending} />;
        }
    };

    const getStatusText = (user) => {
        // This is a placeholder - you'll need to integrate with actual attendance data
        const attendanceStatus = "pending"; // Get from attendance data
        return attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1);
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Loading session details...</p>
                    </div>
                </SideBar>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.errorContainer}>
                        <h2>Session not found</h2>
                        <p>The requested session could not be found.</p>
                        <Link to="/admin/attendance/sessions" className={styles.backButton}>
                            <FaArrowLeft />
                            <span>Back to Sessions</span>
                        </Link>
                    </div>
                </SideBar>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <Link to="/admin/attendance/sessions" className={styles.backButton}>
                                <FaArrowLeft />
                            </Link>
                            <div>
                                <h1>{session.title}</h1>
                                <p>Session ID: {session.id}</p>
                            </div>
                        </div>

                        <div className={styles.headerActions}>
                            {!session.is_ended ? (
                                <button
                                    onClick={handleCloseSession}
                                    className={styles.closeBtn}
                                >
                                    <FaLock />
                                    <span>Close Session</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleOpenSession}
                                    className={styles.openBtn}
                                >
                                    <FaUnlock />
                                    <span>Open Session</span>
                                </button>
                            )}

                            <Link
                                to={`/admin/attendance/sessions/${sessionId}/edit`}
                                className={styles.editBtn}
                            >
                                <FaEdit />
                                <span>Edit</span>
                            </Link>

                            <button
                                onClick={handleDeleteSession}
                                className={styles.deleteBtn}
                            >
                                <FaTrash />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={styles.errorAlert}>
                        <span>{error}</span>
                        <button onClick={() => setError("")}>×</button>
                    </div>
                )}

                {/* Session Info Cards */}
                <div className={styles.infoCards}>
                    <div className={styles.infoCard}>
                        <div className={styles.cardIcon}>
                            <FaCalendarAlt />
                        </div>
                        <div>
                            <h3>Created</h3>
                            <p>{formatDate(session.created_at)}</p>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.cardIcon}>
                            {session.is_ended ? <FaCalendarTimes /> : <FaCalendarCheck />}
                        </div>
                        <div>
                            <h3>Status</h3>
                            <p className={session.is_ended ? styles.closed : styles.open}>
                                {session.is_ended ? "Closed" : "Open"}
                            </p>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.cardIcon}>
                            <FaUsers />
                        </div>
                        <div>
                            <h3>Participants</h3>
                            <p>{session.users?.length || 0} users</p>
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <div className={styles.cardIcon}>
                            <FaClock />
                        </div>
                        <div>
                            <h3>Session ID</h3>
                            <p className={styles.sessionId}>{session.id}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsSection}>
                    <h3>Attendance Statistics</h3>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statTotal}`}>
                                <FaUsers />
                            </div>
                            <div>
                                <h4>Total</h4>
                                <p>{stats.total}</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statPresent}`}>
                                <FaCheckCircle />
                            </div>
                            <div>
                                <h4>Present</h4>
                                <p>{stats.present}</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statAbsent}`}>
                                <FaTimesCircle />
                            </div>
                            <div>
                                <h4>Absent</h4>
                                <p>{stats.absent}</p>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.statPending}`}>
                                <FaHourglassHalf />
                            </div>
                            <div>
                                <h4>Pending</h4>
                                <p>{stats.pending}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Participants Section */}
                <div className={styles.participantsSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Participants ({session.users?.length || 0})</h2>

                        <div className={styles.controls}>
                            <div className={styles.searchBox}>
                                <FaFilter />
                                <input
                                    type="text"
                                    placeholder="Search participants..."
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
                                    All ({session.users?.length || 0})
                                </button>
                                <button
                                    className={`${styles.filterTab} ${filter === "present" ? styles.active : ""}`}
                                    onClick={() => setFilter("present")}
                                >
                                    Present ({stats.present})
                                </button>
                                <button
                                    className={`${styles.filterTab} ${filter === "absent" ? styles.active : ""}`}
                                    onClick={() => setFilter("absent")}
                                >
                                    Absent ({stats.absent})
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaUser />
                            <p>No participants found</p>
                        </div>
                    ) : (
                        <div className={styles.participantsGrid}>
                            {filteredUsers.map((participant) => (
                                <div key={participant.id} className={styles.participantCard}>
                                    <div className={styles.participantHeader}>
                                        <div className={styles.participantAvatar}>
                                            {participant.profile_pic_url ? (
                                                <img
                                                    src={participant.profile_pic_url}
                                                    alt={participant.full_name}
                                                />
                                            ) : (
                                                <FaUser />
                                            )}
                                        </div>
                                        <div className={styles.participantName}>
                                            <h4>{participant.full_name}</h4>
                                            <p className={styles.participantEmail}>
                                                <FaEnvelope />
                                                <span>{participant.email}</span>
                                            </p>
                                        </div>
                                        <div className={styles.participantStatus}>
                                            {getStatusIcon(participant)}
                                            <span>{getStatusText(participant)}</span>
                                        </div>
                                    </div>

                                    <div className={styles.participantDetails}>
                                        <div className={styles.detailItem}>
                                            <FaIdBadge />
                                            <span>ID: {participant.id}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <FaCalendarAlt />
                                            <span>Joined: {formatDate(participant.date_joined)}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <FaUser />
                                            <span>Role: {participant.role}</span>
                                        </div>
                                    </div>

                                    <div className={styles.participantMeta}>
                                        <span className={`${styles.metaBadge} ${participant.email_verified ? styles.verified : styles.unverified}`}>
                                            {participant.email_verified ? "Verified" : "Unverified"}
                                        </span>
                                        <span className={`${styles.metaBadge} ${participant.is_active ? styles.active : styles.inactive}`}>
                                            {participant.is_active ? "Active" : "Inactive"}
                                        </span>
                                        <span className={`${styles.metaBadge} ${participant.gender === "female" ? styles.female : styles.male}`}>
                                            {participant.gender}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
}