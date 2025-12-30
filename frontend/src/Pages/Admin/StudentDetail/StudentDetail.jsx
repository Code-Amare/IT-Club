import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import SideBar from "../../../Components/SideBar/SideBar";
import ConfirmAction from "../../../Components/ConfirmAction/ConfirmAction";
import {
    FaArrowLeft, FaUser, FaPhone, FaCalendarAlt, FaEdit, FaTrash,
    FaGraduationCap, FaUsers, FaBook, FaChalkboardTeacher,
    FaChartLine, FaHistory, FaFileAlt, FaStar, FaCheckCircle,
    FaTimesCircle, FaExclamationTriangle
} from "react-icons/fa";
import {
    MdEmail, MdLocationOn, MdDateRange,
    MdClass, MdGrade, MdAssignment, MdSchool
} from "react-icons/md";
import styles from "./StudentDetail.module.css";

/* ---------------- MOCK DATA (OUTSIDE COMPONENT) ---------------- */
const MOCK_PERFORMANCE = {
    averageGrade: 86,
    completedTasks: 42,
    attendanceRate: 94,
    rank: 5
};

const MOCK_ACTIVITIES = [
    { type: "grade", description: "Math test graded: 88%", timestamp: "2025-01-12T09:30:00" },
    { type: "attendance", description: "Present in morning class", timestamp: "2025-01-11T08:10:00" },
    { type: "task", description: "Submitted Physics assignment", timestamp: "2025-01-10T16:45:00" },
    { type: "system", description: "Profile updated by admin", timestamp: "2025-01-09T14:20:00" }
];

/* ---------------- COMPONENT ---------------- */
export default function StudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingDelete, setLoadingDelete] = useState(false);

    const [performance] = useState(MOCK_PERFORMANCE);
    const [activities] = useState(MOCK_ACTIVITIES);

    useEffect(() => {
        // wait until user context is available
        if (user == null) return;
        if (!user?.isAuthenticated) {
            navigate("/login");
            return;
        }

        let mounted = true;
        const fetchStudentDetails = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/api/management/student/${id}/`);
                if (!mounted) return;
                setStudent(response.data.student || null);
            } catch (error) {
                console.error("Error fetching student details:", error);
                neonToast.error("Failed to load student details", "error");
                navigate("/admin/students");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchStudentDetails();
        return () => { mounted = false; };
    }, [id, user, navigate]);

    const handleDelete = async (_pendingEvent, reason) => {
        setLoadingDelete(true);
        try {
            // include reason if backend supports it (axios delete with data)
            await api.delete(`/api/management/students/${id}/`, { data: { reason } });
            neonToast.success("Student deleted successfully", "success");
            navigate("/admin/students");
            return true;
        } catch (error) {
            console.error("Error deleting student:", error);
            neonToast.error("Failed to delete student", "error");
            return false;
        } finally {
            setLoadingDelete(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return "Not specified";
        try {
            return new Date(date).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric"
            });
        } catch {
            return date;
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner} />
                        <p>Loading student details...</p>
                    </div>
                </SideBar>
            </div>
        );
    }

    if (!student) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.notFound}>
                        <h2>Student not found</h2>
                        <p>The student you're looking for doesn't exist.</p>
                        <Link to="/admin/students" className={styles.backBtn}>
                            <FaArrowLeft /> Back to Students
                        </Link>
                    </div>
                </SideBar>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SideBar>

                {/* HEADER */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <Link to="/admin/students" className={styles.backLink}>
                            <FaArrowLeft /> Back to Students
                        </Link>

                        <div className={styles.headerActions}>
                            <button
                                className={styles.editBtn}
                                onClick={() => navigate(`/admin/student/edit/${id}/`)}
                            >
                                <FaEdit /> Edit Student
                            </button>

                            <ConfirmAction
                                title="Delete Student"
                                message={`You are about to delete ${student.full_name || "this student"}. This action cannot be undone.`}
                                confirmText={loadingDelete ? "Deleting..." : "Delete"}
                                cancelText="Cancel"
                                requireReason={false}
                                onConfirm={handleDelete}
                            >
                                <button className={styles.deleteBtn}>
                                    <FaTrash /> Delete
                                </button>
                            </ConfirmAction>
                        </div>
                    </div>

                    <div className={styles.studentHeader}>
                        <div className={styles.avatar}>
                            {student.full_name?.charAt(0) || "S"}
                        </div>
                        <div className={styles.studentInfo}>
                            <h1>{student.full_name || "Unnamed Student"}</h1>
                            <div className={styles.studentMeta}>
                                <span className={styles.studentId}>ID: {student.id}</span>
                                <span className={`${styles.status} ${styles[student.account_status || "pending"]}`}>
                                    {student.account_status === "active" ? <><FaCheckCircle /> Active</> :
                                        student.account_status === "inactive" ? <><FaTimesCircle /> Inactive</> :
                                            <><FaExclamationTriangle /> Pending</>}
                                </span>
                                <span className={styles.gradeBadge}><FaGraduationCap /> Grade {student.grade ?? "N/A"}</span>
                                <span className={styles.sectionBadge}><MdClass /> Section {student.section ?? "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className={styles.statsGrid}>
                    <Stat title="Average Grade" value={performance.averageGrade ?? "N/A"} icon={<MdGrade />} />
                    <Stat title="Completed Tasks" value={performance.completedTasks ?? 0} icon={<MdAssignment />} />
                    <Stat title="Attendance Rate" value={`${performance.attendanceRate ?? 0}%`} icon={<FaChartLine />} />
                    <Stat title="Class Rank" value={performance.rank ?? "N/A"} icon={<FaStar />} />
                </div>

                {/* CONTENT */}
                <div className={styles.contentGrid}>
                    <div className={styles.leftColumn}>
                        <InfoCard title="Personal Information" icon={<FaUser />}>
                            <Info label="Email Address" value={student.email} icon={<MdEmail />} />
                            {student.phone_number && <Info label="Phone Number" value={student.phone_number} icon={<FaPhone />} />}
                            {student.address && <Info label="Address" value={student.address} icon={<MdLocationOn />} />}
                            <Info label="Date of Birth" value={student.date_of_birth ? formatDate(student.date_of_birth) : "Not specified"} icon={<FaCalendarAlt />} />
                            <Info label="Joined Date" value={formatDate(student.created_at || student.date_joined)} icon={<MdDateRange />} />
                            {student.parent_name && <Info label="Parent/Guardian" value={student.parent_name} icon={<FaUsers />} />}
                            <Info label="Gender" value={student.gender.charAt(0).toUpperCase() + student.gender.slice(1)} icon={<MdDateRange />} />
                        </InfoCard>

                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}><MdSchool /> Academic Information</h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaGraduationCap /></div>
                                    <div>
                                        <label>Grade Level</label>
                                        <p>{student.grade ?? "N/A"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><MdClass /></div>
                                    <div>
                                        <label>Section</label>
                                        <p>{student.section ?? "N/A"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaBook /></div>
                                    <div>
                                        <label>Academic Year</label>
                                        <p>{student.academic_year || "2024-2025"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaChalkboardTeacher /></div>
                                    <div>
                                        <label>Homeroom Teacher</label>
                                        <p>{student.homeroom_teacher || "Not assigned"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightColumn}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}><FaHistory /> Recent Activities</h2>
                                <button className={styles.viewAllBtn} onClick={() => navigate(`/admin/students/${id}/activities`)}>
                                    View All
                                </button>
                            </div>

                            <div className={styles.activitiesList}>
                                {activities.length > 0 ? (
                                    activities.slice(0, 5).map((activity, idx) => (
                                        <div key={idx} className={styles.activityItem}>
                                            <div className={styles.activityIcon}>
                                                {activity.type === "task" && <MdAssignment />}
                                                {activity.type === "attendance" && <FaCheckCircle />}
                                                {activity.type === "grade" && <MdGrade />}
                                                {activity.type === "system" && <FaUser />}
                                            </div>
                                            <div className={styles.activityContent}>
                                                <p className={styles.activityText}>{activity.description}</p>
                                                <span className={styles.activityTime}>
                                                    {formatDate(activity.timestamp)} • {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyActivities}>
                                        <FaHistory />
                                        <p>No recent activities</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}><FaFileAlt /> Notes</h2>
                            {student.notes ? (
                                <div className={styles.notesContent}>
                                    <p>{student.notes}</p>
                                    <div className={styles.notesMeta}>
                                        <span>Last updated: {formatDate(student.updated_at)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.emptyNotes}>
                                    <p>No notes added yet.</p>
                                    <button className={styles.addNoteBtn} onClick={() => navigate(`/admin/student/edit/${id}/`)}>
                                        Add Note
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
}

/* ---------------- SMALL HELPERS ---------------- */

function Stat({ title, value, icon }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statContent}>
                <h3>{title}</h3>
                <p className={styles.statNumber}>{value}</p>
            </div>
        </div>
    );
}

function InfoCard({ title, icon, children }) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>{icon} {title}</h2>
            <div className={styles.infoGrid}>{children}</div>
        </div>
    );
}

function Info({ label, value, icon }) {
    return (
        <div className={styles.infoItem}>
            <div className={styles.infoIcon}>{icon}</div>
            <div>
                <label>{label}</label>
                <p>{value || "Not specified"}</p>
            </div>
        </div>
    );
}
