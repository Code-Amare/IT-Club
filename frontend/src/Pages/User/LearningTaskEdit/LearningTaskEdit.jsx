import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import ConfirmAction from "../../../Components/ConfirmAction/ConfirmAction";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    FaArrowLeft,
    FaCode,
    FaGlobe,
    FaLock,
    FaLink,
    FaPalette,
    FaTimes,
    FaTrash,
    FaSave,
    FaStar
} from "react-icons/fa";
import {
    MdTitle,
    MdDescription,
    MdLanguage,
    MdCode,
    MdEdit
} from "react-icons/md";
import styles from "./LearningTaskEdit.module.css";

export default function LearningTaskEdit() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [languages, setLanguages] = useState([]);
    const [frameworks, setFrameworks] = useState([]);
    const [errors, setErrors] = useState({});
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteError, setDeleteError] = useState("");

    const [task, setTask] = useState({
        title: "",
        description: "",
        git_link: "",
        is_public: false,
        languages: [],
        frameworks: [],
        is_rated: false,
        reviews: [],
        user: null
    });

    // Fetch task data
    useEffect(() => {
        fetchTaskData();
    }, [id]);

    const fetchTaskData = async () => {
        setFetching(true);
        try {
            // Fetch task
            const taskResponse = await api.get(`/api/learning-task/${id}/`);
            const taskData = taskResponse.data;

            // Check if task is rated
            if (taskData.is_rated || (taskData.reviews && taskData.reviews.length > 0)) {
                neonToast.error("This task has been rated and cannot be edited", "error");
                navigate(`/learning-task/${id}`);
                return;
            }

            // Check if user owns the task
            if (user.username !== taskData.user) {
                neonToast.error("You can only edit your own tasks", "error");
                navigate("/learning-tasks");
                return;
            }

            setTask({
                title: taskData.title || "",
                description: taskData.description || "",
                git_link: taskData.git_link || "",
                is_public: taskData.is_public || false,
                languages: taskData.languages || [],
                frameworks: taskData.frameworks || [],
                is_rated: taskData.is_rated || false,
                reviews: taskData.reviews || [],
                user: taskData.user
            });

            // Fetch languages and frameworks
            const [languagesResponse, frameworksResponse] = await Promise.all([
                api.get("/api/management/languages/"),
                api.get("/api/management/frameworks/")
            ]);
            setLanguages(languagesResponse.data || []);
            setFrameworks(frameworksResponse.data || []);

        } catch (error) {
            console.error("Error fetching task data:", error);
            if (error.response?.status === 404) {
                neonToast.error("Task not found", "error");
            } else {
                neonToast.error("Failed to load task data", "error");
            }
            navigate("/learning-tasks");
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTask(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const handleLanguageSelect = (languageId) => {
        setTask(prev => {
            const newLanguages = prev.languages.includes(languageId)
                ? prev.languages.filter(id => id !== languageId)
                : [...prev.languages, languageId];
            return { ...prev, languages: newLanguages };
        });
    };

    const handleFrameworkSelect = (frameworkId) => {
        setTask(prev => {
            const newFrameworks = prev.frameworks.includes(frameworkId)
                ? prev.frameworks.filter(id => id !== frameworkId)
                : [...prev.frameworks, frameworkId];
            return { ...prev, frameworks: newFrameworks };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!task.title.trim()) newErrors.title = "Title is required";
        if (!task.description.trim()) newErrors.description = "Description is required";
        if (task.languages.length === 0) newErrors.languages = "Select at least one language";
        if (task.git_link && !task.git_link.startsWith("https://github.com/")) {
            newErrors.git_link = "GitHub link must start with https://github.com/";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if task is rated
        if (task.is_rated || task.reviews.length > 0) {
            neonToast.error("This task has been rated and cannot be edited", "error");
            return;
        }

        if (!validateForm()) {
            neonToast.error("Please fix the errors in the form", "error");
            return;
        }

        setLoading(true);
        try {
            const taskData = {
                ...task,
                title: task.title.trim(),
                description: task.description.trim(),
                git_link: task.git_link.trim() || null,
                languages: task.languages,
                frameworks: task.frameworks
            };

            await api.patch(`/api/learning-task/edit/${id}/`, taskData);
            neonToast.success("Learning task updated successfully!", "success");
            navigate(`/learning-task/${id}`);

        } catch (error) {
            console.error("Error updating learning task:", error?.response?.data || error);
            if (error.response?.data?.error) {
                neonToast.error(error.response.data.error, "error");
            } else if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                neonToast.error("Please fix the errors in the form", "error");
            } else if (error.response?.data?.non_field_errors) {
                neonToast.error(error.response.data.non_field_errors[0], "error");
            } else {
                neonToast.error(
                    error.response?.data?.detail || "Failed to update learning task",
                    "error"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async () => {
        // Check if task is rated
        if (task.is_rated || task.reviews.length > 0) {
            neonToast.error("This task has been rated and cannot be deleted", "error");
            return false;
        }

        // Validate confirmation
        if (deleteConfirmation !== task.title) {
            setDeleteError(`Please type "${task.title}" exactly to confirm deletion.`);
            return false;
        }

        try {
            await api.delete(`/api/learning-task/delete/${id}/`);
            neonToast.success("Task deleted successfully", "success");
            navigate("/learning-tasks");
            return true;
        } catch (error) {
            console.error("Error deleting task:", error);
            if (error.response?.data?.error) {
                neonToast.error(error.response.data.error, "error");
            } else {
                neonToast.error("Failed to delete task", "error");
            }
            return false;
        }
    };

    const handleDeleteModalOpen = () => {
        setDeleteConfirmation("");
        setDeleteError("");
    };

    const getLanguageName = (id) => {
        const lang = languages.find(l => l.id === id);
        return lang ? lang.name : `Language ${id}`;
    };

    const getFrameworkName = (id) => {
        const fw = frameworks.find(f => f.id === id);
        return fw ? fw.name : `Framework ${id}`;
    };

    if (fetching) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingSpinner}></div>
                        <p>Loading task data...</p>
                    </div>
                </SideBar>
            </div>
        );
    }

    // Check if task is rated
    if (task.is_rated || task.reviews.length > 0) {
        return (
            <div className={styles.container}>
                <SideBar>
                    <div className={styles.ratedContainer}>
                        <div className={styles.ratedMessage}>
                            <FaStar className={styles.ratedIcon} />
                            <h2>Task Already Rated</h2>
                            <p>This task has been reviewed and rated. It can no longer be edited or deleted.</p>
                            <div className={styles.ratedActions}>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={() => navigate(`/learning-task/${id}`)}
                                >
                                    View Task
                                </button>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={() => navigate("/learning-tasks")}
                                >
                                    Back to Tasks
                                </button>
                            </div>
                        </div>
                    </div>
                </SideBar>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate(`/learning-task/${id}`)}
                        >
                            <FaArrowLeft /> Back to Task
                        </button>
                        <div className={styles.titleSection}>
                            <MdEdit className={styles.titleIcon} />
                            <div>
                                <h1>Edit Learning Task</h1>
                                <p>Make changes to your learning task</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Warning for rated tasks */}
                {task.reviews.length > 0 && (
                    <div className={styles.warningBanner}>
                        <FaStar />
                        <div>
                            <strong>Note:</strong> This task has been reviewed. Some changes may be restricted.
                        </div>
                    </div>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        {/* Left Column */}
                        <div className={styles.formColumn}>
                            {/* Title */}
                            <div className={styles.formGroup}>
                                <label htmlFor="title">
                                    <MdTitle /> Task Title <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={task.title}
                                    onChange={handleChange}
                                    placeholder="e.g., E-commerce Website, Todo App, Weather Dashboard"
                                    className={errors.title ? styles.errorInput : ""}
                                    disabled={loading || task.is_rated}
                                    maxLength={200}
                                />
                                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
                                <small className={styles.helpText}>
                                    A clear, descriptive title for your project (max 200 characters)
                                </small>
                            </div>

                            {/* Description */}
                            <div className={styles.formGroup}>
                                <label htmlFor="description">
                                    <MdDescription /> Description <span className={styles.required}>*</span>
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={task.description}
                                    onChange={handleChange}
                                    placeholder="Describe your project, features, technologies used, and what you learned..."
                                    className={`${styles.textarea} ${errors.description ? styles.errorInput : ""}`}
                                    disabled={loading || task.is_rated}
                                    rows={6}
                                    maxLength={2000}
                                />
                                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
                                <small className={styles.helpText}>
                                    Detailed description of your project (max 2000 characters)
                                </small>
                            </div>

                            {/* GitHub Link */}
                            <div className={styles.formGroup}>
                                <label htmlFor="git_link">
                                    <FaLink /> GitHub Repository Link
                                </label>
                                <div className={styles.inputWithIcon}>
                                    <FaLink className={styles.inputIcon} />
                                    <input
                                        type="url"
                                        id="git_link"
                                        name="git_link"
                                        value={task.git_link}
                                        onChange={handleChange}
                                        placeholder="https://github.com/username/repository"
                                        className={errors.git_link ? styles.errorInput : ""}
                                        disabled={loading || task.is_rated}
                                    />
                                </div>
                                {errors.git_link && <span className={styles.errorText}>{errors.git_link}</span>}
                                <small className={styles.helpText}>
                                    Optional: Link to your GitHub repository
                                </small>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className={styles.formColumn}>
                            {/* Visibility */}
                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="is_public"
                                        checked={task.is_public}
                                        onChange={handleChange}
                                        disabled={loading || task.is_rated}
                                    />
                                    <span className={styles.checkboxCustom}></span>
                                    <div className={styles.checkboxContent}>
                                        <div className={styles.checkboxTitle}>
                                            <FaGlobe /> Make this task public
                                        </div>
                                        <div className={styles.checkboxDescription}>
                                            Public tasks are visible to everyone and can be reviewed by admins
                                        </div>
                                    </div>
                                </label>
                                <div className={styles.visibilityNote}>
                                    {task.is_public ? (
                                        <>
                                            <FaGlobe className={styles.publicIcon} />
                                            <span>This task will be visible to everyone</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaLock className={styles.privateIcon} />
                                            <span>This task is private (only you can see it)</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Languages */}
                            <div className={styles.formGroup}>
                                <label>
                                    <MdLanguage /> Programming Languages <span className={styles.required}>*</span>
                                </label>
                                {errors.languages && <span className={styles.errorText}>{errors.languages}</span>}
                                <small className={styles.helpText}>
                                    Select all programming languages used in this task
                                </small>

                                <div className={styles.selectionGrid}>
                                    {languages.map(language => (
                                        <button
                                            key={language.id}
                                            type="button"
                                            className={`${styles.selectionItem} ${task.languages.includes(language.id) ? styles.selected : ""
                                                }`}
                                            onClick={() => !task.is_rated && handleLanguageSelect(language.id)}
                                            disabled={loading || task.is_rated}
                                        >
                                            <div className={styles.selectionIcon}>
                                                <FaPalette style={{ color: language.color }} />
                                            </div>
                                            <div className={styles.selectionInfo}>
                                                <span className={styles.selectionName}>
                                                    {language.name}
                                                </span>
                                                <span className={styles.selectionCode}>
                                                    {language.code}
                                                </span>
                                            </div>
                                            {task.languages.includes(language.id) && (
                                                <FaTimes className={styles.removeIcon} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frameworks */}
                            <div className={styles.formGroup}>
                                <label>
                                    <MdCode /> Frameworks & Libraries
                                </label>
                                <small className={styles.helpText}>
                                    Optional: Select frameworks and libraries used
                                </small>

                                <div className={styles.selectionGrid}>
                                    {frameworks.map(framework => (
                                        <button
                                            key={framework.id}
                                            type="button"
                                            className={`${styles.selectionItem} ${task.frameworks.includes(framework.id) ? styles.selected : ""
                                                }`}
                                            onClick={() => !task.is_rated && handleFrameworkSelect(framework.id)}
                                            disabled={loading || task.is_rated}
                                        >
                                            <div className={styles.selectionIcon}>
                                                <MdCode />
                                            </div>
                                            <div className={styles.selectionInfo}>
                                                <span className={styles.selectionName}>
                                                    {framework.name}
                                                </span>
                                                <span className={styles.selectionLanguage}>
                                                    {framework.language?.name}
                                                </span>
                                            </div>
                                            {task.frameworks.includes(framework.id) && (
                                                <FaTimes className={styles.removeIcon} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selected Counts */}
                            <div className={styles.selectedCounts}>
                                <div className={styles.countItem}>
                                    <span className={styles.countLabel}>Languages:</span>
                                    <span className={styles.countValue}>
                                        {task.languages.length} selected
                                    </span>
                                </div>
                                <div className={styles.countItem}>
                                    <span className={styles.countLabel}>Frameworks:</span>
                                    <span className={styles.countValue}>
                                        {task.frameworks.length} selected
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className={styles.formActions}>
                        <div className={styles.leftActions}>
                            <ConfirmAction
                                onConfirm={handleDeleteTask}
                                onOpen={handleDeleteModalOpen}
                                title="Delete Learning Task"
                                message={
                                    <div className={styles.deleteConfirmation}>
                                        <p>Are you sure you want to delete <strong>"{task.title}"</strong>? This action cannot be undone.</p>
                                        <div className={styles.confirmationInputGroup}>
                                            <label htmlFor="deleteConfirmation">
                                                Type <strong>"{task.title}"</strong> to confirm:
                                            </label>
                                            <input
                                                type="text"
                                                id="deleteConfirmation"
                                                value={deleteConfirmation}
                                                onChange={(e) => {
                                                    setDeleteConfirmation(e.target.value);
                                                    setDeleteError("");
                                                }}
                                                placeholder={`Type "${task.title}" here`}
                                                className={`${styles.confirmationInput} ${deleteError ? styles.errorInput : ""}`}
                                                autoComplete="off"
                                            />
                                            {deleteError && (
                                                <span className={styles.errorText}>{deleteError}</span>
                                            )}
                                        </div>
                                    </div>
                                }
                                confirmText="Delete Task"
                                cancelText="Cancel"
                                confirmButtonProps={{
                                    disabled: deleteConfirmation !== task.title || task.is_rated
                                }}
                            >
                                <button
                                    type="button"
                                    className={styles.dangerBtn}
                                    disabled={loading || task.is_rated}
                                >
                                    <FaTrash /> Delete Task
                                </button>
                            </ConfirmAction>
                        </div>

                        <div className={styles.rightActions}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => navigate(`/learning-task/${id}`)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <AsyncButton
                                type="submit"
                                className={styles.primaryBtn}
                                loading={loading}
                                disabled={loading || task.is_rated}
                            >
                                <FaSave /> Update Task
                            </AsyncButton>
                        </div>
                    </div>
                </form>
            </SideBar>
        </div>
    );
}