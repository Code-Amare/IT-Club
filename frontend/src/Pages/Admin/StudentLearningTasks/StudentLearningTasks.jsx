import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import SideBar from "../../../Components/SideBar/SideBar";
import LearningTaskCard from "../../../Components/LearningTaskCard/LearningTaskCard";
import {
    FaArrowLeft,
    FaUser,
    FaTasks,
    FaFilter,
    FaSearch,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaEye,
    FaComment,
    FaStar,
    FaCode,
    FaGraduationCap,
    FaBook
} from "react-icons/fa";
import {
    MdAssignment,
    MdOutlineFilterList,
    MdOutlineSort,
    MdClass
} from "react-icons/md";
import styles from "./StudentLearningTasks.module.css";

/* ---------------- COMPONENT ---------------- */
export default function StudentLearningTasks() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const [student, setStudent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    useEffect(() => {
        if (user == null) return;
        if (!user?.isAuthenticated) {
            navigate("/login");
            return;
        }

        if (user.role !== "admin") {
            navigate("/dashboard");
            return;
        }

        let mounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch student details
                const studentResponse = await api.get(`/api/management/student/${id}/`);

                if (!mounted) return;

                const studentData = studentResponse.data.student || studentResponse.data;
                setStudent(studentData || null);

                // Fetch student's learning tasks
                await fetchLearningTasks();
            } catch (error) {
                console.error("Error fetching student details:", error);
                neonToast.error("Failed to load student information", "error");
                navigate("/admin/students");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, [id, user, navigate]);

    const fetchLearningTasks = async () => {
        setLoadingTasks(true);
        try {
            const response = await api.get(`/api/learning-task/student/${id}/`);
            console.log("Learning tasks response:", response.data);

            if (response.data && Array.isArray(response.data.tasks)) {
                setTasks(response.data.tasks);
            } else {
                setTasks([]);
            }
        } catch (error) {
            console.error("Error fetching learning tasks:", error);
            neonToast.error("Failed to load learning tasks", "error");
            setTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    };

    // Helper function to get student data from nested structure
    const getStudentData = () => {
        if (!student) return {};

        const userData = student.profile?.user || {};
        const profileData = student.profile || {};

        return {
            ...userData,
            ...profileData,
            profile_pic_url: student.profile_pic_url,
            attendance_summary: student.attendance_summary,
            learning_tasks: student.learning_tasks,
            task_limit: student.task_limit,
            account_status: userData.is_active ? "active" : "inactive"
        };
    };

    // Map API task to LearningTaskCard format
    const mapTaskToCardFormat = (task) => {
        // Get the highest rating from reviews (for admin reviews)
        let rating = 0;
        let adminFeedback = "";

        if (task.reviews && task.reviews.length > 0) {
            // Find admin review if exists
            const adminReview = task.reviews.find(review => review.is_admin);
            if (adminReview) {
                rating = adminReview.rating;
                adminFeedback = adminReview.feedback || "";
            }
        }

        // Determine status
        let status = "submitted"; // default
        let grade = rating;

        if (task.status === "rated") {
            status = "graded";
            grade = rating;
        } else if (task.status === "draft") {
            status = "draft";
        } else if (task.status === "redo") {
            status = "redo";
        }

        // Format languages and frameworks
        const languages = task.languages?.map(lang => lang.name) || [];
        const frameworks = task.frameworks?.map(fw => fw.name) || [];

        // Format date
        const formatDate = (dateString) => {
            try {
                return new Date(dateString).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
            } catch {
                return dateString;
            }
        };

        return {
            id: task.id,
            title: task.title || "Untitled Task",
            description: task.description || "No description provided",
            status: status,
            grade: grade,
            languages: languages,
            frameworks: frameworks,
            githubLink: task.git_link,
            adminFeedback: adminFeedback,
            createdAt: formatDate(task.created_at),
            updatedAt: formatDate(task.updated_at),
            likesCount: task.likes_count || 0,
            isPublic: task.is_public || false,
            // Keep original data for detailed view
            rawData: task
        };
    };

    // Filter and sort tasks
    const getFilteredAndSortedTasks = () => {
        let filtered = tasks;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case "title":
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case "created_at":
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                case "updated_at":
                    aValue = new Date(a.updated_at);
                    bValue = new Date(b.updated_at);
                    break;
                case "rating":
                    const aRating = a.reviews && a.reviews[0] ? a.reviews[0].rating : 0;
                    const bRating = b.reviews && b.reviews[0] ? b.reviews[0].rating : 0;
                    aValue = aRating;
                    bValue = bRating;
                    break;
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
            }

            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    };

    const handleTaskView = (task) => {
        // Navigate to task detail page or open modal
        navigate(`/admin/learning-task/${task.id}`);
    };

    const handleTaskEdit = (task) => {
        // Navigate to edit page (admin can edit/grade tasks)
        navigate(`/admin/learning-task/${task.id}/grade`);
    };

    const handleTaskDelete = async (taskId) => {
        try {
            await api.delete(`/api/learning-task/${taskId}/`);
            neonToast.success("Task deleted successfully", "success");
            // Refresh tasks
            fetchLearningTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
            neonToast.error("Failed to delete task", "error");
        }
    };

    const getAverageRating = () => {
        if (tasks.length === 0) return 0;

        const ratedTasks = tasks.filter(task =>
            task.reviews && task.reviews.length > 0 && task.reviews[0].rating
        );

        if (ratedTasks.length === 0) return 0;

        const totalRating = ratedTasks.reduce((sum, task) => {
            return sum + (task.reviews[0].rating || 0);
        }, 0);

        return (totalRating / ratedTasks.length).toFixed(1);
    };

    const getStatusCount = (status) => {
        return tasks.filter(task => task.status === status).length;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner} />
                        <p>Loading student information...</p>
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

    const studentData = getStudentData();
    const filteredTasks = getFilteredAndSortedTasks();
    const averageRating = getAverageRating();

    return (
        <div className={styles.container}>
            <SideBar>
                {/* HEADER */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <Link to={`/admin/student/${id}`} className={styles.backLink}>
                            <FaArrowLeft /> Student detail
                        </Link>

                        <div className={styles.headerActions}>
                            <Link to={`/admin/student/${id}`} className={styles.viewProfileBtn}>
                                <FaUser /> View Profile
                            </Link>
                        </div>
                    </div>

                    <div className={styles.studentHeader}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatar}>
                                {studentData.profile_pic_url ? (
                                    <img
                                        src={studentData.profile_pic_url}
                                        alt={studentData.full_name}
                                        className={styles.avatarImage}
                                    />
                                ) : (
                                    <FaUser size={32} />
                                )}
                            </div>
                            <div className={styles.studentInfo}>
                                <h1>{studentData.full_name || "Unnamed Student"}</h1>
                                <p className={styles.studentEmail}>{studentData.email}</p>
                                <div className={styles.studentMeta}>
                                    <span className={styles.studentId}>ID: {studentData.id}</span>
                                    {studentData.grade && (
                                        <span className={styles.gradeBadge}>
                                            <FaGraduationCap /> Grade {studentData.grade}
                                        </span>
                                    )}
                                    {studentData.section && (
                                        <span className={styles.sectionBadge}>
                                            <MdClass /> Section {studentData.section}
                                        </span>
                                    )}
                                    {studentData.field && (
                                        <span className={styles.fieldBadge}>
                                            <FaBook /> {studentData.field.charAt(0).toUpperCase() + studentData.field.slice(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAGE TITLE */}
                <div className={styles.pageTitle}>
                    <h2><FaTasks /> Learning Tasks</h2>
                    <p className={styles.pageSubtitle}>
                        Viewing all learning tasks for {studentData.full_name}
                    </p>
                </div>

                {/* STATS OVERVIEW */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statTotal}`}>
                        <div className={styles.statIcon}>
                            <MdAssignment />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Total Tasks</h3>
                            <p className={styles.statNumber}>{tasks.length}</p>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statRating}`}>
                        <div className={styles.statIcon}>
                            <FaStar />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Average Rating</h3>
                            <p className={styles.statNumber}>{averageRating}<span className={styles.statSub}>/5</span></p>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statPublic}`}>
                        <div className={styles.statIcon}>
                            <FaEye />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Public Tasks</h3>
                            <p className={styles.statNumber}>
                                {tasks.filter(t => t.is_public).length}
                            </p>
                        </div>
                    </div>
                    <div className={`${styles.statCard} ${styles.statReviewed}`}>
                        <div className={styles.statIcon}>
                            <FaComment />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Reviewed Tasks</h3>
                            <p className={styles.statNumber}>
                                {tasks.filter(t => t.reviews && t.reviews.length > 0).length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* STATUS SUMMARY */}
                <div className={styles.statusSummary}>
                    <div className={styles.statusBadge}>
                        <span className={`${styles.statusDot} ${styles.statusDraft}`} />
                        <span className={styles.statusText}>Draft: {getStatusCount("draft")}</span>
                    </div>
                    <div className={styles.statusBadge}>
                        <span className={`${styles.statusDot} ${styles.statusSubmitted}`} />
                        <span className={styles.statusText}>Submitted: {getStatusCount("submitted")}</span>
                    </div>
                    <div className={styles.statusBadge}>
                        <span className={`${styles.statusDot} ${styles.statusRated}`} />
                        <span className={styles.statusText}>Rated: {getStatusCount("rated")}</span>
                    </div>
                    <div className={styles.statusSummaryInfo}>
                        Showing {filteredTasks.length} of {tasks.length} tasks
                    </div>
                </div>

                {/* FILTERS AND CONTROLS */}
                <div className={styles.controlsSection}>
                    <div className={styles.searchContainer}>
                        <div className={styles.searchBox}>
                            <FaSearch className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search tasks by title or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>

                    <div className={styles.filtersContainer}>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>
                                <MdOutlineFilterList />
                                Filter by Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="rated">Rated</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>
                                <MdOutlineSort />
                                Sort By
                            </label>
                            <div className={styles.sortControls}>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className={styles.sortSelect}
                                >
                                    <option value="created_at">Creation Date</option>
                                    <option value="updated_at">Last Updated</option>
                                    <option value="title">Title</option>
                                    <option value="rating">Rating</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                    className={styles.sortOrderBtn}
                                    title={sortOrder === "asc" ? "Ascending" : "Descending"}
                                >
                                    {sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />}
                                </button>
                            </div>
                        </div>

                        {(searchTerm || statusFilter !== "all") && (
                            <button
                                className={styles.clearFiltersBtn}
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("all");
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* TASKS LIST */}
                <div className={styles.tasksSection}>
                    {loadingTasks ? (
                        <div className={styles.loadingTasks}>
                            <div className={styles.loadingSpinner} />
                            <p>Loading learning tasks...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaTasks size={64} className={styles.emptyIcon} />
                            <h3>No Learning Tasks Found</h3>
                            <p>
                                {tasks.length === 0
                                    ? "This student hasn't created any learning tasks yet."
                                    : "No tasks match your current filters."}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.tasksGrid}>
                            {filteredTasks.map(task => (
                                <LearningTaskCard
                                    key={task.id}
                                    task={mapTaskToCardFormat(task)}
                                    isOwner={false} // Admin view, so not owner
                                    onView={handleTaskView}
                                    onEdit={handleTaskEdit}
                                    onDelete={handleTaskDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
}