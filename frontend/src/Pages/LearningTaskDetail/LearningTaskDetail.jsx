import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    FaPaperclip,
    FaExternalLinkAlt,
    FaTrash
} from "react-icons/fa";
import { FiGitPullRequest } from "react-icons/fi";

const LearningTaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(true); // Mock ownership check
    const [activeTab, setActiveTab] = useState("details"); // details, feedback, history

    // Mock task data - in real app, fetch from API
    const mockTasks = [
        {
            id: 1,
            title: "Database Entity Creation",
            description: "Building a complete database system with entities, relationships, and migrations",
            fullDescription: `
        This learning task focuses on designing and implementing a robust database system from scratch. 
        You will be creating entities, defining relationships, and writing migrations.

        ## Objectives
        - Design a normalized database schema for an e-commerce platform
        - Implement one-to-many and many-to-many relationships
        - Write efficient SQL queries with proper indexing
        - Create migration scripts for database versioning
        
        ## Requirements
        - Minimum of 5 entities with proper relationships
        - At least 3 complex queries with JOIN operations
        - Proper indexing strategy for performance
        - Migration scripts for all schema changes
        
        ## Submission Guidelines
        - Push your code to GitHub with proper commit messages
        - Include a README with database schema diagram
        - Submit the GitHub link before the deadline
      `,
            githubLink: "https://github.com/john/database-project",
            languages: ["JavaScript", "SQL", "TypeScript"],
            frameworks: ["Node.js", "Sequelize", "PostgreSQL", "Express"],
            status: "submitted", // draft, submitted, graded, locked
            grade: 4.5,
            adminFeedback: "Great implementation! Consider adding rate limiting for security. The database schema is well-designed but could benefit from additional indexes for the frequently queried fields.",
            feedbackHistory: [
                {
                    id: 1,
                    date: "2024-01-18",
                    admin: "Dr. Smith",
                    feedback: "Initial review: Good schema design, but missing indexes.",
                    grade: null
                },
                {
                    id: 2,
                    date: "2024-01-20",
                    admin: "Dr. Smith",
                    feedback: "Indexes added. Great job on the relationships!",
                    grade: 4.5
                }
            ],
            createdAt: "2024-01-15",
            updatedAt: "2024-01-20",
            submittedAt: "2024-01-18",
            gradedAt: "2024-01-20",
            dueDate: "2024-01-25",
            difficulty: "Intermediate",
            estimatedHours: 20,
            tags: ["Database", "Backend", "SQL"],
            attachments: [
                { name: "schema-diagram.png", type: "image", url: "#" },
                { name: "requirements.pdf", type: "document", url: "#" }
            ],
            adminEditable: false,
            adminName: "Dr. Smith",
            submissionNotes: "Implemented all required entities with proper relationships. Added indexes as suggested in first review."
        },
        {
            id: 3,
            title: "Authentication System",
            description: "JWT-based authentication with refresh tokens and role-based access",
            fullDescription: `
        Build a secure authentication system using JWT tokens with refresh token rotation.
        
        ## Security Requirements
        - Implement refresh token rotation for enhanced security
        - Add rate limiting on authentication endpoints
        - Store passwords with bcrypt hashing
        - Implement proper CORS policies
        
        ## Bonus Points
        - Multi-factor authentication
        - OAuth 2.0 integration
        - Session management dashboard
      `,
            githubLink: "https://github.com/john/auth-system",
            languages: ["Python", "JavaScript"],
            frameworks: ["Django", "Django REST", "PostgreSQL", "Redis"],
            status: "graded",
            grade: 4.8,
            adminFeedback: "Excellent implementation! The refresh token rotation is particularly well-done. Consider adding audit logging for security monitoring.",
            feedbackHistory: [
                {
                    id: 1,
                    date: "2024-01-12",
                    admin: "Prof. Johnson",
                    feedback: "Excellent security implementation. Full marks!",
                    grade: 4.8
                }
            ],
            createdAt: "2024-01-10",
            updatedAt: "2024-01-12",
            submittedAt: "2024-01-11",
            gradedAt: "2024-01-12",
            dueDate: "2024-01-15",
            difficulty: "Advanced",
            estimatedHours: 25,
            tags: ["Security", "Authentication", "Backend"],
            attachments: [
                { name: "api-docs.pdf", type: "document", url: "#" }
            ],
            adminEditable: true,
            adminName: "Prof. Johnson",
            submissionNotes: "Implemented JWT with refresh tokens, rate limiting, and proper password hashing."
        }
    ];

    useEffect(() => {
        // Simulate API call
        const fetchTask = async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            const foundTask = mockTasks.find(t => t.id === parseInt(taskId));
            setTask(foundTask);
            setLoading(false);
        };

        fetchTask();
    }, [taskId]);

    const getStatusIcon = (status) => {
        switch (status) {
            case "draft": return <FaEdit />;
            case "submitted": return <FaClock />;
            case "graded": return <FaCheckCircle />;
            case "locked": return <FaLock />;
            default: return <FaClock />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "draft": return "#f59e0b";
            case "submitted": return "#3b82f6";
            case "graded": return "#10b981";
            case "locked": return "#6b7280";
            default: return "#6b7280";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "draft": return "Draft";
            case "submitted": return "Under Review";
            case "graded": return "Graded";
            case "locked": return "Locked";
            default: return "Unknown";
        }
    };

    const handleEdit = () => {
        if (task && (task.status === "draft" || (task.status === "graded" && task.adminEditable))) {
            navigate(`/user/learning-task/edit/${task.id}`);
        } else if (task.status === "locked") {
            alert("This task is locked and cannot be edited.");
        }
    };

    const handleDelete = () => {
        if (task && task.status === "draft") {
            if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
                // In real app, call API to delete
                navigate("/user/learning-tasks");
            }
        } else {
            alert("Only draft tasks can be deleted.");
        }
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading task details...</p>
            </div>
        );
    }

    if (!task) {
        return (
            <div className={styles.errorContainer}>
                <h2>Task Not Found</h2>
                <p>The requested learning task could not be found.</p>
                <button onClick={handleGoBack} className={styles.backButton}>
                    <FaArrowLeft /> Back to Tasks
                </button>
            </div>
        );
    }

    return (
        <div className={styles.learningTaskDetailContainer}>
            <SideBar>
                <div className={styles.learningTaskDetail}>
                    {/* Header with Back Button */}
                    <header className={styles.header}>
                        <button onClick={handleGoBack} className={styles.backButton}>
                            <FaArrowLeft /> Back to Tasks
                        </button>

                        <div className={styles.headerActions}>
                            {isOwner && (
                                <>
                                    {(task.status === "draft" || (task.status === "graded" && task.adminEditable)) && (
                                        <button onClick={handleEdit} className={styles.editButton}>
                                            <FaEdit /> Edit Task
                                        </button>
                                    )}
                                    {task.status === "draft" && (
                                        <button onClick={handleDelete} className={styles.deleteButton}>
                                            <FaTrash /> Delete
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className={styles.mainContent}>
                        {/* Left Column - Task Details */}
                        <div className={styles.leftColumn}>
                            {/* Task Header */}
                            <div className={styles.taskHeader}>
                                <div className={styles.titleSection}>
                                    <h1 className={styles.taskTitle}>{task.title}</h1>
                                    <div
                                        className={styles.statusBadge}
                                        style={{ backgroundColor: `${getStatusColor(task.status)}15`, color: getStatusColor(task.status) }}
                                    >
                                        {getStatusIcon(task.status)}
                                        <span>{getStatusText(task.status)}</span>
                                        {task.status === "graded" && (
                                            <span className={styles.gradeBadge}>
                                                <FaStar /> {task.grade}/5
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <p className={styles.taskDescription}>{task.description}</p>
                            </div>

                            {/* Tabs */}
                            <div className={styles.tabs}>
                                <button
                                    className={`${styles.tab} ${activeTab === "details" ? styles.activeTab : ""}`}
                                    onClick={() => setActiveTab("details")}
                                >
                                    Task Details
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === "feedback" ? styles.activeTab : ""}`}
                                    onClick={() => setActiveTab("feedback")}
                                >
                                    Feedback & Grade
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === "history" ? styles.activeTab : ""}`}
                                    onClick={() => setActiveTab("history")}
                                >
                                    Review History
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className={styles.tabContent}>
                                {activeTab === "details" && (
                                    <div className={styles.detailsContent}>
                                        {/* Full Description */}
                                        <section className={styles.section}>
                                            <h2 className={styles.sectionTitle}>Full Description</h2>
                                            <div className={styles.fullDescription}>
                                                {task.fullDescription.split('\n').map((paragraph, index) => (
                                                    <p key={index} className={styles.descriptionParagraph}>
                                                        {paragraph}
                                                    </p>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Meta Information */}
                                        <section className={styles.section}>
                                            <h2 className={styles.sectionTitle}>Technical Details</h2>
                                            <div className={styles.metaGrid}>
                                                <div className={styles.metaItem}>
                                                    <FaCode className={styles.metaIcon} />
                                                    <div>
                                                        <label>Languages</label>
                                                        <div className={styles.tags}>
                                                            {task.languages.map((lang, index) => (
                                                                <span key={index} className={styles.tag}>{lang}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={styles.metaItem}>
                                                    <FaLayerGroup className={styles.metaIcon} />
                                                    <div>
                                                        <label>Frameworks & Tools</label>
                                                        <div className={styles.tags}>
                                                            {task.frameworks.map((fw, index) => (
                                                                <span key={index} className={styles.tag}>{fw}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={styles.metaItem}>
                                                    <FaCalendarAlt className={styles.metaIcon} />
                                                    <div>
                                                        <label>Timeline</label>
                                                        <div className={styles.timeline}>
                                                            <span>Created: {task.createdAt}</span>
                                                            <span>Submitted: {task.submittedAt || "Not submitted"}</span>
                                                            <span>Due: {task.dueDate}</span>
                                                            {task.gradedAt && <span>Graded: {task.gradedAt}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={styles.metaItem}>
                                                    <FaUser className={styles.metaIcon} />
                                                    <div>
                                                        <label>Reviewer</label>
                                                        <div className={styles.reviewerInfo}>
                                                            <span>{task.adminName || "Not assigned"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* GitHub Link */}
                                        {task.githubLink && (
                                            <section className={styles.section}>
                                                <h2 className={styles.sectionTitle}>GitHub Repository</h2>
                                                <a
                                                    href={task.githubLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.githubLink}
                                                >
                                                    <FiGitPullRequest />
                                                    <span>View on GitHub</span>
                                                    <FaExternalLinkAlt className={styles.externalIcon} />
                                                </a>
                                            </section>
                                        )}

                                        {/* Attachments */}
                                        {task.attachments && task.attachments.length > 0 && (
                                            <section className={styles.section}>
                                                <h2 className={styles.sectionTitle}>Attachments</h2>
                                                <div className={styles.attachments}>
                                                    {task.attachments.map((attachment, index) => (
                                                        <a
                                                            key={index}
                                                            href={attachment.url}
                                                            className={styles.attachment}
                                                        >
                                                            <FaPaperclip />
                                                            <span>{attachment.name}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}

                                {activeTab === "feedback" && (
                                    <div className={styles.feedbackContent}>
                                        {/* Grade Display */}
                                        {(task.status === "graded" || task.status === "locked") && (
                                            <div className={styles.gradeDisplay}>
                                                <div className={styles.gradeHeader}>
                                                    <FaStar className={styles.gradeStar} />
                                                    <h2>Final Grade</h2>
                                                </div>
                                                <div className={styles.gradeValue}>
                                                    <span className={styles.gradeNumber}>{task.grade}</span>
                                                    <span className={styles.gradeMax}>/5</span>
                                                </div>
                                                <div className={styles.gradeProgress}>
                                                    <div
                                                        className={styles.progressBar}
                                                        style={{ width: `${(task.grade / 5) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Admin Feedback */}
                                        <div className={styles.feedbackSection}>
                                            <h3 className={styles.feedbackTitle}>
                                                <FaUser className={styles.feedbackIcon} />
                                                Admin Feedback
                                            </h3>
                                            <div className={styles.feedbackText}>
                                                {task.adminFeedback || "No feedback provided yet."}
                                            </div>
                                        </div>

                                        {/* Submission Notes (if any) */}
                                        {task.submissionNotes && (
                                            <div className={styles.submissionNotes}>
                                                <h3 className={styles.notesTitle}>Your Submission Notes</h3>
                                                <div className={styles.notesText}>{task.submissionNotes}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "history" && (
                                    <div className={styles.historyContent}>
                                        <h2 className={styles.historyTitle}>Review History</h2>
                                        <div className={styles.timeline}>
                                            {task.feedbackHistory && task.feedbackHistory.length > 0 ? (
                                                task.feedbackHistory.map((item, index) => (
                                                    <div key={item.id} className={styles.timelineItem}>
                                                        <div className={styles.timelineDot}></div>
                                                        <div className={styles.timelineContent}>
                                                            <div className={styles.timelineHeader}>
                                                                <span className={styles.timelineDate}>{item.date}</span>
                                                                <span className={styles.timelineAdmin}>by {item.admin}</span>
                                                                {item.grade && (
                                                                    <span className={styles.timelineGrade}>
                                                                        <FaStar /> {item.grade}/5
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className={styles.timelineFeedback}>
                                                                {item.feedback}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={styles.noHistory}>
                                                    No review history available.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Status Card */}
                        <div className={styles.rightColumn}>
                            <div className={styles.statusCard}>
                                <h3 className={styles.statusTitle}>Task Status</h3>

                                <div className={styles.statusInfo}>
                                    <div className={styles.statusItem}>
                                        <span className={styles.statusLabel}>Current Status</span>
                                        <div className={styles.statusValue}>
                                            {getStatusIcon(task.status)}
                                            <span style={{ color: getStatusColor(task.status) }}>
                                                {getStatusText(task.status)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.statusItem}>
                                        <span className={styles.statusLabel}>Difficulty</span>
                                        <span className={styles.statusValue}>{task.difficulty}</span>
                                    </div>

                                    <div className={styles.statusItem}>
                                        <span className={styles.statusLabel}>Estimated Hours</span>
                                        <span className={styles.statusValue}>{task.estimatedHours} hours</span>
                                    </div>

                                    <div className={styles.statusItem}>
                                        <span className={styles.statusLabel}>Tags</span>
                                        <div className={styles.taskTags}>
                                            {task.tags.map((tag, index) => (
                                                <span key={index} className={styles.taskTag}>{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Status Timeline */}
                                <div className={styles.statusTimeline}>
                                    <h4>Status Timeline</h4>
                                    <div className={styles.timelineSteps}>
                                        <div className={`${styles.timelineStep} ${styles.completed}`}>
                                            <div className={styles.stepDot}></div>
                                            <span className={styles.stepLabel}>Created</span>
                                            <span className={styles.stepDate}>{task.createdAt}</span>
                                        </div>

                                        <div className={`${styles.timelineStep} ${task.submittedAt ? styles.completed : styles.pending}`}>
                                            <div className={styles.stepDot}></div>
                                            <span className={styles.stepLabel}>Submitted</span>
                                            <span className={styles.stepDate}>{task.submittedAt || "Pending"}</span>
                                        </div>

                                        <div className={`${styles.timelineStep} ${task.gradedAt ? styles.completed : styles.pending}`}>
                                            <div className={styles.stepDot}></div>
                                            <span className={styles.stepLabel}>Graded</span>
                                            <span className={styles.stepDate}>{task.gradedAt || "Pending"}</span>
                                        </div>

                                        <div className={`${styles.timelineStep} ${task.status === "locked" ? styles.completed : styles.pending}`}>
                                            <div className={styles.stepDot}></div>
                                            <span className={styles.stepLabel}>Locked</span>
                                            <span className={styles.stepDate}>
                                                {task.status === "locked" ? task.updatedAt : "Pending"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={styles.actionButtons}>
                                    {task.githubLink && (
                                        <a
                                            href={task.githubLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.githubButton}
                                        >
                                            <FaGithub /> View on GitHub
                                        </a>
                                    )}

                                    {isOwner && task.status === "draft" && (
                                        <button onClick={handleEdit} className={styles.editButton}>
                                            <FaEdit /> Continue Editing
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </SideBar>
        </div>
    );
};

export default LearningTaskDetail;