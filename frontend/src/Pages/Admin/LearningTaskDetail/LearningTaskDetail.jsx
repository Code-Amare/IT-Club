import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import SideBar from "../../../Components/SideBar/SideBar";
import ConfirmAction from "../../../Components/ConfirmAction/ConfirmAction";
import {
    FaArrowLeft,
    FaCode,
    FaGlobe,
    FaLock,
    FaLink,
    FaPalette,
    FaStar,
    FaEdit,
    FaTrash,
    FaUser,
    FaUsers,
    FaCalendar,
    FaComment,
    FaCheck,
    FaTimes,
    FaExclamationTriangle,
    FaEllipsisV,
    FaShieldAlt,
    FaCrown,
    FaEye
} from "react-icons/fa";
import {
    MdLanguage,
    MdCode,
    MdDescription
} from "react-icons/md";
import styles from "./LearningTaskDetail.module.css";

export default function LearningTaskDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useUser();

    const [loading, setLoading] = useState(true);
    const [task, setTask] = useState(null);
    const [showReviewMenu, setShowReviewMenu] = useState(null);

    // Review form state
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        feedback: ""
    });
    const [reviewErrors, setReviewErrors] = useState({});
    const [submittingReview, setSubmittingReview] = useState(false);
    const [submittingDelete, setSubmittingDelete] = useState(false);
    const [userReview, setUserReview] = useState(null);
    const [editingReview, setEditingReview] = useState(false);

    // Fetch task data
    useEffect(() => {
        if (id) {
            fetchTaskData();
        }
    }, [id]);

    const fetchTaskData = async () => {
        setLoading(true);
        try {
            // Fetch task
            const taskResponse = await api.get(`/api/learning-task/${id}/`);
            const responseData = taskResponse.data;

            // Check if data is nested under 'task' property
            const taskData = responseData.task || responseData;
            setTask(taskData);

            // Check if current admin has already reviewed this task
            if (taskData.reviews) {
                const existingReview = taskData.reviews.find(
                    review => review.user?.id === user.id && review.is_admin
                );
                if (existingReview) {
                    setUserReview(existingReview);
                    setReviewForm({
                        rating: existingReview.rating,
                        feedback: existingReview.feedback || ""
                    });
                } else {
                    // If admin hasn't reviewed yet, show empty form
                    setReviewForm({
                        rating: 5,
                        feedback: ""
                    });
                }
            }

        } catch (error) {
            console.error("Error fetching task data:", error);
            if (error.response?.status === 404) {
                neonToast.error("Learning Task not found", "error");
            } else {
                neonToast.error("Failed to load learning task", "error");
            }
            navigate("/admin");
        } finally {
            setLoading(false);
        }
    };

    // Handle review form changes
    const handleReviewChange = (e) => {
        const { name, value } = e.target;
        setReviewForm(prev => ({ ...prev, [name]: value }));
        if (reviewErrors[name]) {
            setReviewErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // Submit review - ADMIN ONLY
    const handleSubmitReview = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
            neonToast.error("Please select a rating between 1 and 5", "error");
            return;
        }

        if (!reviewForm.feedback.trim()) {
            neonToast.error("Please provide feedback", "error");
            return;
        }

        setSubmittingReview(true);
        try {
            // Correct endpoint based on Django URL pattern
            const endpoint = `/api/learning-task/review/create/${id}/`;

            const method = userReview ? "patch" : "post";

            const response = await api.post(endpoint, {
                rating: parseInt(reviewForm.rating),
                feedback: reviewForm.feedback.trim()
            });

            neonToast.success(
                userReview ? "Review updated successfully!" : "Review submitted and task marked as rated!",
                "success"
            );

            // Refresh task data to get updated reviews
            await fetchTaskData();
            setEditingReview(false);

        } catch (error) {
            console.error("Error submitting review:", error);
            if (error.response?.data?.errors) {
                setReviewErrors(error.response.data.errors);
                neonToast.error("Please fix the errors in the review form", "error");
            } else {
                neonToast.error(
                    error.response?.data?.detail || "Failed to submit review",
                    "error"
                );
            }
        } finally {
            setSubmittingReview(false);
        }
    };

    // Handle delete review - ADMIN ONLY
    const handleDeleteReview = async () => {
        setSubmittingDelete(true);
        try {
            // Correct endpoint based on Django URL pattern - DELETE method
            await api.delete(`/api/learning-task/${id}/review/`);
            neonToast.success("Review deleted successfully!", "success");

            // Refresh data
            await fetchTaskData();
            setShowReviewMenu(null);

        } catch (error) {
            console.error("Error deleting review:", error);
            neonToast.error(
                error.response?.data?.detail || "Failed to delete review",
                "error"
            );
        } finally {
            setSubmittingDelete(false);
        }
    };

    // Start editing review
    const handleEditReview = (review) => {
        setUserReview(review);
        setReviewForm({
            rating: review.rating,
            feedback: review.feedback || ""
        });
        setEditingReview(true);

        // Scroll to form
        setTimeout(() => {
            document.querySelector(`.${styles.reviewForm}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            document.querySelector(`.${styles.feedbackInput}`)?.focus();
        }, 100);

        setShowReviewMenu(null);
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingReview(false);
        if (userReview) {
            setReviewForm({
                rating: userReview.rating,
                feedback: userReview.feedback || ""
            });
        } else {
            setReviewForm({
                rating: 5,
                feedback: ""
            });
        }
    };

    // Handle delete learning task - ADMIN ONLY
    const handleDeleteTask = async () => {
        try {
            await api.delete(`/api/learning-task/delete/${id}/`);
            neonToast.success("Learning task deleted successfully!", "success");
            navigate("/admin");
        } catch (error) {
            console.error("Error deleting learning task:", error);
            neonToast.error(
                error.response?.data?.detail || "Failed to delete learning task",
                "error"
            );
            throw error;
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate average rating
    const calculateAverageRating = () => {
        if (!task.reviews || task.reviews.length === 0) return 0;
        const total = task.reviews.reduce((sum, review) => sum + review.rating, 0);
        return (total / task.reviews.length).toFixed(1);
    };

    // Profile picture component
    const ProfilePicture = ({ src, alt, size = "medium" }) => {
        const sizeClass = size === "small" ? styles.profilePicSmall : styles.profilePicMedium;

        if (src) {
            return (
                <img
                    src={src}
                    alt={alt}
                    className={`${styles.profilePic} ${sizeClass}`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        const nextSibling = e.target.nextSibling;
                        if (nextSibling && nextSibling.style) {
                            nextSibling.style.display = 'flex';
                        }
                    }}
                />
            );
        }

        return (
            <div className={`${styles.profilePicPlaceholder} ${sizeClass}`}>
                <FaUser />
            </div>
        );
    };

    // Get user display name
    const getUserDisplayName = (userObj) => {
        if (!userObj) return "Unknown User";
        if (typeof userObj === 'string') return userObj;
        if (typeof userObj === 'object') {
            return userObj.full_name || userObj.username || "Unknown User";
        }
        return String(userObj);
    };

    // Get user profile picture URL from task
    const getUserProfilePic = (taskUser) => {
        return taskUser?.profile_pic_url || null;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading learning task details...</p>
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
                        <FaExclamationTriangle />
                        <h2>Learning Task Not Found</h2>
                        <p>The requested learning task could not be found.</p>
                        <button
                            className={styles.primaryBtn}
                            onClick={() => navigate("/admin")}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </SideBar>
            </div>
        );
    }

    const averageRating = calculateAverageRating();
    const isRated = task.status === "rated";
    const isCurrentlyEditing = editingReview && userReview;

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate("/admin")}
                        >
                            <FaArrowLeft /> Back to Admin Dashboard
                        </button>
                        <div className={styles.headerMain}>
                            <div className={styles.titleSection}>
                                <h1>{task.title}</h1>
                                <div className={styles.subtitle}>
                                    <span className={styles.userInfo}>
                                        <ProfilePicture
                                            src={getUserProfilePic(task.user)}
                                            alt={getUserDisplayName(task.user)}
                                            size="small"
                                        />
                                        <span>{getUserDisplayName(task.user)}</span>
                                    </span>
                                    <span className={styles.dateInfo}>
                                        <FaCalendar /> {formatDate(task.created_at)}
                                    </span>
                                    <span className={`${styles.visibilityBadge} ${task.is_public ? styles.public : styles.private}`}>
                                        {task.is_public ? (
                                            <>
                                                <FaGlobe /> Public
                                            </>
                                        ) : (
                                            <>
                                                <FaLock /> Private
                                            </>
                                        )}
                                    </span>
                                    <span className={`${styles.ratingBadge} ${isRated ? styles.rated : styles.notRated}`}>
                                        <FaStar /> {isRated ? `Rated (${averageRating}/5)` : "Not Rated"}
                                    </span>
                                    <span className={styles.adminBadge}>
                                        <FaCrown /> Admin View
                                    </span>
                                </div>
                            </div>

                            {/* Admin Action Buttons */}
                            <div className={styles.headerActions}>
                                {/* Delete Learning Task Button (admin only) */}
                                <ConfirmAction
                                    title="Delete Learning Task"
                                    message="Are you sure you want to delete this learning task? This action cannot be undone."
                                    confirmText="Delete"
                                    cancelText="Cancel"
                                    onConfirm={handleDeleteTask}
                                >
                                    <button
                                        className={styles.deleteTaskBtn}
                                        title="Delete learning task"
                                    >
                                        <FaTrash /> Delete Task
                                    </button>
                                </ConfirmAction>

                                {/* Admin Review Actions */}
                                {!userReview && !isRated && (
                                    <button
                                        className={styles.adminRateBtn}
                                        onClick={() => {
                                            document.querySelector(`.${styles.reviewForm}`)?.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start'
                                            });
                                            document.querySelector(`.${styles.feedbackInput}`)?.focus();
                                        }}
                                        title="Review & Rate this learning task"
                                    >
                                        <FaStar /> Rate Learning Task
                                    </button>
                                )}

                                {userReview && !isCurrentlyEditing && (
                                    <button
                                        className={styles.editReviewBtn}
                                        onClick={() => handleEditReview(userReview)}
                                    >
                                        <FaEdit /> Edit Your Review
                                    </button>
                                )}

                                {isCurrentlyEditing && (
                                    <button
                                        className={styles.cancelEditBtn}
                                        onClick={handleCancelEdit}
                                    >
                                        <FaTimes /> Cancel Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.contentGrid}>
                    {/* Left Column - Learning Task Details */}
                    <div className={styles.leftColumn}>
                        {/* Description */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <MdDescription />
                                <h3>Description</h3>
                            </div>
                            <div className={styles.description}>
                                {task.description || "No description provided."}
                            </div>
                        </div>

                        {/* GitHub Link */}
                        {task.git_link && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <FaLink />
                                    <h3>GitHub Repository</h3>
                                </div>
                                <a
                                    href={task.git_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.githubLink}
                                >
                                    <FaCode />
                                    <span>{task.git_link}</span>
                                </a>
                            </div>
                        )}

                        {/* Technologies */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <MdLanguage />
                                <h3>Technologies Used</h3>
                            </div>

                            {/* Languages */}
                            <div className={styles.techGroup}>
                                <h4>Programming Languages</h4>
                                <div className={styles.techList}>
                                    {task.languages && task.languages.length > 0 ? (
                                        task.languages.map(lang => (
                                            <div key={lang.id} className={styles.techItem}>
                                                <div
                                                    className={styles.techColor}
                                                    style={{ backgroundColor: lang.color || "#3b82f6" }}
                                                />
                                                <span className={styles.techName}>
                                                    {lang.name}
                                                </span>
                                                {lang.code && (
                                                    <span className={styles.techCode}>
                                                        {lang.code}
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.emptyTech}>No languages specified</div>
                                    )}
                                </div>
                            </div>

                            {/* Frameworks */}
                            {task.frameworks && task.frameworks.length > 0 && (
                                <div className={styles.techGroup}>
                                    <h4>Frameworks & Libraries</h4>
                                    <div className={styles.techList}>
                                        {task.frameworks.map(fw => (
                                            <div key={fw.id} className={styles.techItem}>
                                                <MdCode className={styles.frameworkIcon} />
                                                <span className={styles.techName}>
                                                    {fw.name}
                                                </span>
                                                {fw.language && (
                                                    <span className={styles.techLanguage}>
                                                        {fw.language.name}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Learning Task Stats */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FaUsers />
                                <h3>Learning Task Statistics</h3>
                            </div>
                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{task.likes_count || 0}</div>
                                    <div className={styles.statLabel}>Likes</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {task.reviews?.length || 0}
                                    </div>
                                    <div className={styles.statLabel}>Total Reviews</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {task.reviews?.filter(r => r.is_admin)?.length || 0}
                                    </div>
                                    <div className={styles.statLabel}>Admin Reviews</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {isRated ? "Yes" : "No"}
                                    </div>
                                    <div className={styles.statLabel}>Rated</div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Actions Panel */}
                        <div className={styles.adminActionsPanel}>
                            <div className={styles.adminSectionHeader}>
                                <FaShieldAlt />
                                <h3>Admin Actions</h3>
                            </div>
                            <div className={styles.adminActions}>
                                <button
                                    className={styles.viewUserBtn}
                                    onClick={() => {
                                        if (task.user?.id) {
                                            navigate(`/admin/user/${task.user.id}`);
                                        } else {
                                            neonToast.error("User information not available", "error");
                                        }
                                    }}
                                >
                                    <FaUser /> View User Profile
                                </button>
                                <button
                                    className={styles.exportBtn}
                                    onClick={() => {
                                        // Export functionality would go here
                                        neonToast.info("Export feature coming soon", "info");
                                    }}
                                >
                                    <FaCode /> Export Task Data
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Reviews & Admin Functions */}
                    <div className={styles.rightColumn}>
                        {/* Admin Review & Rating Section */}
                        <div className={styles.adminSection}>
                            <div className={styles.adminSectionHeader}>
                                <FaStar />
                                <h3>
                                    {isCurrentlyEditing ? "Edit Your Review" :
                                        userReview ? "Your Admin Review" : "Admin Review & Rating"}
                                </h3>
                                <span className={styles.adminBadge}>
                                    <FaCrown /> Admin
                                </span>
                            </div>

                            <div className={styles.adminStats}>
                                <div className={styles.adminStat}>
                                    <span className={styles.adminStatLabel}>Current Status:</span>
                                    <span className={`${styles.adminStatValue} ${isRated ? styles.rated : styles.notRated}`}>
                                        {isRated ? "✓ Rated" : "Not Rated"}
                                    </span>
                                </div>
                                <div className={styles.adminStat}>
                                    <span className={styles.adminStatLabel}>Task Owner:</span>
                                    <span className={styles.adminStatValue}>
                                        {getUserDisplayName(task.user)}
                                    </span>
                                </div>
                                {isRated && (
                                    <div className={styles.adminStat}>
                                        <span className={styles.adminStatLabel}>Average Rating:</span>
                                        <span className={styles.adminStatValue}>
                                            {averageRating} / 5
                                        </span>
                                    </div>
                                )}
                            </div>

                            {(!isRated || userReview) && (
                                <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                                    {/* Rating Section */}
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            <FaStar /> Rating (1-5)
                                        </label>
                                        <div className={styles.ratingInput}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`${styles.starBtn} ${star <= reviewForm.rating ? styles.active : ""}`}
                                                    onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                                    disabled={submittingReview}
                                                    title={`${star} star${star > 1 ? 's' : ''}`}
                                                >
                                                    <FaStar />
                                                </button>
                                            ))}
                                        </div>
                                        <div className={styles.ratingHelp}>
                                            <span className={styles.ratingValue}>
                                                Selected: {reviewForm.rating} / 5 stars
                                            </span>
                                            <span className={styles.adminNote}>
                                                Your review will mark this task as "rated"
                                            </span>
                                        </div>
                                    </div>

                                    {/* Feedback Section */}
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            <FaComment /> Feedback
                                        </label>
                                        <textarea
                                            name="feedback"
                                            value={reviewForm.feedback}
                                            onChange={handleReviewChange}
                                            placeholder="Provide constructive feedback about the learning task. Include what was done well and areas for improvement..."
                                            className={styles.feedbackInput}
                                            rows={5}
                                            disabled={submittingReview}
                                            maxLength={500}
                                        />
                                        <div className={styles.feedbackHelp}>
                                            {reviewForm.feedback.length}/500 characters
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className={styles.formActions}>
                                        <div className={styles.formButtons}>
                                            <AsyncButton
                                                type="submit"
                                                className={styles.submitReviewBtn}
                                                loading={submittingReview}
                                                disabled={submittingReview}
                                            >
                                                {userReview ? (
                                                    <>
                                                        <FaEdit /> Update Review
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCheck /> Submit & Mark as Rated
                                                    </>
                                                )}
                                            </AsyncButton>

                                            {userReview && (
                                                <ConfirmAction
                                                    title="Delete Review"
                                                    message="Are you sure you want to delete your review? This will unmark the task as rated."
                                                    confirmText="Delete"
                                                    cancelText="Cancel"
                                                    onConfirm={handleDeleteReview}
                                                >
                                                    <button
                                                        type="button"
                                                        className={styles.deleteReviewBtn}
                                                        disabled={submittingReview || submittingDelete}
                                                    >
                                                        {submittingDelete ? "Deleting..." : (
                                                            <>
                                                                <FaTrash /> Delete Review
                                                            </>
                                                        )}
                                                    </button>
                                                </ConfirmAction>
                                            )}

                                            {isCurrentlyEditing && (
                                                <button
                                                    type="button"
                                                    className={styles.cancelFormBtn}
                                                    onClick={handleCancelEdit}
                                                    disabled={submittingReview}
                                                >
                                                    <FaTimes /> Cancel
                                                </button>
                                            )}
                                        </div>

                                        {userReview && !isCurrentlyEditing && (
                                            <div className={styles.reviewStatus}>
                                                <FaCalendar /> You reviewed on {formatDate(userReview.created_at)}
                                                {userReview.updated_at && userReview.updated_at !== userReview.created_at && (
                                                    <span className={styles.updatedNote}>
                                                        (Updated: {formatDate(userReview.updated_at)})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            )}

                            {isRated && !userReview && (
                                <div className={styles.alreadyRatedNote}>
                                    <FaExclamationTriangle />
                                    <p>
                                        This task has already been rated by another administrator.
                                        You can view all reviews below.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* All Reviews List */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FaComment />
                                <h3>All Reviews ({task.reviews?.length || 0})</h3>
                            </div>

                            {task.reviews && task.reviews.length > 0 ? (
                                <div className={styles.reviewsList}>
                                    {task.reviews.map((review, index) => {
                                        const isCurrentUserReview = review.user?.id === user.id;
                                        const isReviewMenuOpen = showReviewMenu === review.id;
                                        const isAdminReview = review.is_admin;

                                        return (
                                            <div
                                                key={review.id || index}
                                                className={`${styles.reviewItem} ${isCurrentUserReview ? styles.currentUserReview : ""} ${isAdminReview ? styles.adminReview : ""}`}
                                            >
                                                <div className={styles.reviewHeader}>
                                                    <div className={styles.reviewerInfo}>
                                                        <div className={styles.reviewerName}>
                                                            <ProfilePicture
                                                                src={review.user?.profile_pic_url}
                                                                alt={getUserDisplayName(review.user)}
                                                                size="small"
                                                            />
                                                            <span>{getUserDisplayName(review.user)}</span>
                                                            {isAdminReview && (
                                                                <span className={styles.adminReviewBadge}>
                                                                    <FaCrown /> Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={styles.reviewerRole}>
                                                            {isAdminReview ? (
                                                                <span className={styles.roleBadgeAdmin}>Administrator</span>
                                                            ) : (
                                                                <span className={styles.roleBadgeUser}>User</span>
                                                            )}
                                                            {isCurrentUserReview && (
                                                                <span className={styles.roleBadgeYou}>Your Review</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className={styles.reviewActions}>
                                                        <div className={styles.reviewRating}>
                                                            {[...Array(5)].map((_, i) => (
                                                                <FaStar
                                                                    key={i}
                                                                    className={`${styles.reviewStar} ${i < review.rating ? styles.filled : ""}`}
                                                                />
                                                            ))}
                                                            <span className={styles.ratingValue}>
                                                                {review.rating}.0
                                                            </span>
                                                        </div>

                                                        {/* Review Options Menu (only for admin reviews by current admin) */}
                                                        {isCurrentUserReview && isAdminReview && (
                                                            <div className={styles.reviewOptions}>
                                                                <button
                                                                    className={styles.reviewOptionsToggle}
                                                                    onClick={() => setShowReviewMenu(isReviewMenuOpen ? null : review.id)}
                                                                >
                                                                    <FaEllipsisV />
                                                                </button>

                                                                {isReviewMenuOpen && (
                                                                    <div className={styles.reviewOptionsMenu}>
                                                                        <button
                                                                            className={styles.reviewOption}
                                                                            onClick={() => handleEditReview(review)}
                                                                        >
                                                                            <FaEdit /> Edit Review
                                                                        </button>
                                                                        <ConfirmAction
                                                                            title="Delete Review"
                                                                            message="Are you sure you want to delete this review? This will unmark the task as rated."
                                                                            confirmText="Delete"
                                                                            cancelText="Cancel"
                                                                            onConfirm={handleDeleteReview}
                                                                        >
                                                                            <button
                                                                                className={`${styles.reviewOption} ${styles.deleteOption}`}
                                                                                disabled={submittingDelete}
                                                                            >
                                                                                {submittingDelete ? "Deleting..." : (
                                                                                    <>
                                                                                        <FaTrash /> Delete Review
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </ConfirmAction>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={styles.reviewDate}>
                                                    <FaCalendar /> {formatDate(review.created_at)}
                                                    {review.updated_at && review.updated_at !== review.created_at && (
                                                        <span className={styles.updatedDate}>
                                                            (Edited: {formatDate(review.updated_at)})
                                                        </span>
                                                    )}
                                                </div>

                                                <div className={styles.reviewFeedback}>
                                                    {review.feedback}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={styles.noReviews}>
                                    <FaComment />
                                    <p>No reviews yet. Be the first to review this learning task!</p>
                                </div>
                            )}
                        </div>

                        {/* Task Information Panel */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FaEye />
                                <h3>Task Information</h3>
                            </div>
                            <div className={styles.metadata}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Task ID:</span>
                                    <span className={styles.metaValue}>{task.id}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Created:</span>
                                    <span className={styles.metaValue}>
                                        {formatDate(task.created_at)}
                                    </span>
                                </div>
                                {task.updated_at && task.updated_at !== task.created_at && (
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Updated:</span>
                                        <span className={styles.metaValue}>
                                            {formatDate(task.updated_at)}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Status:</span>
                                    <span className={`${styles.metaValue} ${styles[`status-${task.status}`]}`}>
                                        {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Visibility:</span>
                                    <span className={`${styles.metaValue} ${task.is_public ? styles.public : styles.private}`}>
                                        {task.is_public ? "Public" : "Private"}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Task Owner:</span>
                                    <div className={styles.ownerInfo}>
                                        <ProfilePicture
                                            src={getUserProfilePic(task.user)}
                                            alt={getUserDisplayName(task.user)}
                                            size="small"
                                        />
                                        <span className={styles.metaValue}>
                                            {getUserDisplayName(task.user)}
                                            {task.user?.email && (
                                                <span className={styles.userEmail}>({task.user.email})</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
}