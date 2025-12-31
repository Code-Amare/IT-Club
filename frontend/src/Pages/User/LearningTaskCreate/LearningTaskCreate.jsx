import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    FaTimes
} from "react-icons/fa";
import {
    MdTitle,
    MdDescription,
    MdLanguage,
    MdCode
} from "react-icons/md";
import styles from "./LearningTaskCreate.module.css";

export default function LearningTaskCreate() {
    const navigate = useNavigate();
    const { user } = useUser();

    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [languages, setLanguages] = useState([]);
    const [frameworks, setFrameworks] = useState([]);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        git_link: "",
        is_public: false,
        languages: [],
        frameworks: []
    });

    // Check if user is allowed to create tasks (non-admin)
    useEffect(() => {
        if (user.isAuthenticated && user.is_staff) {
            neonToast.error("Admins cannot create learning tasks", "error");
            navigate("/learning-tasks");
        }
    }, [user, navigate]);

    // Fetch languages and frameworks
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [languagesResponse, frameworksResponse] = await Promise.all([
                api.get("/api/management/languages/"),
                api.get("/api/management/frameworks/")
            ]);
            setLanguages(languagesResponse.data || []);
            setFrameworks(frameworksResponse.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            neonToast.error("Failed to load languages and frameworks", "error");
        } finally {
            setLoadingData(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const handleLanguageSelect = (languageId) => {
        setFormData(prev => {
            const newLanguages = prev.languages.includes(languageId)
                ? prev.languages.filter(id => id !== languageId)
                : [...prev.languages, languageId];
            return { ...prev, languages: newLanguages };
        });
    };

    const handleFrameworkSelect = (frameworkId) => {
        setFormData(prev => {
            const newFrameworks = prev.frameworks.includes(frameworkId)
                ? prev.frameworks.filter(id => id !== frameworkId)
                : [...prev.frameworks, frameworkId];
            return { ...prev, frameworks: newFrameworks };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (formData.languages.length === 0) newErrors.languages = "Select at least one language";
        if (formData.git_link && !formData.git_link.startsWith("https://github.com/")) {
            newErrors.git_link = "GitHub link must start with https://github.com/";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            neonToast.error("Please fix the errors in the form", "error");
            return;
        }

        setLoading(true);
        try {
            const taskData = {
                ...formData,
                title: formData.title.trim(),
                description: formData.description.trim(),
                git_link: formData.git_link.trim() || null,
                languages: formData.languages,
                frameworks: formData.frameworks
            };

            await api.post("/api/learning-task/create/", taskData);
            neonToast.success("Learning task created successfully!", "success");
            navigate("/user/learning-tasks");

        } catch (error) {
            console.error("Error creating learning task:", error?.response?.data || error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                neonToast.error("Please fix the errors in the form", "error");
            } else if (error.response?.data?.non_field_errors) {
                neonToast.error(error.response.data.non_field_errors[0], "error");
            } else {
                neonToast.error(
                    error.response?.data?.error || "Failed to create learning task",
                    "error"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setFormData({
            title: "",
            description: "",
            git_link: "",
            is_public: false,
            languages: [],
            frameworks: []
        });
        setErrors({});
        window.scrollTo(0, 0);
        neonToast.info("Form cleared", "info");
    };

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
                            <FaArrowLeft /> Back to Tasks
                        </button>
                        <div className={styles.titleSection}>
                            <FaCode className={styles.titleIcon} />
                            <div>
                                <h1>Create Learning Task</h1>
                                <p>Create a new programming task to showcase your skills</p>
                            </div>
                        </div>
                    </div>
                </div>

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
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., E-commerce Website, Todo App, Weather Dashboard"
                                    className={errors.title ? styles.errorInput : ""}
                                    disabled={loading || loadingData}
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
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe your project, features, technologies used, and what you learned..."
                                    className={`${styles.textarea} ${errors.description ? styles.errorInput : ""}`}
                                    disabled={loading || loadingData}
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
                                        value={formData.git_link}
                                        onChange={handleChange}
                                        placeholder="https://github.com/username/repository"
                                        className={errors.git_link ? styles.errorInput : ""}
                                        disabled={loading || loadingData}
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
                                        checked={formData.is_public}
                                        onChange={handleChange}
                                        disabled={loading || loadingData}
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
                                    {formData.is_public ? (
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
                                    {loadingData ? (
                                        <div className={styles.loadingText}>
                                            Loading languages...
                                        </div>
                                    ) : languages.length === 0 ? (
                                        <div className={styles.emptyText}>
                                            No languages available
                                        </div>
                                    ) : (
                                        languages.map(language => (
                                            <button
                                                key={language.id}
                                                type="button"
                                                className={`${styles.selectionItem} ${formData.languages.includes(language.id) ? styles.selected : ""
                                                    }`}
                                                onClick={() => handleLanguageSelect(language.id)}
                                                disabled={loading}
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
                                                {formData.languages.includes(language.id) && (
                                                    <FaTimes className={styles.removeIcon} />
                                                )}
                                            </button>
                                        ))
                                    )}
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
                                    {loadingData ? (
                                        <div className={styles.loadingText}>
                                            Loading frameworks...
                                        </div>
                                    ) : frameworks.length === 0 ? (
                                        <div className={styles.emptyText}>
                                            No frameworks available
                                        </div>
                                    ) : (
                                        frameworks.map(framework => (
                                            <button
                                                key={framework.id}
                                                type="button"
                                                className={`${styles.selectionItem} ${formData.frameworks.includes(framework.id) ? styles.selected : ""
                                                    }`}
                                                onClick={() => handleFrameworkSelect(framework.id)}
                                                disabled={loading}
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
                                                {formData.frameworks.includes(framework.id) && (
                                                    <FaTimes className={styles.removeIcon} />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Selected Counts */}
                            <div className={styles.selectedCounts}>
                                <div className={styles.countItem}>
                                    <span className={styles.countLabel}>Languages:</span>
                                    <span className={styles.countValue}>
                                        {formData.languages.length} selected
                                    </span>
                                </div>
                                <div className={styles.countItem}>
                                    <span className={styles.countLabel}>Frameworks:</span>
                                    <span className={styles.countValue}>
                                        {formData.frameworks.length} selected
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={clearForm}
                            disabled={loading || loadingData}
                        >
                            Clear Form
                        </button>
                        <div className={styles.primaryActions}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => navigate("/user/learning-tasks")}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <AsyncButton
                                type="submit"
                                className={styles.primaryBtn}
                                loading={loading}
                                disabled={loading || loadingData}
                            >
                                <FaCode /> Create Learning Task
                            </AsyncButton>
                        </div>
                    </div>
                </form>
            </SideBar>
        </div>
    );
}