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
import ConfirmAction from "../ConfirmAction/ConfirmAction"; // Adjust path as needed

const LearningTaskCard = ({
    task,
    isOwner = false,
    onEdit,
    onDelete,
    onView
}) => {
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

    const canDeleteTask = () => {
        return isOwner && task.status === "draft";
    };

    const handleDelete = (event, reason) => {
        // The ConfirmAction passes (event, reason) to onConfirm
        // We just need to call the parent's onDelete with task.id
        // event.stopPropagation() is already handled by ConfirmAction
        onDelete?.(task.id);
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
                        {canDeleteTask() && (
                            <ConfirmAction
                                title="Delete Learning Task"
                                message={`Are you sure you want to delete "${task.title}"? This action cannot be undone. Your task credit will be returned.`}
                                confirmText="Delete Task"
                                cancelText="Cancel"
                                onConfirm={handleDelete}
                                requireReason={false} // Set to true if you want to require a reason
                            >
                                <button
                                    className={styles.deleteBtn}
                                    title="Delete task"
                                >
                                    <FaTrash />
                                </button>
                            </ConfirmAction>
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