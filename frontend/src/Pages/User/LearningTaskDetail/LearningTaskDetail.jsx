import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import SideBar from "../../../Components/SideBar/SideBar";
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
    FaThumbsUp,
    FaComment,
    FaCheck,
    FaTimes,
    FaExclamationTriangle,
    FaEye,
    FaEyeSlash,
    FaExternalLinkAlt,
    FaClock
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
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);

    // Review form state
    const [reviewForm, setReviewForm] = useState({
        rating: 5,
        feedback: ""
    });
    const [reviewErrors, setReviewErrors] = useState({});
    const [submittingReview, setSubmittingReview] = useState(false);
    const [userReview, setUserReview] = useState(null);

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

            if (responseData.task) {
                const taskData = responseData.task;

                // Check if user liked this task
                setLiked(responseData.user_liked || false);

                setTask(taskData);
                setLikeCount(taskData.likes_count || 0);

                // Check if current user has already reviewed this task
                if (user.isAuthenticated && taskData.reviews) {
                    const existingReview = taskData.reviews.find(
                        review => review.user?.id === user.id
                    );
                    if (existingReview) {
                        setUserReview(existingReview);
                        setReviewForm({
                            rating: existingReview.rating,
                            feedback: existingReview.feedback || ""
                        });
                    }
                }
            } else {
                // Handle case where task data is directly in response
                const taskData = responseData;
                setLiked(responseData.user_liked || false);
                setTask(taskData);
                setLikeCount(taskData.likes_count || 0);

                if (user.isAuthenticated && taskData.reviews) {
                    const existingReview = taskData.reviews.find(
                        review => review.user?.id === user.id
                    );
                    if (existingReview) {
                        setUserReview(existingReview);
                        setReviewForm({
                            rating: existingReview.rating,
                            feedback: existingReview.feedback || ""
                        });
                    }
                }
            }

        } catch (error) {
            console.error("Error fetching task data:", error);
            if (error.response?.status === 404) {
                neonToast.error("Learning Task not found", "error");
            } else {
                neonToast.error("Failed to load learning task", "error");
            }
            navigate("/user/learning-tasks");
        } finally {
            setLoading(false);
        }
    };

    // Handle like/unlike
    const handleLike = async () => {
        if (!user.isAuthenticated) {
            neonToast.error("Please login to like learning tasks", "error");
            return;
        }

        try {
            const response = await api.post(`/api/learning-task/like/${id}/`);
            setLiked(response.data.action === "liked");
            setLikeCount(response.data.total_likes || response.data.likes_count);

            neonToast.success(
                response.data.action === "liked"
                    ? "Learning task liked!"
                    : "Learning task unliked!",
                "success"
            );
        } catch (error) {
            console.error("Error liking learning task:", error);
            neonToast.error("Failed to like/unlike learning task", "error");
        }
    };

    // Handle review form changes
    const handleReviewChange = (e) => {
        const { name, value } = e.target;
        setReviewForm(prev => ({ ...prev, [name]: value }));

        // Fix: Replace optional chaining assignment with regular if statement
        if (reviewErrors[name]) {
            const newErrors = { ...reviewErrors };
            delete newErrors[name];
            setReviewErrors(newErrors);
        }
    };

    // Validate review form
    const validateReviewForm = () => {
        const newErrors = {};

        if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
            newErrors.rating = "Rating must be between 1 and 5";
        }
        if (!reviewForm.feedback.trim()) {
            newErrors.feedback = "Feedback is required";
        }

        setReviewErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit review - For users only (regular users can review)
    const handleSubmitReview = async (e) => {
        e.preventDefault();

        // Check if user is authenticated
        if (!user.isAuthenticated) {
            neonToast.error("Please login to submit a review", "error");
            return;
        }

        // Check if user is task owner - task owners should not review their own tasks
        if (task && user.id === task.user.id) {
            neonToast.error("You cannot review your own learning task", "error");
            return;
        }

        if (!validateReviewForm()) {
            neonToast.error("Please fix the errors in the review form", "error");
            return;
        }

        setSubmittingReview(true);
        try {
            // Use the same endpoint for users
            const endpoint = `/api/learning-task/review/edit/${id}/`;

            const method = userReview ? "patch" : "post";

            const response = await api[method](endpoint, {
                rating: parseInt(reviewForm.rating),
                feedback: reviewForm.feedback.trim()
            });

            neonToast.success(
                userReview ? "Review updated successfully!" : "Review submitted successfully!",
                "success"
            );

            // Refresh task data to get updated reviews
            await fetchTaskData();

        } catch (error) {
            console.error("Error submitting review:", error);
            if (error.response?.data?.errors) {
                setReviewErrors(error.response.data.errors);
                neonToast.error("Please fix the errors in the review form", "error");
            } else {
                neonToast.error(
                    error.response?.data?.detail ||
                    error.response?.data?.error ||
                    "Failed to submit review",
                    "error"
                );
            }
        } finally {
            setSubmittingReview(false);
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

    // Get user display name safely
    const getUserDisplayName = (userObj) => {
        if (!userObj) return "Unknown User";
        if (typeof userObj === 'string') return userObj;
        if (typeof userObj === 'object') {
            return userObj.full_name || userObj.username || userObj.email || "Unknown User";
        }
        return String(userObj);
    };

    // Get user profile picture
    const getUserProfilePic = (userObj) => {
        if (!userObj) return null;
        if (typeof userObj === 'object') {
            return userObj?.profile_pic_url || null;
        }
        return null;
    };

    // Profile picture component
    const ProfilePicture = ({ user, size = "small" }) => {
        const sizeClass = size === "small" ? styles.profilePicSmall : styles.profilePicMedium;
        const profilePicUrl = getUserProfilePic(user);

        if (profilePicUrl) {
            return (
                <img
                    src={profilePicUrl}
                    alt={getUserDisplayName(user)}
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

    // Get user role badge - SIMPLIFIED: No admin badge since this is user-only page
    const getUserRoleBadge = (reviewUser) => {
        if (reviewUser && task?.user && reviewUser.id === task.user.id) {
            return <span className={styles.roleBadgeOwner}>Task Owner</span>;
        } else {
            return <span className={styles.roleBadgeUser}>User</span>;
        }
    };

    // Handle delete task
    const handleDeleteTask = async () => {
        if (!window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
            return;
        }

        try {
            await api.delete(`/api/learning-task/delete/${id}/`);
            neonToast.success("Task deleted successfully", "success");
            navigate("/user/learning-tasks");
        } catch (error) {
            console.error("Error deleting task:", error);
            neonToast.error(error.response?.data?.error || "Failed to delete task", "error");
        }
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
                            onClick={() => navigate("/user/learning-tasks")}
                        >
                            Back to Learning Tasks
                        </button>
                    </div>
                </SideBar>
            </div>
        );
    }

    const isOwner = user.id === task.user?.id;
    // Users can review any public task except their own
    const canReview = user.isAuthenticated && !isOwner && task.is_public;

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate("/user/learning-tasks")}
                        >
                            <FaArrowLeft /> Back to Learning Tasks
                        </button>
                        <div className={styles.headerMain}>
                            <div className={styles.titleSection}>
                                <h1>{task.title}</h1>
                                <div className={styles.subtitle}>
                                    <span className={styles.userInfo}>
                                        <ProfilePicture user={task.user} size="small" />
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
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={styles.headerActions}>
                                {/* Like Button */}
                                <button
                                    className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
                                    onClick={handleLike}
                                    title={liked ? "Unlike this learning task" : "Like this learning task"}
                                    disabled={!user.isAuthenticated}
                                >
                                    <FaThumbsUp />
                                    <span>{likeCount}</span>
                                </button>

                                {/* Edit and Delete for owner */}
                                {isOwner && task.status === "draft" && (
                                    <>
                                        <button
                                            className={styles.editBtn}
                                            onClick={() => navigate(`/user/learning-task/edit/${id}`)}
                                            title="Edit learning task"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={handleDeleteTask}
                                            title="Delete learning task"
                                        >
                                            <FaTrash />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Status Banner - Simplified messages for users */}
                {task.status === "draft" && (
                    <div className={styles.statusBanner}>
                        <FaExclamationTriangle />
                        <span>This task is in <strong>Draft</strong> status. It is only visible to you.</span>
                    </div>
                )}
                {task.status === "under_review" && (
                    <div className={styles.statusBanner}>
                        <FaClock />
                        <span>This task is <strong>Under Review</strong>. Administrators will review it soon.</span>
                    </div>
                )}
                {task.status === "rated" && (
                    <div className={styles.statusBanner}>
                        <FaStar />
                        <span>This task has been <strong>Rated</strong> by administrators.</span>
                    </div>
                )}

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
                                    <FaExternalLinkAlt />
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
                                                    style={{ backgroundColor: lang?.color || "#3b82f6" }}
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
                                    <div className={styles.statValue}>{likeCount}</div>
                                    <div className={styles.statLabel}>Likes</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {task.reviews?.length || 0}
                                    </div>
                                    <div className={styles.statLabel}>Reviews</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {task.status === "rated" ? "Yes" : "No"}
                                    </div>
                                    <div className={styles.statLabel}>Rated</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>
                                        {task.is_public ? "Yes" : "No"}
                                    </div>
                                    <div className={styles.statLabel}>Public</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Reviews & Feedback */}
                    <div className={styles.rightColumn}>
                        {/* Review Form (for users except task owner) */}
                        {canReview && (
                            <div className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <FaComment />
                                    <h3>{userReview ? "Edit Your Review" : "Submit Review"}</h3>
                                </div>
                                <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                                    {/* Rating */}
                                    <div className={styles.formGroup}>
                                        <label>Rating (1-5 stars)</label>
                                        <div className={styles.ratingInput}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`${styles.starBtn} ${star <= reviewForm.rating ? styles.active : ""
                                                        }`}
                                                    onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                                                    disabled={submittingReview}
                                                >
                                                    <FaStar />
                                                </button>
                                            ))}
                                        </div>
                                        <div className={styles.ratingValue}>
                                            {reviewForm.rating} / 5 stars
                                        </div>
                                        {reviewErrors.rating && (
                                            <span className={styles.errorText}>{reviewErrors.rating}</span>
                                        )}
                                    </div>

                                    {/* Feedback */}
                                    <div className={styles.formGroup}>
                                        <label>Feedback</label>
                                        <textarea
                                            name="feedback"
                                            value={reviewForm.feedback}
                                            onChange={handleReviewChange}
                                            placeholder="Provide your feedback about this learning task..."
                                            className={`${styles.feedbackInput} ${reviewErrors.feedback ? styles.errorInput : ""
                                                }`}
                                            rows={4}
                                            disabled={submittingReview}
                                        />
                                        {reviewErrors.feedback && (
                                            <span className={styles.errorText}>{reviewErrors.feedback}</span>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <AsyncButton
                                        type="submit"
                                        className={styles.submitReviewBtn}
                                        loading={submittingReview}
                                        disabled={submittingReview}
                                    >
                                        <FaCheck /> {userReview ? "Update Review" : "Submit Review"}
                                    </AsyncButton>
                                </form>
                            </div>
                        )}

                        {/* Reviews List */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FaStar />
                                <h3>Reviews ({task.reviews?.length || 0})</h3>
                            </div>

                            {task.reviews && task.reviews.length > 0 ? (
                                <div className={styles.reviewsList}>
                                    {task.reviews.map((review, index) => {
                                        const isCurrentUserReview = review.user?.id === user.id;

                                        return (
                                            <div
                                                key={review.id || index}
                                                className={`${styles.reviewItem} ${isCurrentUserReview ? styles.currentUserReview : ""
                                                    }`}
                                            >
                                                <div className={styles.reviewHeader}>
                                                    <div className={styles.reviewerInfo}>
                                                        <div className={styles.reviewerName}>
                                                            <ProfilePicture user={review.user} size="small" />
                                                            <span>{getUserDisplayName(review.user)}</span>
                                                        </div>
                                                        <div className={styles.reviewerRole}>
                                                            {getUserRoleBadge(review.user)}
                                                        </div>
                                                    </div>
                                                    <div className={styles.reviewRating}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <FaStar
                                                                key={i}
                                                                className={`${styles.reviewStar} ${i < review.rating ? styles.filled : ""
                                                                    }`}
                                                            />
                                                        ))}
                                                        <span className={styles.ratingValue}>
                                                            {review.rating}.0
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={styles.reviewDate}>
                                                    <FaCalendar /> {formatDate(review.created_at)}
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
                                    <p>No reviews yet. {canReview ? "Be the first to review this learning task!" : "Check back later for reviews."}</p>
                                </div>
                            )}
                        </div>

                        {/* Learning Task Information */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <FaEye />
                                <h3>Learning Task Information</h3>
                            </div>
                            <div className={styles.metadata}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Created:</span>
                                    <span className={styles.metaValue}>
                                        {formatDate(task.created_at)}
                                    </span>
                                </div>
                                {task.updated_at !== task.created_at && (
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
                                    <span className={`${styles.metaValue} ${task.is_public ? styles.public : styles.private
                                        }`}>
                                        {task.is_public ? "Public" : "Private"}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Task Owner:</span>
                                    <div className={styles.ownerInfo}>
                                        <ProfilePicture user={task.user} size="small" />
                                        <span className={styles.metaValue}>
                                            {getUserDisplayName(task.user)}
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