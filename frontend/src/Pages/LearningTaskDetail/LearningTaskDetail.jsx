import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./LearningTaskDetail.module.css";
import SideBar from "../../Components/SideBar/SideBar";
import {
    FaArrowLeft,
    FaEdit,
    FaGithub,
    FaStar,
    FaClock,
    FaCheckCircle,
    FaLock,
    FaCode,
    FaLayerGroup,
    FaCalendarAlt,
    FaUser,
    FaExternalLinkAlt,
    FaTrash,
    FaComment,
    FaThumbsUp,
    FaReply,
    FaPaperPlane,
    FaRegStar,
    FaTimes,
    FaCheck,
    FaInfoCircle,
    FaFilter,
    FaSort,
    FaEye,
    FaDownload,
    FaShareAlt
} from "react-icons/fa";
import { FiGitPullRequest } from "react-icons/fi";

const LearningTaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("details");
    const [newFeedback, setNewFeedback] = useState("");
    const [rating, setRating] = useState(0);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    // Mock user info - in real app, get from auth context
    const [currentUser] = useState({
        id: "user123",
        role: "student", // "admin", "instructor", "student"
        name: "John Doe"
    });

    // Mock data
    const mockTasks = [
        {
            id: 1,
            title: "Database Entity Creation",
            description: "Building a complete database system with entities, relationships, and migrations",
            fullDescription: `This learning task focuses on designing and implementing a robust database system from scratch. You will be creating entities, defining relationships, and writing migrations.`,
            githubLink: "https://github.com/john/database-project",
            languages: ["JavaScript", "SQL", "TypeScript"],
            frameworks: ["Node.js", "Sequelize", "PostgreSQL", "Express"],
            status: "submitted",
            grade: 0,
            adminFeedback: "",
            publicFeedbacks: [
                {
                    id: 1,
                    userId: "user123",
                    userName: "Alex Chen",
                    comment: "Great implementation! The database schema is well-designed.",
                    rating: 5,
                    likes: 24,
                    liked: false,
                    timestamp: "2024-01-20 14:30",
                    isExpert: true
                },
                {
                    id: 2,
                    userId: "user456",
                    userName: "Maria Garcia",
                    comment: "Consider adding more comments to your migration scripts.",
                    rating: 4,
                    likes: 12,
                    liked: true,
                    timestamp: "2024-01-20 12:15",
                    isExpert: false
                }
            ],
            stats: {
                totalFeedbacks: 15,
                averageRating: 4.3,
                helpfulVotes: 42
            },
            createdAt: "2024-01-15",
            dueDate: "2024-01-25",
            difficulty: "Intermediate",
            estimatedHours: 20,
            tags: ["Database", "Backend", "SQL"],
            adminName: "Dr. Smith",
            ownerId: "user123", // Current user owns this task
            canEdit: true,
            canDelete: true
        },
        {
            id: 2,
            title: "React E-commerce Dashboard",
            description: "Creating a responsive admin dashboard with charts and analytics",
            fullDescription: `Build a comprehensive e-commerce dashboard with React and modern tools.`,
            githubLink: "",
            languages: ["TypeScript"],
            frameworks: ["React", "Redux", "Tailwind CSS"],
            status: "draft",
            grade: 0,
            adminFeedback: "",
            publicFeedbacks: [],
            stats: {
                totalFeedbacks: 0,
                averageRating: 0,
                helpfulVotes: 0
            },
            createdAt: "2024-01-20",
            dueDate: "2024-02-01",
            difficulty: "Intermediate",
            estimatedHours: 25,
            tags: ["React", "Frontend", "Dashboard"],
            adminName: "Prof. Johnson",
            ownerId: "user456", // Different user owns this
            canEdit: true,
            canDelete: true
        }
    ];

    useEffect(() => {
        const fetchTask = async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 300));
            const foundTask = mockTasks.find(t => t.id === parseInt(taskId));
            setTask(foundTask);
            setLoading(false);
        };

        fetchTask();
    }, [taskId]);

    // Helper functions
    const getStatusInfo = (status) => {
        const info = {
            draft: { icon: <FaEdit />, color: "#f59e0b", text: "Draft" },
            submitted: { icon: <FaClock />, color: "#3b82f6", text: "Under Review" },
            graded: { icon: <FaCheckCircle />, color: "#10b981", text: "Graded" },
            locked: { icon: <FaLock />, color: "#6b7280", text: "Locked" }
        };
        return info[status] || info.draft;
    };

    // Check if current user can edit this task
    const canEdit = () => {
        if (!task) return false;
        if (currentUser.role === "admin") return true;
        if (currentUser.id === task.ownerId && task.status !== "locked") return true;
        return false;
    };

    // Check if current user can delete this task
    const canDelete = () => {
        if (!task) return false;
        if (currentUser.role === "admin") return true;
        if (currentUser.id === task.ownerId && task.status === "draft") return true;
        return false;
    };

    // Check if current user can submit feedback
    const canSubmitFeedback = () => {
        if (!task) return false;
        if (currentUser.role === "admin") return true;
        if (currentUser.id === task.ownerId) return false; // Owners can't give feedback on their own tasks
        return task.status !== "draft"; // Only give feedback on published tasks
    };

    // Check if current user can see feedback form
    const canSeeFeedbackForm = () => {
        if (!task) return false;
        return canSubmitFeedback() && task.status !== "locked";
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!newFeedback.trim()) return;

        setIsSubmittingFeedback(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const newFeedbackObj = {
            id: task.publicFeedbacks.length + 1,
            userId: currentUser.id,
            userName: currentUser.name,
            comment: newFeedback,
            rating: rating,
            likes: 0,
            liked: false,
            timestamp: new Date().toLocaleDateString() + " " +
                new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isExpert: currentUser.role === "admin" || currentUser.role === "instructor"
        };

        setTask({
            ...task,
            publicFeedbacks: [newFeedbackObj, ...task.publicFeedbacks],
            stats: {
                ...task.stats,
                totalFeedbacks: task.stats.totalFeedbacks + 1,
                averageRating: ((task.stats.averageRating * task.stats.totalFeedbacks) + rating) /
                    (task.stats.totalFeedbacks + 1)
            }
        });

        setNewFeedback("");
        setRating(0);
        setIsSubmittingFeedback(false);
    };

    const handleLikeFeedback = (feedbackId) => {
        const updatedFeedbacks = task.publicFeedbacks.map(fb => {
            if (fb.id === feedbackId) {
                return {
                    ...fb,
                    likes: fb.liked ? fb.likes - 1 : fb.likes + 1,
                    liked: !fb.liked
                };
            }
            return fb;
        });

        setTask({
            ...task,
            publicFeedbacks: updatedFeedbacks,
            stats: {
                ...task.stats,
                helpfulVotes: fb.liked ? task.stats.helpfulVotes - 1 : task.stats.helpfulVotes + 1
            }
        });
    };

    const handleEdit = () => {
        if (canEdit()) {
            navigate(`/learning-task/edit/${task.id}`);
        }
    };

    const handleDelete = () => {
        if (canDelete() && window.confirm("Are you sure you want to delete this task?")) {
            // In real app, call API to delete
            navigate("/user/learning-tasks");
        }
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <FaStar
                key={i}
                className={i < rating ? styles.starFilled : styles.starEmpty}
            />
        ));
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Loading task details...</p>
                    </div>
                </SideBar>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.errorContainer}>
                        <h2>Task Not Found</h2>
                        <p>The requested learning task could not be found.</p>
                        <button onClick={() => navigate(-1)} className={styles.primaryBtn}>
                            <FaArrowLeft /> Back to Tasks
                        </button>
                    </div>
                </SideBar>
            </div>
        );
    }

    const statusInfo = getStatusInfo(task.status);
    const isOwner = currentUser.id === task.ownerId;
    const showFeedbackForm = canSeeFeedbackForm();

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Back Button */}
                <div className={styles.header}>
                    <button onClick={() => navigate(-1)} className={styles.backBtn}>
                        <FaArrowLeft /> Back
                    </button>

                    {/* Action Buttons - Conditionally shown */}
                    <div className={styles.actions}>
                        {canEdit() && (
                            <button onClick={handleEdit} className={styles.editBtn}>
                                <FaEdit /> Edit
                            </button>
                        )}
                        {canDelete() && (
                            <button onClick={handleDelete} className={styles.deleteBtn}>
                                <FaTrash /> Delete
                            </button>
                        )}
                        {task.githubLink && (
                            <a
                                href={task.githubLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.githubBtn}
                            >
                                <FaGithub /> GitHub
                            </a>
                        )}
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Main Task Card */}
                    <div className={styles.mainCard}>
                        {/* Task Header */}
                        <div className={styles.taskHeader}>
                            <div className={styles.taskTitleSection}>
                                <h1 className={styles.title}>{task.title}</h1>
                                <div
                                    className={styles.statusBadge}
                                    style={{
                                        backgroundColor: `${statusInfo.color}15`,
                                        borderColor: `${statusInfo.color}30`
                                    }}
                                >
                                    {statusInfo.icon}
                                    <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>
                                    {task.status === "graded" && (
                                        <span className={styles.gradeBadge}>
                                            <FaStar /> {task.grade}/5
                                        </span>
                                    )}
                                </div>
                            </div>

                            <p className={styles.description}>{task.description}</p>

                            <div className={styles.taskMeta}>
                                <div className={styles.metaItem}>
                                    <FaUser /> {task.adminName}
                                </div>
                                <div className={styles.metaItem}>
                                    <FaCalendarAlt /> {task.createdAt}
                                </div>
                                <div className={styles.metaItem}>
                                    <FaClock /> {task.estimatedHours}h
                                </div>
                                {isOwner && (
                                    <div className={styles.ownerBadge}>
                                        Your Task
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tab} ${activeTab === "details" ? styles.activeTab : ""}`}
                                onClick={() => setActiveTab("details")}
                            >
                                Details
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === "feedback" ? styles.activeTab : ""}`}
                                onClick={() => setActiveTab("feedback")}
                            >
                                Feedback ({task.publicFeedbacks?.length || 0})
                            </button>
                            {showFeedbackForm && (
                                <button
                                    className={`${styles.tab} ${activeTab === "giveFeedback" ? styles.activeTab : ""}`}
                                    onClick={() => setActiveTab("giveFeedback")}
                                >
                                    <FaPaperPlane /> Add Feedback
                                </button>
                            )}
                        </div>

                        {/* Tab Content */}
                        <div className={styles.tabContent}>
                            {activeTab === "details" && (
                                <div className={styles.detailsContent}>
                                    {/* Full Description */}
                                    <div className={styles.section}>
                                        <h3>Full Description</h3>
                                        <div className={styles.fullDescription}>
                                            {task.fullDescription}
                                        </div>
                                    </div>

                                    {/* Tech Stack */}
                                    <div className={styles.section}>
                                        <h3>Tech Stack</h3>
                                        <div className={styles.techStack}>
                                            <div className={styles.techSection}>
                                                <h4>Languages</h4>
                                                <div className={styles.tags}>
                                                    {task.languages.map((lang, idx) => (
                                                        <span key={idx} className={styles.tag}>{lang}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={styles.techSection}>
                                                <h4>Frameworks & Tools</h4>
                                                <div className={styles.tags}>
                                                    {task.frameworks.map((fw, idx) => (
                                                        <span key={idx} className={styles.tag}>{fw}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Info */}
                                    <div className={styles.infoGrid}>
                                        <div className={styles.infoItem}>
                                            <div className={styles.infoIcon}>
                                                <FaClock />
                                            </div>
                                            <div>
                                                <label>Difficulty</label>
                                                <p>{task.difficulty}</p>
                                            </div>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <div className={styles.infoIcon}>
                                                <FaCalendarAlt />
                                            </div>
                                            <div>
                                                <label>Due Date</label>
                                                <p>{task.dueDate}</p>
                                            </div>
                                        </div>
                                        {task.githubLink && (
                                            <div className={styles.infoItem}>
                                                <div className={styles.infoIcon}>
                                                    <FaGithub />
                                                </div>
                                                <div>
                                                    <label>Repository</label>
                                                    <a
                                                        href={task.githubLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.repoLink}
                                                    >
                                                        View on GitHub <FaExternalLinkAlt />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "feedback" && (
                                <div className={styles.feedbackContent}>
                                    {/* Admin Feedback */}
                                    {task.adminFeedback && (
                                        <div className={styles.adminFeedback}>
                                            <div className={styles.adminHeader}>
                                                <FaUser />
                                                <h3>Admin Feedback</h3>
                                            </div>
                                            <div className={styles.adminContent}>
                                                <p>{task.adminFeedback}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Public Feedback Stats */}
                                    <div className={styles.feedbackStats}>
                                        <div className={styles.stat}>
                                            <FaComment />
                                            <div>
                                                <span className={styles.statValue}>{task.stats?.totalFeedbacks || 0}</span>
                                                <span className={styles.statLabel}>Feedbacks</span>
                                            </div>
                                        </div>
                                        <div className={styles.stat}>
                                            <FaStar />
                                            <div>
                                                <span className={styles.statValue}>{task.stats?.averageRating?.toFixed(1) || "0.0"}</span>
                                                <span className={styles.statLabel}>Avg Rating</span>
                                            </div>
                                        </div>
                                        <div className={styles.stat}>
                                            <FaThumbsUp />
                                            <div>
                                                <span className={styles.statValue}>{task.stats?.helpfulVotes || 0}</span>
                                                <span className={styles.statLabel}>Helpful</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Feedback List */}
                                    <div className={styles.feedbackList}>
                                        {task.publicFeedbacks?.length > 0 ? (
                                            task.publicFeedbacks.map(feedback => (
                                                <div key={feedback.id} className={styles.feedbackItem}>
                                                    <div className={styles.feedbackHeader}>
                                                        <div className={styles.userInfo}>
                                                            <div className={styles.userName}>
                                                                {feedback.userName}
                                                                {feedback.isExpert && (
                                                                    <span className={styles.expertBadge}>Expert</span>
                                                                )}
                                                            </div>
                                                            <div className={styles.feedbackTime}>
                                                                <FaClock /> {feedback.timestamp}
                                                            </div>
                                                        </div>
                                                        <div className={styles.feedbackRating}>
                                                            {renderStars(feedback.rating)}
                                                        </div>
                                                    </div>
                                                    <p className={styles.feedbackText}>{feedback.comment}</p>
                                                    <div className={styles.feedbackActions}>
                                                        <button
                                                            className={`${styles.likeBtn} ${feedback.liked ? styles.liked : ''}`}
                                                            onClick={() => handleLikeFeedback(feedback.id)}
                                                        >
                                                            <FaThumbsUp /> {feedback.likes}
                                                        </button>
                                                        <button className={styles.replyBtn}>
                                                            <FaReply /> Reply
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.noFeedback}>
                                                <FaComment />
                                                <p>No feedback yet. Be the first to share your thoughts!</p>
                                                {showFeedbackForm && (
                                                    <button
                                                        onClick={() => setActiveTab("giveFeedback")}
                                                        className={styles.addFeedbackBtn}
                                                    >
                                                        <FaPaperPlane /> Add Feedback
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "giveFeedback" && showFeedbackForm && (
                                <div className={styles.giveFeedbackContent}>
                                    <h3>Add Your Feedback</h3>
                                    <p className={styles.feedbackSubtitle}>
                                        Share your thoughts to help improve this task
                                    </p>

                                    <form onSubmit={handleSubmitFeedback} className={styles.feedbackForm}>
                                        {/* Rating */}
                                        <div className={styles.formGroup}>
                                            <label>Rating</label>
                                            <div className={styles.rating}>
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        className={`${styles.starBtn} ${star <= rating ? styles.selected : ''}`}
                                                        onClick={() => setRating(star)}
                                                    >
                                                        {star <= rating ? <FaStar /> : <FaRegStar />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Comment */}
                                        <div className={styles.formGroup}>
                                            <label>Your Feedback</label>
                                            <textarea
                                                value={newFeedback}
                                                onChange={(e) => setNewFeedback(e.target.value)}
                                                placeholder="Share your constructive feedback..."
                                                rows={5}
                                                className={styles.feedbackTextarea}
                                                maxLength={500}
                                            />
                                            <div className={styles.charCount}>
                                                {newFeedback.length}/500 characters
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className={styles.formActions}>
                                            <button
                                                type="button"
                                                onClick={() => setActiveTab("feedback")}
                                                className={styles.cancelBtn}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newFeedback.trim() || isSubmittingFeedback}
                                                className={styles.submitBtn}
                                            >
                                                {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Hidden on mobile */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarCard}>
                            <h3>Quick Info</h3>

                            <div className={styles.sidebarInfo}>
                                <div className={styles.infoRow}>
                                    <span>Status</span>
                                    <span className={styles.statusText} style={{ color: statusInfo.color }}>
                                        {statusInfo.text}
                                    </span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span>Owner</span>
                                    <span>{isOwner ? "You" : task.adminName}</span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span>Created</span>
                                    <span>{task.createdAt}</span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span>Due Date</span>
                                    <span>{task.dueDate}</span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className={styles.sidebarActions}>
                                {task.githubLink && (
                                    <a
                                        href={task.githubLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.sidebarBtn}
                                    >
                                        <FaGithub /> View Code
                                    </a>
                                )}

                                {showFeedbackForm && (
                                    <button
                                        onClick={() => setActiveTab("giveFeedback")}
                                        className={styles.sidebarBtn}
                                    >
                                        <FaComment /> Add Feedback
                                    </button>
                                )}

                                <button className={styles.sidebarBtn}>
                                    <FaShareAlt /> Share
                                </button>

                                {currentUser.role === "admin" && (
                                    <button className={styles.sidebarBtn}>
                                        <FaDownload /> Export
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
};

export default LearningTaskDetail;