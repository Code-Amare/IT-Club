import styles from "./LearningTaskCard.module.css";
import {
    FaEdit,
    FaTrash,
    FaClock,
    FaStar,
    FaLock,
    FaRedo
} from "react-icons/fa";
import { FiGitPullRequest } from "react-icons/fi";
import { useUser } from "../../Context/UserContext";

const LearningTaskCard = ({
    task,
    onEdit,
    onView
}) => {
    const { user } = useUser()
    let isOwner = task.user.id == user.id
    const getStatusBadge = (status, grade) => {
        const badges = {
            draft: {
                text: "Draft",
                icon: <FaEdit />,
                className: styles.badgeDraft,
            },
            redo: {
                text: "Redo",
                icon: <FaRedo />,
                className: styles.badgeRedo,
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
                icon: <FaLock />,
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

    const canEditTask = () => {
        if (!isOwner) return false;
        return task.status === "draft" || task.status === "redo";
    };



    return (
        <div className={styles.learningTaskCard} onClick={() => onView?.(task)}>
            <div className={styles.cardHeader}>
                <div className={styles.titleSection}>
                    <h3 className={styles.title}>{task.title}</h3>
                    {getStatusBadge(task.status, task.grade)}
                </div>

                {isOwner && (
                    <div className={styles.actionButtons}>
                        {canEditTask() && (
                            <button
                                className={styles.editBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.(task);
                                }}
                                title="Edit task"
                            >
                                <FaEdit />
                            </button>
                        )}

                    </div>
                )}
            </div>

            <p className={styles.description}>{task.description}</p>

            <div className={styles.metaInfo}>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Languages:</span>
                    <div className={styles.languageTags}>
                        {Array.isArray(task.languages) && task.languages.length > 0 ? (
                            task.languages.map((lang, index) => (
                                <span key={index} className={styles.languageTag}>
                                    {lang}
                                </span>
                            ))
                        ) : (
                            <span className={styles.languageTag}>
                                {task.language || "Not specified"}
                            </span>
                        )}
                    </div>
                </div>

                {task.frameworks && task.frameworks.length > 0 && (
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Frameworks:</span>
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
                    onClick={(e) => e.stopPropagation()}
                >
                    <FiGitPullRequest />
                    View on GitHub
                </a>
            )}

            {(task.status === "graded" || task.status === "locked") ? (
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
                    <span>Created: {task.createdAt}</span>
                </div>
            )}
        </div>
    );
};

export default LearningTaskCard;