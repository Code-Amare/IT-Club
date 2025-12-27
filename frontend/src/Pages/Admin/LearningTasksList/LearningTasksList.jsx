import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import SideBar from "../../../Components/SideBar/SideBar";
import LearningTaskCard from "../../../Components/LearningTaskCard/LearningTaskCard";
import {
    FaSearch,
    FaFilter,
    FaTimes,
    FaTasks,
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

    // Fetch tasks
    useEffect(() => {
        fetchTasks();
        fetchLanguagesAndFrameworks();
    }, []);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/learning-task/");
            setTasks(response.data || []);
        } catch (error) {
            console.error("Error fetching learning tasks:", error);
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

    // Get language/framework name by ID
    const getLanguageName = (id) => {
        const lang = languages.find(l => l.id === id);
        return lang ? lang.name : `Language ${id}`;
    };

    const getFrameworkName = (id) => {
        const fw = frameworks.find(f => f.id === id);
        return fw ? fw.name : `Framework ${id}`;
    };

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(task => {
                // Get language/framework names for search
                const languageNames = task.languages ?
                    task.languages.map(id => getLanguageName(id).toLowerCase()).join(' ') : '';
                const frameworkNames = task.frameworks ?
                    task.frameworks.map(id => getFrameworkName(id).toLowerCase()).join(' ') : '';

                return (
                    (task.title?.toLowerCase().includes(query)) ||
                    (task.description?.toLowerCase().includes(query)) ||
                    (task.user?.toLowerCase().includes(query)) ||
                    (task.git_link?.toLowerCase().includes(query)) ||
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
            let aValue = a[filters.sortBy];
            let bValue = b[filters.sortBy];

            // Handle dates
            if (filters.sortBy === "created_at" || filters.sortBy === "updated_at") {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Handle likes count
            if (filters.sortBy === "likes_count") {
                aValue = a.likes_count || 0;
                bValue = b.likes_count || 0;
            }

            // Handle title sorting
            if (filters.sortBy === "title") {
                aValue = a.title?.toLowerCase() || "";
                bValue = b.title?.toLowerCase() || "";
            }

            if (filters.sortOrder === "asc") {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return result;
    }, [tasks, searchQuery, filters, languages, frameworks]);

    // Handle task actions
    const handleViewTask = (task) => {
        navigate(`/learning-task/${task.id}`);
    };

    const handleEditTask = (task) => {
        navigate(`/learning-task/edit/${task.id}`);
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await api.delete(`/api/learning-task/delete/${taskId}/`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            neonToast.success("Task deleted successfully", "success");
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

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get task status (derived from API data)
    const getTaskStatus = (task) => {
        if (task.reviews && task.reviews.length > 0) {
            return "graded";
        } else if (task.is_public) {
            return "submitted";
        } else {
            return "draft";
        }
    };

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaTasks className={styles.titleIcon} />
                            <div>
                                <h1>Learning Tasks</h1>
                                <p>Browse and evaluate programming tasks submitted by students</p>
                            </div>
                        </div>
                        {/* REMOVED CREATE BUTTON - Admins can only view and evaluate */}
                    </div>
                </div>

                {/* Search and Filters */}
                <div className={styles.filtersCard}>
                    <div className={styles.searchSection}>
                        <div className={styles.searchInputWrapper}>
                            <FaSearch className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search tasks by title, description, user, or technologies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            {searchQuery && (
                                <button
                                    className={styles.clearSearch}
                                    onClick={() => setSearchQuery("")}
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                        <div className={styles.filterControls}>
                            <button
                                className={styles.filterToggle}
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            >
                                <MdFilterList />
                                <span>Filters</span>
                            </button>
                            {(filters.visibility || filters.language || filters.framework || searchQuery) && (
                                <button
                                    className={styles.clearFilters}
                                    onClick={clearFilters}
                                >
                                    <FaTimes />
                                    <span>Clear All</span>
                                </button>
                            )}
                            <button
                                className={styles.refreshBtn}
                                onClick={fetchTasks}
                                disabled={loading}
                            >
                                <MdRefresh />
                                <span>Refresh</span>
                            </button>
                        </div>
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

                {/* Stats Bar */}
                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <FaTasks className={styles.statIcon} />
                        <div>
                            <span className={styles.statNumber}>{tasks.length}</span>
                            <span className={styles.statLabel}>Total Tasks</span>
                        </div>
                    </div>
                    <div className={styles.statItem}>
                        <FaGlobe className={styles.statIcon} />
                        <div>
                            <span className={styles.statNumber}>
                                {tasks.filter(t => t.is_public).length}
                            </span>
                            <span className={styles.statLabel}>Public</span>
                        </div>
                    </div>
                    <div className={styles.statItem}>
                        <FaStar className={styles.statIcon} />
                        <div>
                            <span className={styles.statNumber}>
                                {tasks.filter(t => t.reviews && t.reviews.length > 0).length}
                            </span>
                            <span className={styles.statLabel}>Reviewed</span>
                        </div>
                    </div>
                    <div className={styles.statItem}>
                        <FaCode className={styles.statIcon} />
                        <div>
                            <span className={styles.statNumber}>
                                {tasks.reduce((acc, task) => acc + (task.likes_count || 0), 0)}
                            </span>
                            <span className={styles.statLabel}>Total Likes</span>
                        </div>
                    </div>
                </div>

                {/* Tasks Grid */}
                <div className={styles.tasksCard}>
                    <div className={styles.tasksHeader}>
                        <h3>Learning Tasks ({filteredTasks.length})</h3>
                        <div className={styles.resultsInfo}>
                            Showing {filteredTasks.length} of {tasks.length} tasks
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Loading tasks...</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FaTasks size={48} />
                            <h3>No tasks found</h3>
                            <p>
                                {tasks.length === 0
                                    ? "No learning tasks available yet."
                                    : "Try adjusting your search or filters"}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.tasksGrid}>
                            {filteredTasks.map((task) => {
                                // Transform API data to match card component expectations
                                const cardTask = {
                                    id: task.id,
                                    title: task.title,
                                    description: task.description,
                                    githubLink: task.git_link,
                                    languages: task.languages ?
                                        task.languages.map(id => getLanguageName(id)) : [],
                                    frameworks: task.frameworks ?
                                        task.frameworks.map(id => getFrameworkName(id)) : [],
                                    status: getTaskStatus(task),
                                    // For graded tasks, use average rating from reviews
                                    grade: task.reviews && task.reviews.length > 0
                                        ? (task.reviews.reduce((acc, review) => acc + review.rating, 0) / task.reviews.length).toFixed(1)
                                        : null,
                                    adminFeedback: task.reviews && task.reviews.length > 0
                                        ? task.reviews[0].feedback
                                        : null,
                                    createdAt: formatDate(task.created_at),
                                    likes: task.likes_count || 0,
                                    reviews: task.reviews || [],
                                    is_public: task.is_public,
                                    is_rated: task.reviews && task.reviews.length > 0
                                };

                                return (
                                    <LearningTaskCard
                                        key={task.id}
                                        task={cardTask}
                                        isOwner={isOwner(task)}
                                        onView={() => handleViewTask(task)}
                                        onEdit={() => handleEditTask(task)}
                                        onDelete={() => handleDeleteTask(task.id)}
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