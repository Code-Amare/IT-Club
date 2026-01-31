import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import SideBar from "../../../Components/SideBar/SideBar";
import ConfirmAction from "../../../Components/ConfirmAction/ConfirmAction";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import {
    FaArrowLeft, FaUser, FaPhone, FaCalendarAlt, FaEdit, FaTrash,
    FaGraduationCap, FaUsers, FaBook, FaChalkboardTeacher,
    FaChartLine, FaHistory, FaFileAlt, FaStar, FaCheckCircle,
    FaTimesCircle, FaExclamationTriangle, FaTasks, FaCamera
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
                console.log(response.data.student)
                if (!mounted) return;

                // Handle both response structures
                const studentData = response.data.student || response.data;
                setStudent(studentData || null);
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

    const handleDelete = async (event, typedName) => {
        if (!student) return false;

        if (typedName !== student.full_name) {
            neonToast.error(
                `The name you typed does not match the student's full name. Please type "${student.full_name}" exactly to delete.`,
                "error"
            );
            return false;
        }

        setLoadingDelete(true);
        try {
            await api.delete(`/api/management/student/delete/${id}/`);
            neonToast.success("Student deleted successfully", "success");
            navigate("/admin/students");
            return true;
        } catch (error) {
            console.error("Error deleting student:", error);

            if (error.response?.status === 404) {
                neonToast.error("Student not found", "error");
            } else if (error.response?.data?.detail) {
                neonToast.error(error.response.data.detail, "error");
            } else {
                neonToast.error("Failed to delete student", "error");
            }
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

    // Get task limit from student data
    const getTaskLimit = () => {
        if (!student) return 0;

        // Check for task_limit object structure or direct value
        if (student.task_limit && typeof student.task_limit === 'object') {
            return student.task_limit.limit || 0;
        }

        return student.task_limit || 0;
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

    const taskLimit = getTaskLimit();

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
                                message={`Are you sure you want to delete this student? This action cannot be undone. To confirm, please type the student's full name exactly as shown below:`}
                                confirmText="Delete Student"
                                cancelText="Cancel"
                                requireReason={true}
                                placeholder={`Type: "${student.full_name}"`}
                                onConfirm={handleDelete}
                            >
                                <AsyncButton
                                    className={styles.deleteBtn}
                                    loading={loadingDelete}
                                    disabled={loadingDelete}
                                >
                                    <FaTrash /> Delete Student
                                </AsyncButton>
                            </ConfirmAction>
                        </div>
                    </div>

                    <div className={styles.studentHeader}>
                        <div className={styles.avatar}>
                            {student.profile_pic_url ? (
                                <img
                                    src={student.profile_pic_url}
                                    alt={student.full_name}
                                    className={styles.avatarImage}
                                />
                            ) : (
                                <FaUser size={32} />
                            )}
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
                                {student.grade && (
                                    <span className={styles.gradeBadge}>
                                        <FaGraduationCap /> Grade {student.grade}
                                    </span>
                                )}
                                {student.section && (
                                    <span className={styles.sectionBadge}>
                                        <MdClass /> Section {student.section}
                                    </span>
                                )}
                                {student.field && (
                                    <span className={styles.fieldBadge}>
                                        <FaBook /> {student.field.charAt(0).toUpperCase() + student.field.slice(1)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <MdGrade />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Average Grade</h3>
                            <p className={styles.statNumber}>{performance.averageGrade ?? "N/A"}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <MdAssignment />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Completed Tasks</h3>
                            <p className={styles.statNumber}>{performance.completedTasks ?? 0}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <FaChartLine />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Attendance Rate</h3>
                            <p className={styles.statNumber}>{performance.attendanceRate ?? 0}%</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <FaStar />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Class Rank</h3>
                            <p className={styles.statNumber}>{performance.rank ?? "N/A"}</p>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className={styles.contentGrid}>
                    <div className={styles.leftColumn}>
                        {/* Personal Information Card */}
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}><FaUser /> Personal Information</h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><MdEmail /></div>
                                    <div>
                                        <label>Email Address</label>
                                        <p>{student.email || "Not specified"}</p>
                                    </div>
                                </div>
                                {student.phone_number && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}><FaPhone /></div>
                                        <div>
                                            <label>Phone Number</label>
                                            <p>{student.phone_number}</p>
                                        </div>
                                    </div>
                                )}
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaUser /></div>
                                    <div>
                                        <label>Gender</label>
                                        <p>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "Not specified"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaUser /></div>
                                    <div>
                                        <label>Account Identifier</label>
                                        <p>{student.account || "N/A"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><MdDateRange /></div>
                                    <div>
                                        <label>Joined Date</label>
                                        <p>{formatDate(student.created_at || student.date_joined)}</p>
                                    </div>
                                </div>
                                {student.profile_pic_url && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}><FaCamera /></div>
                                        <div>
                                            <label>Profile Picture</label>
                                            <p className={styles.profilePicUrl}>
                                                <img
                                                    src={student.profile_pic_url}
                                                    alt="Profile"
                                                    className={styles.profilePicThumb}
                                                />
                                                <span>Uploaded</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Academic Information Card */}
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
                                        <label>Field of Study</label>
                                        <p>{student.field ? student.field.charAt(0).toUpperCase() + student.field.slice(1) : "Not specified"}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={styles.infoIcon}><FaBook /></div>
                                    <div>
                                        <label>Academic Year</label>
                                        <p>{student.academic_year || "2024-2025"}</p>
                                    </div>
                                </div>
                                {student.homeroom_teacher && (
                                    <div className={styles.infoItem}>
                                        <div className={styles.infoIcon}><FaChalkboardTeacher /></div>
                                        <div>
                                            <label>Homeroom Teacher</label>
                                            <p>{student.homeroom_teacher}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Task Limit Card */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}><FaTasks /> Task Limit</h2>
                                <button
                                    className={styles.editLimitBtn}
                                    onClick={() => navigate(`/admin/student/edit/${id}/`)}
                                >
                                    <FaEdit /> Edit
                                </button>
                            </div>
                            <div className={styles.taskLimitDisplay}>
                                <div className={styles.taskLimitValue}>{taskLimit}</div>
                                <p className={styles.taskLimitDescription}>
                                    Maximum number of tasks this student can be assigned.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightColumn}>
                        {/* Recent Activities Card */}
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

                        {/* Notes Card */}
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
                                    <button
                                        className={styles.addNoteBtn}
                                        onClick={() => navigate(`/admin/student/edit/${id}/`)}
                                    >
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