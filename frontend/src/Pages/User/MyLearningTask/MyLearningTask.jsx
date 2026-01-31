import styles from "./MyLearningTask.module.css";
import SideBar from "../../../Components/SideBar/SideBar";
import LearningTaskCard from "../../../Components/LearningTaskCard/LearningTaskCard";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import {
    FaPlus,
    FaTasks,
    FaCheckCircle,
    FaClock,
    FaEdit,
    FaExclamationTriangle,
} from "react-icons/fa";

const MyLearningTask = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    // Real data states
    const [learningTasks, setLearningTasks] = useState([]);
    const [taskStats, setTaskStats] = useState({
        task_count: 0,
        task_rated: 0,
        task_draft: 0,
        task_under_review: 0,
        task_limit: 0 // Remaining tasks user can create
    });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingDelete, setLoadingDelete] = useState(false);

    // Fetch learning tasks and task limit
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch learning tasks
                const tasksResponse = await api.get('/api/learning-task/my-task/');
                const tasksData = tasksResponse.data;

                // Check if there are no tasks yet (backend returns different structure)
                if (tasksData.message && tasksData.message === "You have no learning tasks yet.") {
                    // Handle empty state
                    setLearningTasks([]);
                    setTaskStats({
                        task_count: 0,
                        task_rated: 0,
                        task_draft: 0,
                        task_under_review: 0,
                        task_limit: tasksData.task_limit || 0
                    });
                } else {
                    // Map API data to component format
                    const mappedTasks = tasksData.tasks?.map(task => {
                        // Find admin review for grade and feedback
                        const adminReview = task.reviews?.find(review => review.user?.is_staff || review.is_admin);
                        const grade = adminReview?.rating || 0;
                        const adminFeedback = adminReview?.feedback || "";

                        // Determine status for component
                        let componentStatus = task.status;
                        if (task.status === "rated") componentStatus = "graded";
                        if (task.status === "under_review") componentStatus = "submitted";

                        return {
                            id: task.id,
                            title: task.title,
                            description: task.description,
                            githubLink: task.git_link || "",
                            languages: task.languages?.map(lang => lang.name) || [],
                            frameworks: task.frameworks?.map(fw => fw.name) || [],
                            status: componentStatus,
                            grade: grade,
                            adminFeedback: adminFeedback,
                            createdAt: new Date(task.created_at).toLocaleDateString(),
                            adminEditable: task.status === "draft",
                            user: task.user, // Keep user data for card
                            profile: task.profile, // Keep profile data for card
                            reviews: task.reviews || [],
                            likes_count: task.likes_count || 0,
                            is_public: task.is_public || false
                        };
                    }) || [];

                    setLearningTasks(mappedTasks);
                    setTaskStats({
                        task_count: tasksData.task_count || 0,
                        task_rated: tasksData.task_rated || 0,
                        task_draft: tasksData.task_draft || 0,
                        task_under_review: tasksData.task_under_review || 0,
                        task_limit: tasksData.task_limit || 0 // This is the remaining currency
                    });
                }

            } catch (error) {
                console.error("Error fetching learning tasks:", error);
                // Check for 404 or empty response
                if (error.response?.status === 404 || error.response?.data?.message === "You have no learning tasks yet.") {
                    // User has no tasks yet, this is normal
                    setLearningTasks([]);
                    setTaskStats({
                        task_count: 0,
                        task_rated: 0,
                        task_draft: 0,
                        task_under_review: 0,
                        task_limit: error.response?.data?.task_limit || 0
                    });
                } else {
                    neonToast.error("Failed to load learning tasks", "error");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Handle task creation
    const handleCreateTask = () => {
        if (taskStats.task_limit <= 0) {
            neonToast.error(`You have no task credits remaining. You cannot create new tasks.`, "error");
            return;
        }
        navigate("/user/learning-task/create");
    };

    // Handle task deletion (only for drafts)
    const handleDeleteTask = async (taskId) => {
        const task = learningTasks.find(t => t.id === taskId);
        if (task?.status !== "draft") {
            neonToast.error("Only draft tasks can be deleted.", "error");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this draft task?")) {
            return;
        }

        setLoadingDelete(true);
        try {
            await api.delete(`/api/learning-task/${taskId}/`);
            setLearningTasks(tasks => tasks.filter(t => t.id !== taskId));
            setTaskStats(prev => ({
                ...prev,
                task_count: prev.task_count - 1,
                task_draft: prev.task_draft - 1,
                // When deleting a draft, the task_limit should increase by 1 (return the credit)
                task_limit: prev.task_limit + 1
            }));
            neonToast.success("Task deleted successfully. Your task credit has been returned.", "success");
        } catch (error) {
            console.error("Error deleting task:", error);
            neonToast.error("Failed to delete task", "error");
        } finally {
            setLoadingDelete(false);
        }
    };

    // Handle task edit
    const handleEditTask = (task) => {
        if (task.status === "draft") {
            navigate(`/user/learning-task/edit/${task.id}`);
        } else {
            neonToast.error("Only draft tasks can be edited", "error");
        }
    };

    // Handle task view
    const handleViewTask = (task) => {
        navigate(`/user/learning-task/${task.id}`);
    };

    return (
        <div className={styles.MyLearningTaskContainer}>
            <SideBar>
                <div className={styles.MyLearningTask}>
                    <header className={styles.header}>
                        <div className={styles.headerContent}>
                            <div className={styles.headerText}>
                                <h1>My Learning Tasks</h1>
                                <p className={styles.subtitle}>
                                    Create, manage, and track your personalized learning journey
                                </p>
                            </div>

                            {/* Task Limit Indicator - Shows remaining credits */}
                            <div className={styles.taskLimitCard}>
                                <div className={styles.limitInfo}>
                                    <FaTasks className={styles.limitIcon} />
                                    <div className={styles.limitText}>
                                        <span className={styles.limitCount}>
                                            {taskStats.task_limit}
                                        </span>
                                        <span className={styles.limitLabel}>Task Credits Available</span>
                                    </div>
                                </div>
                                {taskStats.task_limit <= 0 && (
                                    <div className={styles.limitWarning}>
                                        <FaExclamationTriangle />
                                        <span>No credits</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Create Task Button */}
                        <div className={styles.createButtonContainer}>
                            <button
                                className={styles.createTaskBtn}
                                onClick={handleCreateTask}
                                disabled={taskStats.task_limit <= 0 || isLoading}
                            >
                                <FaPlus />
                                <span>Create Learning Task</span>
                                {taskStats.task_limit > 0 && (
                                    <span className={styles.creditCount}>
                                        ({taskStats.task_limit} credit{taskStats.task_limit !== 1 ? 's' : ''} remaining)
                                    </span>
                                )}
                            </button>
                        </div>
                    </header>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Loading your learning tasks...</p>
                        </div>
                    ) : (
                        <>
                            {/* Task Limit Alert - When no credits left */}
                            {taskStats.task_limit <= 0 && learningTasks.length > 0 && (
                                <div className={styles.alertBox}>
                                    <FaExclamationTriangle className={styles.alertIcon} />
                                    <div>
                                        <strong>No Task Credits Available</strong>
                                        <p>
                                            You have used all your task credits. You cannot create new tasks
                                            until you receive more credits from an administrator.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Task Stats - Only show if user has tasks */}
                            {learningTasks.length > 0 && (
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                            <FaTasks />
                                        </div>
                                        <div className={styles.statContent}>
                                            <h3>Total Tasks</h3>
                                            <p className={styles.statValue}>{taskStats.task_count}</p>
                                        </div>
                                    </div>

                                    <div className={styles.statCard}>
                                        <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                            <FaCheckCircle />
                                        </div>
                                        <div className={styles.statContent}>
                                            <h3>Graded</h3>
                                            <p className={styles.statValue}>
                                                {taskStats.task_rated}
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
                                                {taskStats.task_under_review}
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
                                                {taskStats.task_draft}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tasks Grid */}
                            {learningTasks.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <FaTasks className={styles.emptyIcon} />
                                    <h3>No Learning Tasks Yet</h3>
                                    <p>Start your learning journey by creating your first personalized task.</p>
                                    <button
                                        className={styles.createTaskBtn}
                                        onClick={handleCreateTask}
                                        disabled={taskStats.task_limit <= 0 || isLoading}
                                    >
                                        <FaPlus />
                                        Create Your First Task
                                        {taskStats.task_limit > 0 && (
                                            <span className={styles.creditCount}>
                                                ({taskStats.task_limit} credit{taskStats.task_limit !== 1 ? 's' : ''} available)
                                            </span>
                                        )}
                                    </button>
                                    {taskStats.task_limit <= 0 && (
                                        <p className={styles.noCreditsMessage}>
                                            You need task credits to create new tasks. Please contact an administrator.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.tasksHeader}>
                                        <div className={styles.tasksHeaderLeft}>
                                            <h2>Your Learning Tasks ({taskStats.task_count})</h2>
                                            <p className={styles.tasksSubtitle}>
                                                Tasks are locked after admin review to maintain integrity
                                            </p>
                                        </div>
                                        <div className={styles.tasksHeaderRight}>
                                            <div className={styles.creditsInfo}>
                                                <FaTasks className={styles.creditIcon} />
                                                <span className={styles.creditsText}>
                                                    {taskStats.task_limit} task credit{taskStats.task_limit !== 1 ? 's' : ''} available
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.tasksGrid}>
                                        {learningTasks.map((task) => (
                                            <LearningTaskCard
                                                key={task.id}
                                                task={task}
                                                isOwner={true}
                                                onEdit={handleEditTask}
                                                onDelete={handleDeleteTask}
                                                onView={handleViewTask}
                                                loadingDelete={loadingDelete}
                                            />
                                        ))}
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