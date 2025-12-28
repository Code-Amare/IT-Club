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
    FaEyeSlash
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
    const [languages, setLanguages] = useState([]);
    const [frameworks, setFrameworks] = useState([]);
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
            const taskData = taskResponse.data;

            // Check if user liked this task
            if (user.isAuthenticated) {
                try {
                    // We need to check if user liked this task
                    // You might need to implement an endpoint to check if user liked a task
                    // For now, we'll assume we have this data in the task response
                    setLiked(taskData.user_has_liked || false);
                } catch (error) {
                    console.error("Error checking like status:", error);
                }
            }

            setTask(taskData);
            setLikeCount(taskData.likes_count || 0);

            // Check if current user has already reviewed this task
            if (user.isAuthenticated && taskData.reviews) {
                const existingReview = taskData.reviews.find(
                    review => review.user_id === user.id
                );
                if (existingReview) {
                    setUserReview(existingReview);
                    setReviewForm({
                        rating: existingReview.rating,
                        feedback: existingReview.feedback || ""
                    });
                }
            }

            // Fetch languages and frameworks for names
            const [languagesResponse, frameworksResponse] = await Promise.all([
                api.get("/api/management/languages/"),
                api.get("/api/management/frameworks/")
            ]);
            setLanguages(languagesResponse.data || []);
            setFrameworks(frameworksResponse.data || []);

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
        console.log(task)
        if (!user.isAuthenticated) {
            neonToast.error("Please login to like learning tasks", "error");
            return;
        }

        try {
            const response = await api.post(`/api/learning-task/like/${id}/`);
            setLiked(response.data.action === "liked");
            setLikeCount(response.data.total_likes);

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
        if (reviewErrors[name]) setReviewErrors(prev => ({ ...prev, [name]: "" }));
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

    // Submit review
    const handleSubmitReview = async (e) => {
        e.preventDefault();

        // Check if user is admin/staff
        if (!user.is_staff) {
            neonToast.error("Only admins and staff can submit reviews", "error");
            return;
        }

        // Check if user is task owner
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
            const endpoint = userReview
                ? `/api/learning-task/review/edit/${id}/`
                : `/api/learning-task/review/create/${id}/`;

            const method = userReview ? "patch" : "post";

            await api[method](endpoint, {
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
                    error.response?.data?.detail || "Failed to submit review",
                    "error"
                );
            }
        } finally {
            setSubmittingReview(false);
        }
    };

    // Get language/framework name by ID
    const getLanguageName = (id) => {
        const lang = languages.find(l => l.id === id);
        return lang ? lang.name : `Language ${id}`;
    };

    const getFrameworkName = (id) => {
        const fw = frameworks.find(f => f.id === id);
        return fw ? fw.name : `Framework ${id}`;
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
            return userObj.full_name || userObj.username || "Unknown User";
        }
        return String(userObj);
    };

    // Profile picture component
    const ProfilePicture = ({ user, size = "small" }) => {
        const sizeClass = size === "small" ? styles.profilePicSmall : styles.profilePicMedium;

        if (user?.profile_pic_url) {
            return (
                <img
                    src={user.profile_pic_url}
                    alt={getUserDisplayName(user)}
                    className={`${styles.profilePic} ${sizeClass}`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
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

    // Get user role badge
    const getUserRoleBadge = (reviewUser, isAdmin) => {
        if (isAdmin) {
            return <span className={styles.roleBadgeAdmin}>Admin</span>;
        } else if (reviewUser && task?.user && reviewUser.id === task.user.id) {
            return <span className={styles.roleBadgeOwner}>Learning Task Owner</span>;
        } else {
            return <span className={styles.roleBadgeUser}>User</span>;
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

    const isOwner = user.id === task.user.id;
    const canReview = user.is_staff && !isOwner && task.is_public;

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
                                >
                                    <FaThumbsUp />
                                    <span>{likeCount}</span>
                                </button>

                                {/* Edit for owner */}
                                {isOwner && !task.is_rated && (
                                    <>
                                        <button
                                            className={styles.editBtn}
                                            onClick={() => navigate(`/user/learning-task/edit/${id}`)}
                                            title="Edit learning task"
                                        >
                                            <FaEdit />
                                        </button>

                                    </>
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
                                        task.languages.map(langId => {
                                            const lang = languages.find(l => l.id === langId);
                                            return (
                                                <div key={langId} className={styles.techItem}>
                                                    <div
                                                        className={styles.techColor}
                                                        style={{ backgroundColor: lang?.color || "#3b82f6" }}
                                                    />
                                                    <span className={styles.techName}>
                                                        {getLanguageName(langId)}
                                                    </span>
                                                    {lang && (
                                                        <span className={styles.techCode}>
                                                            {lang.code}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
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
                                        {task.frameworks.map(fwId => {
                                            const fw = frameworks.find(f => f.id === fwId);
                                            return (
                                                <div key={fwId} className={styles.techItem}>
                                                    <MdCode className={styles.frameworkIcon} />
                                                    <span className={styles.techName}>
                                                        {getFrameworkName(fwId)}
                                                    </span>
                                                    {fw?.language && (
                                                        <span className={styles.techLanguage}>
                                                            {fw.language.name}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                        {task.is_rated ? "Yes" : "No"}
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
                        {/* Review Form (for admins/staff) */}
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
                                            placeholder="Provide detailed feedback about the learning task..."
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
                                        const isCurrentUserReview = review.user_id === user.id;

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
                                                            {getUserRoleBadge(review.user, review.is_admin)}
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
                                    <span className={`${styles.metaValue} ${task.is_rated ? styles.rated : styles.notRated
                                        }`}>
                                        {task.is_rated ? "Rated" : "Not Rated"}
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
                                    <span className={styles.metaLabel}>Learning Task Owner:</span>
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