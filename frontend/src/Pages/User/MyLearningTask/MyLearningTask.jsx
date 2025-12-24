import styles from "./MyLearningTask.module.css";
import SideBar from "../../../Components/SideBar/SideBar";
import { useState, useEffect } from "react";
import {
    FaPlus,
    FaTasks,
    FaEdit,
    FaTrash,
    FaClock,
    FaCheckCircle,
    FaStar,
    FaCodeBranch,
    FaExclamationTriangle,
} from "react-icons/fa";
import { FiGitPullRequest, FiLock } from "react-icons/fi";

const MyLearningTask = () => {
    // Mock data for student's learning tasks
    const [learningTasks, setLearningTasks] = useState([
        {
            id: 1,
            title: "Database Entity Creation",
            description: "Building a complete database system with entities, relationships, and migrations",
            githubLink: "https://github.com/john/database-project",
            language: "JavaScript",
            frameworks: ["Node.js", "Sequelize", "PostgreSQL"],
            status: "submitted", // draft, submitted, graded, locked
            grade: 0,
            adminFeedback: "",
            createdAt: "2024-01-15",
            adminEditable: false,
        },
        {
            id: 2,
            title: "React E-commerce Dashboard",
            description: "Creating a responsive admin dashboard with charts and analytics",
            githubLink: "",
            language: "TypeScript",
            frameworks: ["React", "Redux", "Tailwind CSS"],
            status: "draft",
            grade: 0,
            adminFeedback: "",
            createdAt: "2024-01-20",
            adminEditable: false,
        },
        {
            id: 3,
            title: "Authentication System",
            description: "JWT-based authentication with refresh tokens and role-based access",
            githubLink: "https://github.com/john/auth-system",
            language: "Python",
            frameworks: ["Django", "Django REST", "PostgreSQL"],
            status: "graded",
            grade: 4.5,
            adminFeedback: "Great implementation! Consider adding rate limiting for security.",
            createdAt: "2024-01-10",
            adminEditable: true,
        },
        {
            id: 4,
            title: "Real-time Chat Application",
            description: "WebSocket-based chat with rooms, user presence, and file sharing",
            githubLink: "https://github.com/john/chat-app",
            language: "JavaScript",
            frameworks: ["Socket.io", "Express", "React"],
            status: "locked",
            grade: 4.8,
            adminFeedback: "Excellent real-time implementation! Production ready.",
            createdAt: "2024-01-05",
            adminEditable: false,
        },
    ]);

    // Task limit configuration
    const [taskLimit, setTaskLimit] = useState(5); // Max tasks per student
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Mock fetch to check task limit and current count
    useEffect(() => {
        const fetchTaskLimit = async () => {
            setIsLoading(true);
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mock API response
            const mockResponse = {
                maxTasksPerStudent: 5,
                currentTaskCount: learningTasks.length,
                canCreateMore: learningTasks.length < 5
            };

            setTaskLimit(mockResponse.maxTasksPerStudent);
            setIsLoading(false);
        };

        fetchTaskLimit();
    }, [learningTasks.length]);

    // Get status badge with appropriate styling
    const getStatusBadge = (status, grade) => {
        const badges = {
            draft: {
                text: "Draft",
                icon: <FaEdit />,
                className: styles.badgeDraft,
            },
            submitted: {
                text: "Under Review",
                icon: <FaClock />,
                className: styles.badgeSubmitted,
            },
            graded: {
                text: `Graded: ${grade}/5`,
                icon: <FaStar />,
                className: styles.badgeGraded,
            },
            locked: {
                text: "Locked",
                icon: <FiLock />,
                className: styles.badgeLocked,
            },
        };

        const badge = badges[status] || badges.draft;
        return (
            <span className={`${styles.statusBadge} ${badge.className}`}>
                {badge.icon}
                <span>{badge.text}</span>
            </span>
        );
    };

    // Check if task can be edited
    const canEditTask = (task) => {
        if (task.status === "locked") return false;
        if (task.status === "graded" && !task.adminEditable) return false;
        return task.status === "draft" || task.status === "submitted";
    };

    // Handle task creation
    const handleCreateTask = () => {
        if (learningTasks.length >= taskLimit) {
            alert(`You have reached the maximum limit of ${taskLimit} learning tasks.`);
            return;
        }
        setShowCreateForm(true);
    };

    // Handle task deletion (only for drafts)
    const handleDeleteTask = (taskId) => {
        const task = learningTasks.find(t => t.id === taskId);
        if (task.status !== "draft") {
            alert("Only draft tasks can be deleted.");
            return;
        }

        if (window.confirm("Are you sure you want to delete this draft task?")) {
            setLearningTasks(tasks => tasks.filter(t => t.id !== taskId));
        }
    };

    // Render task card
    const renderTaskCard = (task) => {
        return (
            <div key={task.id} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                    <div className={styles.taskTitleSection}>
                        <h3>{task.title}</h3>
                        {getStatusBadge(task.status, task.grade)}
                    </div>
                    <div className={styles.taskActions}>
                        {canEditTask(task) && (
                            <button
                                className={styles.actionBtn}
                                onClick={() => console.log("Edit task", task.id)}
                            >
                                <FaEdit />
                            </button>
                        )}
                        {task.status === "draft" && (
                            <button
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={() => handleDeleteTask(task.id)}
                            >
                                <FaTrash />
                            </button>
                        )}
                    </div>
                </div>

                <p className={styles.taskDescription}>{task.description}</p>

                <div className={styles.taskMeta}>
                    <div className={styles.metaItem}>
                        <strong>Language:</strong>
                        <span className={styles.languageTag}>{task.language}</span>
                    </div>
                    {task.frameworks.length > 0 && (
                        <div className={styles.metaItem}>
                            <strong>Frameworks:</strong>
                            <div className={styles.frameworkTags}>
                                {task.frameworks.map((fw, index) => (
                                    <span key={index} className={styles.frameworkTag}>
                                        {fw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {task.githubLink && (
                    <a
                        href={task.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.githubLink}
                    >
                        <FiGitPullRequest />
                        View on GitHub
                    </a>
                )}

                {task.status === "graded" || task.status === "locked" ? (
                    <div className={styles.gradeSection}>
                        <div className={styles.gradeDisplay}>
                            <FaStar className={styles.starIcon} />
                            <span className={styles.gradeValue}>{task.grade}/5</span>
                        </div>
                        {task.adminFeedback && (
                            <div className={styles.feedbackSection}>
                                <strong>Admin Feedback:</strong>
                                <p>{task.adminFeedback}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={styles.createdInfo}>
                        <FaClock />
                        Created: {task.createdAt}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.MyLearningTaskContainer}>
            <SideBar>
                <div className={styles.MyLearningTask}>
                    <header className={styles.header}>
                        <div className={styles.headerContent}>
                            <div>
                                <h1>My Learning Tasks</h1>
                                <p className={styles.subtitle}>
                                    Create, manage, and track your personalized learning journey
                                </p>
                            </div>

                            {/* Task Limit Indicator */}
                            <div className={styles.taskLimitCard}>
                                <div className={styles.limitInfo}>
                                    <FaTasks className={styles.limitIcon} />
                                    <div className={styles.limitText}>
                                        <span className={styles.limitCount}>
                                            {learningTasks.length}/{taskLimit}
                                        </span>
                                        <span className={styles.limitLabel}>Learning Tasks</span>
                                    </div>
                                </div>
                                {learningTasks.length >= taskLimit && (
                                    <div className={styles.limitWarning}>
                                        <FaExclamationTriangle />
                                        <span>Limit reached</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Create Task Button */}
                        <button
                            className={styles.createTaskBtn}
                            onClick={handleCreateTask}
                            disabled={learningTasks.length >= taskLimit || isLoading}
                        >
                            <FaPlus />
                            <span>Create Learning Task</span>
                        </button>
                    </header>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Checking your task limit...</p>
                        </div>
                    ) : (
                        <>
                            {/* Task Limit Alert */}
                            {learningTasks.length >= taskLimit && (
                                <div className={styles.alertBox}>
                                    <FaExclamationTriangle className={styles.alertIcon} />
                                    <div>
                                        <strong>Task Limit Reached</strong>
                                        <p>
                                            You have reached the maximum limit of {taskLimit} learning tasks.
                                            Please complete or delete existing tasks before creating new ones.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Task Stats */}
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                        <FaTasks />
                                    </div>
                                    <div className={styles.statContent}>
                                        <h3>Total Tasks</h3>
                                        <p className={styles.statValue}>{learningTasks.length}</p>
                                    </div>
                                </div>

                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                        <FaCheckCircle />
                                    </div>
                                    <div className={styles.statContent}>
                                        <h3>Graded</h3>
                                        <p className={styles.statValue}>
                                            {learningTasks.filter(t => t.status === 'graded' || t.status === 'locked').length}
                                        </p>
                                    </div>
                                </div>

                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                        <FaClock />
                                    </div>
                                    <div className={styles.statContent}>
                                        <h3>In Review</h3>
                                        <p className={styles.statValue}>
                                            {learningTasks.filter(t => t.status === 'submitted').length}
                                        </p>
                                    </div>
                                </div>

                                <div className={styles.statCard}>
                                    <div className={styles.statIcon} style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                                        <FaEdit />
                                    </div>
                                    <div className={styles.statContent}>
                                        <h3>Drafts</h3>
                                        <p className={styles.statValue}>
                                            {learningTasks.filter(t => t.status === 'draft').length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tasks Grid */}
                            {learningTasks.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <FaTasks className={styles.emptyIcon} />
                                    <h3>No Learning Tasks Yet</h3>
                                    <p>Start your learning journey by creating your first personalized task.</p>
                                    <button
                                        className={styles.createTaskBtn}
                                        onClick={handleCreateTask}
                                        disabled={isLoading}
                                    >
                                        <FaPlus />
                                        Create Your First Task
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.tasksHeader}>
                                        <h2>Your Learning Tasks ({learningTasks.length})</h2>
                                        <p className={styles.tasksSubtitle}>
                                            Tasks are locked after admin review to maintain integrity
                                        </p>
                                    </div>

                                    <div className={styles.tasksGrid}>
                                        {learningTasks.map(renderTaskCard)}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </SideBar>
        </div>
    );
};

export default MyLearningTask;