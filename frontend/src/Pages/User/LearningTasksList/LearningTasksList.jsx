import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import SideBar from "../../../Components/SideBar/SideBar";
import LearningTaskCard from "../../../Components/LearningTaskCard/LearningTaskCard";
import {
    FaSearch,
    FaFilter,
    FaPlus,
    FaTimes,
    FaTasks,
    FaCheckCircle,
    FaClock,
    FaEdit,
    FaExclamationTriangle,
    FaUser,
    FaGlobe,
    FaStar,
    FaCode
} from "react-icons/fa";
import {
    MdRefresh,
    MdFilterList
} from "react-icons/md";
import styles from "./LearningTasksList.module.css";

export default function LearningTasksList() {
    const { user } = useUser();
    const navigate = useNavigate();

    // State
    const [tasks, setTasks] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [frameworks, setFrameworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingLanguages, setLoadingLanguages] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        visibility: "",
        language: "",
        framework: "",
        sortBy: "created_at",
        sortOrder: "desc"
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        public: 0,
        reviewed: 0,
        totalLikes: 0
    });

    // Fetch tasks
    useEffect(() => {
        fetchTasks();
        fetchLanguagesAndFrameworks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/learning-task/all/");
            const tasksData = response.data.tasks || [];
            setTasks(tasksData);

            // Calculate stats
            const publicTasks = tasksData.filter(t => t.is_public).length;
            const reviewedTasks = tasksData.filter(t => t.reviews && t.reviews.length > 0).length;
            const totalLikes = tasksData.reduce((acc, task) => acc + (task.likes_count || 0), 0);

            setStats({
                total: tasksData.length,
                public: publicTasks,
                reviewed: reviewedTasks,
                totalLikes: totalLikes
            });

            if (tasksData.length === 0) {
                neonToast.info("No learning tasks available yet.", "info");
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
            neonToast.error("Failed to load learning tasks", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchLanguagesAndFrameworks = async () => {
        setLoadingLanguages(true);
        try {
            const [langResponse, fwResponse] = await Promise.all([
                api.get("/api/management/languages/"),
                api.get("/api/management/frameworks/")
            ]);
            setLanguages(langResponse.data || []);
            setFrameworks(fwResponse.data || []);
        } catch (error) {
            console.error("Error fetching languages and frameworks:", error);
        } finally {
            setLoadingLanguages(false);
        }
    };

    // Helper function to get language name
    const getLanguageName = (languageId) => {
        const lang = languages.find(l => l.id === languageId);
        return lang ? lang.name : "Unknown";
    };

    // Helper function to get framework name
    const getFrameworkName = (frameworkId) => {
        const fw = frameworks.find(f => f.id === frameworkId);
        return fw ? fw.name : "Unknown";
    };

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(task => {
                const languageNames = task.languages
                    ? task.languages.map(id => getLanguageName(id).toLowerCase()).join(' ')
                    : '';
                const frameworkNames = task.frameworks
                    ? task.frameworks.map(id => getFrameworkName(id).toLowerCase()).join(' ')
                    : '';

                return (
                    (task.title?.toLowerCase().includes(query)) ||
                    (task.description?.toLowerCase().includes(query)) ||
                    (task.user?.toLowerCase().includes(query)) ||
                    languageNames.includes(query) ||
                    frameworkNames.includes(query)
                );
            });
        }

        // Apply filters
        if (filters.visibility) {
            if (filters.visibility === "public") {
                result = result.filter(task => task.is_public === true);
            } else if (filters.visibility === "private") {
                result = result.filter(task => task.is_public === false);
            }
        }

        if (filters.language) {
            const languageId = parseInt(filters.language);
            result = result.filter(task =>
                task.languages && task.languages.includes(languageId)
            );
        }

        if (filters.framework) {
            const frameworkId = parseInt(filters.framework);
            result = result.filter(task =>
                task.frameworks && task.frameworks.includes(frameworkId)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aValue, bValue;

            switch (filters.sortBy) {
                case "created_at":
                case "updated_at":
                    aValue = new Date(a[filters.sortBy]).getTime();
                    bValue = new Date(b[filters.sortBy]).getTime();
                    break;
                case "likes_count":
                    aValue = a.likes_count || 0;
                    bValue = b.likes_count || 0;
                    break;
                case "title":
                    aValue = a.title?.toLowerCase() || "";
                    bValue = b.title?.toLowerCase() || "";
                    break;
                default:
                    aValue = a[filters.sortBy];
                    bValue = b[filters.sortBy];
            }

            if (filters.sortOrder === "asc") {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return result;
    }, [tasks, searchQuery, filters, languages, frameworks]);

    // Transform API task to card task format
    const transformTaskForCard = (task) => {
        // Find admin review
        const adminReview = task.reviews?.find(review => review.user?.is_staff || review.is_admin);
        const grade = adminReview?.rating || 0;

        // Determine status
        let status = task.status;
        if (task.status === "rated") status = "graded";
        if (task.status === "under_review") status = "submitted";
        if (!status) {
            status = task.is_public ? "submitted" : "draft";
        }

        return {
            id: task.id,
            title: task.title,
            description: task.description,
            githubLink: task.git_link || "",
            languages: task.languages?.map(id => getLanguageName(id)) || [],
            frameworks: task.frameworks?.map(id => getFrameworkName(id)) || [],
            status: status,
            grade: grade,
            adminFeedback: adminReview?.feedback || "",
            createdAt: new Date(task.created_at).toLocaleDateString(),
            likes_count: task.likes_count || 0,
            is_public: task.is_public || false,
            user: task.user_info || task.user,
            profile: task.profile_info || {}
        };
    };

    // Handle task actions
    const handleViewTask = (task) => {
        navigate(`/user/learning-task/${task.id}`);
    };

    const handleEditTask = (task) => {
        if (task.status === "draft") {
            navigate(`/user/learning-task/edit/${task.id}`);
        } else {
            neonToast.error("Only draft tasks can be edited", "error");
        }
    };

    const handleDeleteTask = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);

        // Check if task is draft and user is owner
        const isOwner = user.username === task?.user;
        if (!isOwner) {
            neonToast.error("You can only delete your own tasks", "error");
            return;
        }

        if (task?.status !== "draft") {
            neonToast.error("Only draft tasks can be deleted", "error");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this task?")) {
            return;
        }

        try {
            await api.delete(`/api/learning-task/${taskId}/`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            neonToast.success("Task deleted successfully", "success");

            // Refresh stats
            fetchTasks();
        } catch (error) {
            console.error("Error deleting task:", error);
            if (error.response?.data?.error) {
                neonToast.error(error.response.data.error, "error");
            } else {
                neonToast.error("Failed to delete task", "error");
            }
        }
    };

    // Check if user owns the task
    const isOwner = (task) => {
        return user.username === task.user;
    };

    // Check if user can create tasks (only non-admin students)
    const canCreateTask = () => {
        return user.isAuthenticated && !user.is_staff;
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            visibility: "",
            language: "",
            framework: "",
            sortBy: "created_at",
            sortOrder: "desc"
        });
        setSearchQuery("");
        setShowAdvancedFilters(false);
    };

    // Toggle sort order
    const toggleSort = (field) => {
        setFilters(prev => ({
            ...prev,
            sortBy: field,
            sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc"
        }));
    };

    return (
        <div className={styles.container}>
            <SideBar>
                <div className={styles.LearningTasksList}>
                    {/* Header */}
                    <header className={styles.header}>
                        <div className={styles.headerContent}>
                            <div className={styles.headerText}>
                                <h1>Learning Tasks</h1>
                                <p className={styles.subtitle}>
                                    Browse and explore tasks from the community
                                </p>
                            </div>
                            <div className={styles.headerActions}>
                                {canCreateTask() && (
                                    <Link
                                        to="/user/learning-task/create"
                                        className={styles.primaryBtn}
                                    >
                                        <FaPlus />
                                        <span className={styles.btnTextFull}>Create Task</span>
                                        <span className={styles.btnTextShort}>Create</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Stats Bar */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <FaTasks />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Total Tasks</h3>
                                <p className={styles.statValue}>{stats.total}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                <FaGlobe />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Public</h3>
                                <p className={styles.statValue}>{stats.public}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                <FaCheckCircle />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Reviewed</h3>
                                <p className={styles.statValue}>{stats.reviewed}</p>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                                <FaStar />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Total Likes</h3>
                                <p className={styles.statValue}>{stats.totalLikes}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className={styles.filtersCard}>
                        <div className={styles.searchSection}>
                            <div className={styles.searchInputWrapper}>
                                <FaSearch className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                />
                                {searchQuery && (
                                    <button
                                        className={styles.clearSearch}
                                        onClick={() => setSearchQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={styles.filterControls}>
                            <button
                                className={styles.filterToggle}
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            >
                                <MdFilterList />
                                <span>Filters</span>
                                {showAdvancedFilters ? <FaTimes /> : <FaFilter />}
                            </button>
                            <button
                                className={styles.refreshBtn}
                                onClick={fetchTasks}
                                disabled={loading}
                            >
                                <MdRefresh />
                                <span>Refresh</span>
                            </button>
                            {(searchQuery || filters.visibility || filters.language || filters.framework) && (
                                <button
                                    className={styles.clearFilters}
                                    onClick={clearFilters}
                                >
                                    <FaTimes />
                                    <span>Clear All</span>
                                </button>
                            )}
                        </div>

                        {/* Advanced Filters */}
                        {showAdvancedFilters && (
                            <div className={styles.advancedFilters}>
                                <div className={styles.filterGrid}>
                                    <div className={styles.filterGroup}>
                                        <label>Visibility</label>
                                        <select
                                            value={filters.visibility}
                                            onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                                        >
                                            <option value="">All Tasks</option>
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </div>

                                    <div className={styles.filterGroup}>
                                        <label>Language</label>
                                        <select
                                            value={filters.language}
                                            onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                                            disabled={loadingLanguages || languages.length === 0}
                                        >
                                            <option value="">All Languages</option>
                                            {languages.map(lang => (
                                                <option key={lang.id} value={lang.id}>
                                                    {lang.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.filterGroup}>
                                        <label>Framework</label>
                                        <select
                                            value={filters.framework}
                                            onChange={(e) => setFilters(prev => ({ ...prev, framework: e.target.value }))}
                                            disabled={loadingLanguages || frameworks.length === 0}
                                        >
                                            <option value="">All Frameworks</option>
                                            {frameworks.map(fw => (
                                                <option key={fw.id} value={fw.id}>
                                                    {fw.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.filterGroup}>
                                        <label>Sort By</label>
                                        <select
                                            value={`${filters.sortBy}-${filters.sortOrder}`}
                                            onChange={(e) => {
                                                const [sortBy, sortOrder] = e.target.value.split('-');
                                                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                                            }}
                                        >
                                            <option value="created_at-desc">Newest First</option>
                                            <option value="created_at-asc">Oldest First</option>
                                            <option value="likes_count-desc">Most Liked</option>
                                            <option value="likes_count-asc">Least Liked</option>
                                            <option value="title-asc">Title A-Z</option>
                                            <option value="title-desc">Title Z-A</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results Header */}
                    <div className={styles.resultsHeader}>
                        <div className={styles.resultsInfo}>
                            <h3>Learning Tasks ({filteredTasks.length})</h3>
                            <p>Showing {filteredTasks.length} of {tasks.length} tasks</p>
                        </div>
                        <div className={styles.sortControls}>
                            <span>Sorted by: </span>
                            <button
                                className={`${styles.sortBtn} ${filters.sortBy === 'created_at' ? styles.active : ''}`}
                                onClick={() => toggleSort('created_at')}
                            >
                                Date {filters.sortBy === 'created_at' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                            </button>
                            <button
                                className={`${styles.sortBtn} ${filters.sortBy === 'likes_count' ? styles.active : ''}`}
                                onClick={() => toggleSort('likes_count')}
                            >
                                Likes {filters.sortBy === 'likes_count' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Loading tasks...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaTasks className={styles.emptyIcon} />
                            <h3>No tasks found</h3>
                            <p>
                                {tasks.length === 0
                                    ? "No learning tasks available yet."
                                    : "Try adjusting your search or filters"}
                            </p>
                            {canCreateTask() && tasks.length === 0 && (
                                <Link
                                    to="/user/learning-task/create"
                                    className={styles.createTaskBtn}
                                >
                                    <FaPlus />
                                    Create First Task
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className={styles.tasksGrid}>
                            {filteredTasks.map((task) => {
                                const cardTask = transformTaskForCard(task);
                                const owner = isOwner(task);

                                return (
                                    <LearningTaskCard
                                        key={task.id}
                                        task={cardTask}
                                        isOwner={owner}
                                        onView={() => handleViewTask(task)}
                                        onEdit={owner ? () => handleEditTask(task) : undefined}
                                        onDelete={owner ? () => handleDeleteTask(task.id) : undefined}
                                        loadingDelete={false}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
}