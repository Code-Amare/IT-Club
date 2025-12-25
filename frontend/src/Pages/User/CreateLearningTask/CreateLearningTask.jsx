import styles from "./CreateLearningTask.module.css";
import SideBar from "../../../Components/SideBar/SideBar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaSave,
    FaPaperPlane,
    FaCode,
    FaLayerGroup,
    FaLink,
    FaExclamationCircle,
    FaCheckCircle,
    FaSpinner,
    FaTimes,
    FaInfoCircle,
    FaSearch,
} from "react-icons/fa";

const CreateLearningTask = () => {
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        languages: [], // Changed from language to languages (array)
        frameworks: [],
        githubLink: "",
        status: "draft"
    });

    // Mock data for languages and frameworks
    const [allLanguages, setAllLanguages] = useState([]);
    const [allFrameworks, setAllFrameworks] = useState([]);
    const [taskLimit, setTaskLimit] = useState(null);
    const [isLoading, setIsLoading] = useState({
        languages: true,
        frameworks: true,
        limit: true
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Search filters
    const [languageSearch, setLanguageSearch] = useState("");
    const [frameworkSearch, setFrameworkSearch] = useState("");

    // Mock API calls on component mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading({ languages: true, frameworks: true, limit: true });

            try {
                // Mock fetch for languages
                await new Promise(resolve => setTimeout(resolve, 600));
                setAllLanguages([
                    { id: 1, name: "JavaScript", color: "#f7df1e", popularity: 95 },
                    { id: 2, name: "TypeScript", color: "#3178c6", popularity: 80 },
                    { id: 3, name: "Python", color: "#3776ab", popularity: 90 },
                    { id: 4, name: "Java", color: "#007396", popularity: 75 },
                    { id: 5, name: "C++", color: "#00599c", popularity: 60 },
                    { id: 6, name: "Go", color: "#00add8", popularity: 70 },
                    { id: 7, name: "Rust", color: "#000000", popularity: 65 },
                    { id: 8, name: "PHP", color: "#777bb4", popularity: 55 },
                    { id: 9, name: "Ruby", color: "#cc342d", popularity: 50 },
                    { id: 10, name: "Swift", color: "#fa7343", popularity: 65 },
                    { id: 11, name: "Kotlin", color: "#7F52FF", popularity: 70 },
                    { id: 12, name: "C#", color: "#239120", popularity: 75 },
                    { id: 13, name: "Dart", color: "#0175C2", popularity: 60 },
                    { id: 14, name: "Scala", color: "#DC3220", popularity: 45 },
                    { id: 15, name: "R", color: "#276DC3", popularity: 40 }
                ]);
                setIsLoading(prev => ({ ...prev, languages: false }));

                // Mock fetch for frameworks
                await new Promise(resolve => setTimeout(resolve, 400));
                setAllFrameworks([
                    { id: 1, name: "React", language: "JavaScript", category: "Frontend" },
                    { id: 2, name: "Vue.js", language: "JavaScript", category: "Frontend" },
                    { id: 3, name: "Angular", language: "TypeScript", category: "Frontend" },
                    { id: 4, name: "Express", language: "JavaScript", category: "Backend" },
                    { id: 5, name: "Django", language: "Python", category: "Backend" },
                    { id: 6, name: "Flask", language: "Python", category: "Backend" },
                    { id: 7, name: "Spring Boot", language: "Java", category: "Backend" },
                    { id: 8, name: "Laravel", language: "PHP", category: "Backend" },
                    { id: 9, name: "Ruby on Rails", language: "Ruby", category: "Backend" },
                    { id: 10, name: "Next.js", language: "JavaScript", category: "Fullstack" },
                    { id: 11, name: "Nuxt.js", language: "JavaScript", category: "Fullstack" },
                    { id: 12, name: "Svelte", language: "JavaScript", category: "Frontend" },
                    { id: 13, name: "FastAPI", language: "Python", category: "Backend" },
                    { id: 14, name: "NestJS", language: "TypeScript", category: "Backend" },
                    { id: 15, name: "React Native", language: "JavaScript", category: "Mobile" },
                    { id: 16, name: "Flutter", language: "Dart", category: "Mobile" },
                    { id: 17, name: "TensorFlow", language: "Python", category: "AI/ML" },
                    { id: 18, name: "PyTorch", language: "Python", category: "AI/ML" },
                    { id: 19, name: "ASP.NET", language: "C#", category: "Backend" },
                    { id: 20, name: "jQuery", language: "JavaScript", category: "Frontend" }
                ]);
                setIsLoading(prev => ({ ...prev, frameworks: false }));

                // Mock fetch for task limit
                await new Promise(resolve => setTimeout(resolve, 300));
                setTaskLimit({
                    maxTasks: 5,
                    currentTasks: 3, // Mock: user already has 3 tasks
                    remainingTasks: 2,
                    canCreateMore: true
                });
                setIsLoading(prev => ({ ...prev, limit: false }));
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    // Filter languages based on search
    const filteredLanguages = allLanguages.filter(lang =>
        lang.name.toLowerCase().includes(languageSearch.toLowerCase())
    );

    // Filter frameworks based on search and selected languages
    const filteredFrameworks = allFrameworks.filter(fw => {
        const matchesSearch = fw.name.toLowerCase().includes(frameworkSearch.toLowerCase()) ||
            fw.category.toLowerCase().includes(frameworkSearch.toLowerCase());

        // If languages are selected, show frameworks that match any selected language
        if (formData.languages.length > 0) {
            return matchesSearch && formData.languages.some(langId => {
                const lang = allLanguages.find(l => l.id === langId);
                return lang && fw.language === lang.name;
            });
        }

        return matchesSearch;
    });

    // Check if user can create more tasks
    const canCreateTask = taskLimit?.canCreateMore && taskLimit?.remainingTasks > 0;

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    // Handle language selection (multi-select)
    const handleLanguageToggle = (languageId) => {
        setFormData(prev => {
            const isSelected = prev.languages.includes(languageId);
            const updatedLanguages = isSelected
                ? prev.languages.filter(id => id !== languageId)
                : [...prev.languages, languageId];

            return { ...prev, languages: updatedLanguages };
        });
    };

    // Handle framework selection
    const handleFrameworkToggle = (frameworkId) => {
        setFormData(prev => {
            const isSelected = prev.frameworks.includes(frameworkId);
            const updatedFrameworks = isSelected
                ? prev.frameworks.filter(id => id !== frameworkId)
                : [...prev.frameworks, frameworkId];

            return { ...prev, frameworks: updatedFrameworks };
        });
    };

    // Validate form
    const validateForm = (isSubmit = false) => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required";
        } else if (formData.title.length < 5) {
            newErrors.title = "Title must be at least 5 characters";
        }

        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        } else if (formData.description.length < 20) {
            newErrors.description = "Description must be at least 20 characters";
        }

        if (formData.languages.length === 0) {
            newErrors.languages = "Please select at least one language";
        }

        if (isSubmit && !formData.githubLink.trim()) {
            newErrors.githubLink = "GitHub link is required for submission";
        } else if (formData.githubLink && !isValidGitHubUrl(formData.githubLink)) {
            newErrors.githubLink = "Please enter a valid GitHub URL";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Validate GitHub URL
    const isValidGitHubUrl = (url) => {
        const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\/)?$/;
        return githubRegex.test(url);
    };

    // Handle save as draft
    const handleSaveDraft = async () => {
        if (!validateForm(false)) return;

        setIsSubmitting(true);

        // Mock API call to save as draft
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Saving as draft:", {
            ...formData,
            status: "draft"
        });

        setIsSubmitting(false);
        setSubmitSuccess(true);

        // Redirect after success
        setTimeout(() => {
            navigate("/user/my-learning-task");
        }, 1500);
    };

    // Handle submit for review
    const handleSubmit = async () => {
        if (!validateForm(true)) return;

        setIsSubmitting(true);

        // Mock API call to submit for review
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log("Submitting for review:", {
            ...formData,
            status: formData.githubLink ? "submitted" : "draft"
        });

        setIsSubmitting(false);
        setSubmitSuccess(true);

        // Redirect after success
        setTimeout(() => {
            navigate("/learning-tasks");
        }, 1500);
    };

    // Get selected language names
    const selectedLanguageNames = formData.languages
        .map(id => allLanguages.find(lang => lang.id === id)?.name)
        .filter(Boolean);

    // Get selected framework names
    const selectedFrameworkNames = formData.frameworks
        .map(id => allFrameworks.find(fw => fw.id === id)?.name)
        .filter(Boolean);

    // Loading skeleton
    if (isLoading.limit) {
        return (
            <div className={styles.CreateLearningTaskContainer}>
                <SideBar>
                    <div className={styles.CreateLearningTask}>
                        <div className={styles.loadingState}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Loading task limits and options...</p>
                        </div>
                    </div>
                </SideBar>
            </div>
        );
    }

    // Check if user has reached task limit
    if (!canCreateTask) {
        return (
            <div className={styles.CreateLearningTaskContainer}>
                <SideBar>
                    <div className={styles.CreateLearningTask}>
                        <header className={styles.header}>
                            <button className={styles.backButton} onClick={() => navigate("/user/my-learning-task")}>
                                <FaArrowLeft />
                                <span>Back to Tasks</span>
                            </button>
                            <h1>Create Learning Task</h1>
                        </header>

                        <div className={styles.limitReachedContainer}>
                            <div className={styles.limitReachedIcon}>
                                <FaExclamationCircle />
                            </div>
                            <h2>Task Limit Reached</h2>
                            <p>
                                You have reached your maximum limit of <strong>{taskLimit?.maxTasks}</strong> learning tasks.
                                You currently have <strong>{taskLimit?.currentTasks}</strong> active tasks.
                            </p>
                            <div className={styles.limitStats}>
                                <div className={styles.limitStat}>
                                    <span className={styles.statLabel}>Maximum Allowed</span>
                                    <span className={styles.statValue}>{taskLimit?.maxTasks}</span>
                                </div>
                                <div className={styles.limitStat}>
                                    <span className={styles.statLabel}>Current Tasks</span>
                                    <span className={styles.statValue}>{taskLimit?.currentTasks}</span>
                                </div>
                                <div className={styles.limitStat}>
                                    <span className={styles.statLabel}>Remaining Slots</span>
                                    <span className={`${styles.statValue} ${styles.statValueZero}`}>
                                        0
                                    </span>
                                </div>
                            </div>
                            <button
                                className={styles.returnButton}
                                onClick={() => navigate("/learning-tasks")}
                            >
                                Return to My Tasks
                            </button>
                        </div>
                    </div>
                </SideBar>
            </div>
        );
    }

    return (
        <div className={styles.CreateLearningTaskContainer}>
            <SideBar>
                <div className={styles.CreateLearningTask}>
                    {/* Success Message */}
                    {submitSuccess && (
                        <div className={styles.successMessage}>
                            <FaCheckCircle />
                            <div>
                                <strong>Success!</strong>
                                <p>Your learning task has been saved. Redirecting to your tasks...</p>
                            </div>
                        </div>
                    )}

                    <header className={styles.header}>
                        <button className={styles.backButton} onClick={() => navigate("/user/my-learning-task")}>
                            <FaArrowLeft />
                            <span>Back to Tasks</span>
                        </button>
                        <div className={styles.headerContent}>
                            <h1>Create New Learning Task</h1>
                            <p className={styles.subtitle}>
                                Define what you want to learn and build. You have <strong>{taskLimit?.remainingTasks}</strong> task slots remaining.
                            </p>
                        </div>
                    </header>

                    {/* Task Limit Indicator */}
                    <div className={styles.limitIndicator}>
                        <div className={styles.limitProgress}>
                            <div
                                className={styles.progressBar}
                                style={{
                                    width: `${(taskLimit?.currentTasks / taskLimit?.maxTasks) * 100}%`
                                }}
                            ></div>
                        </div>
                        <div className={styles.limitInfo}>
                            <span className={styles.limitText}>
                                Task {taskLimit?.currentTasks} of {taskLimit?.maxTasks}
                            </span>
                            <span className={styles.remainingText}>
                                {taskLimit?.remainingTasks} slots remaining
                            </span>
                        </div>
                    </div>

                    <div className={styles.formContainer}>
                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>
                                <FaCode /> Task Details
                            </h2>

                            {/* Title */}
                            <div className={styles.formGroup}>
                                <label htmlFor="title" className={styles.formLabel}>
                                    Title <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`}
                                    placeholder="What do you want to learn? (e.g., Database Entity Creation)"
                                    maxLength={100}
                                />
                                {errors.title && (
                                    <div className={styles.errorMessage}>
                                        <FaExclamationCircle /> {errors.title}
                                    </div>
                                )}
                                <div className={styles.charCounter}>
                                    {formData.title.length}/100 characters
                                </div>
                            </div>

                            {/* Description */}
                            <div className={styles.formGroup}>
                                <label htmlFor="description" className={styles.formLabel}>
                                    Description <span className={styles.required}>*</span>
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className={`${styles.formTextarea} ${errors.description ? styles.inputError : ''}`}
                                    placeholder="Describe what you'll build, technologies involved, learning goals, and expected outcomes..."
                                    rows={5}
                                    maxLength={1000}
                                />
                                {errors.description && (
                                    <div className={styles.errorMessage}>
                                        <FaExclamationCircle /> {errors.description}
                                    </div>
                                )}
                                <div className={styles.charCounter}>
                                    {formData.description.length}/1000 characters
                                </div>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>
                                <FaLayerGroup /> Technologies
                            </h2>

                            <div className={styles.formGrid}>
                                {/* GitHub Link */}
                                <div className={styles.formGroup}>
                                    <label htmlFor="githubLink" className={styles.formLabel}>
                                        <FaLink /> GitHub Repository Link
                                    </label>
                                    <input
                                        type="url"
                                        id="githubLink"
                                        name="githubLink"
                                        value={formData.githubLink}
                                        onChange={handleInputChange}
                                        className={`${styles.formInput} ${errors.githubLink ? styles.inputError : ''}`}
                                        placeholder="https://github.com/username/repository"
                                    />
                                    {errors.githubLink && (
                                        <div className={styles.errorMessage}>
                                            <FaExclamationCircle /> {errors.githubLink}
                                        </div>
                                    )}
                                    <div className={styles.inputHelp}>
                                        <FaInfoCircle /> Required for submitting to admin review
                                    </div>
                                </div>
                            </div>

                            {/* Languages Selection */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Programming Languages <span className={styles.required}>*</span>
                                </label>
                                {isLoading.languages ? (
                                    <div className={styles.loadingFrameworks}>
                                        <FaSpinner className={styles.spinning} /> Loading languages...
                                    </div>
                                ) : (
                                    <>
                                        {/* Language Search */}
                                        <div className={styles.searchContainer}>
                                            <FaSearch className={styles.searchIcon} />
                                            <input
                                                type="text"
                                                placeholder="Search languages..."
                                                value={languageSearch}
                                                onChange={(e) => setLanguageSearch(e.target.value)}
                                                className={styles.searchInput}
                                            />
                                        </div>

                                        {/* Selected Languages Display */}
                                        {selectedLanguageNames.length > 0 && (
                                            <div className={styles.selectedContainer}>
                                                <div className={styles.selectedHeader}>
                                                    <strong>Selected Languages:</strong>
                                                    <span className={styles.selectedCount}>
                                                        {selectedLanguageNames.length} selected
                                                    </span>
                                                </div>
                                                <div className={styles.selectedTags}>
                                                    {selectedLanguageNames.map((name, index) => {
                                                        const lang = allLanguages.find(l => l.name === name);
                                                        return (
                                                            <span
                                                                key={index}
                                                                className={styles.selectedTag}
                                                                style={{
                                                                    backgroundColor: lang?.color + '20',
                                                                    borderColor: lang?.color,
                                                                    color: lang?.color
                                                                }}
                                                            >
                                                                {name}
                                                                <button
                                                                    type="button"
                                                                    className={styles.removeTag}
                                                                    onClick={() => handleLanguageToggle(
                                                                        allLanguages.find(l => l.name === name)?.id
                                                                    )}
                                                                    style={{ color: lang?.color }}
                                                                >
                                                                    <FaTimes />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Languages Grid */}
                                        <div className={styles.languagesGrid}>
                                            {filteredLanguages.map(language => (
                                                <div
                                                    key={language.id}
                                                    className={`${styles.languageOption} ${formData.languages.includes(language.id) ? styles.selected : ''
                                                        }`}
                                                    onClick={() => handleLanguageToggle(language.id)}
                                                    style={{
                                                        borderColor: language.color,
                                                        backgroundColor: formData.languages.includes(language.id)
                                                            ? `${language.color}20`
                                                            : 'var(--bg-body)'
                                                    }}
                                                >
                                                    <div className={styles.languageHeader}>
                                                        <div
                                                            className={styles.languageColorDot}
                                                            style={{ backgroundColor: language.color }}
                                                        ></div>
                                                        <div className={styles.languageName}>
                                                            {language.name}
                                                        </div>
                                                        {formData.languages.includes(language.id) && (
                                                            <div className={styles.checkmark}>
                                                                ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={styles.languagePopularity}>
                                                        <div
                                                            className={styles.popularityBar}
                                                            style={{
                                                                width: `${language.popularity}%`,
                                                                backgroundColor: language.color
                                                            }}
                                                        ></div>
                                                        <span className={styles.popularityText}>
                                                            {language.popularity}% usage
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {filteredLanguages.length === 0 && (
                                            <div className={styles.noResults}>
                                                No languages found matching "{languageSearch}"
                                            </div>
                                        )}

                                        {errors.languages && (
                                            <div className={styles.errorMessage}>
                                                <FaExclamationCircle /> {errors.languages}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Frameworks Selection */}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Frameworks & Libraries
                                </label>
                                {isLoading.frameworks ? (
                                    <div className={styles.loadingFrameworks}>
                                        <FaSpinner className={styles.spinning} /> Loading frameworks...
                                    </div>
                                ) : (
                                    <>
                                        {/* Framework Search */}
                                        <div className={styles.searchContainer}>
                                            <FaSearch className={styles.searchIcon} />
                                            <input
                                                type="text"
                                                placeholder="Search frameworks or categories..."
                                                value={frameworkSearch}
                                                onChange={(e) => setFrameworkSearch(e.target.value)}
                                                className={styles.searchInput}
                                            />
                                        </div>

                                        {/* Selected Frameworks Display */}
                                        {selectedFrameworkNames.length > 0 && (
                                            <div className={styles.selectedContainer}>
                                                <div className={styles.selectedHeader}>
                                                    <strong>Selected Frameworks:</strong>
                                                    <span className={styles.selectedCount}>
                                                        {selectedFrameworkNames.length} selected
                                                    </span>
                                                </div>
                                                <div className={styles.selectedTags}>
                                                    {selectedFrameworkNames.map((name, index) => (
                                                        <span key={index} className={styles.selectedTag}>
                                                            {name}
                                                            <button
                                                                type="button"
                                                                className={styles.removeTag}
                                                                onClick={() => handleFrameworkToggle(
                                                                    allFrameworks.find(fw => fw.name === name)?.id
                                                                )}
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Frameworks Grid */}
                                        <div className={styles.frameworksGrid}>
                                            {filteredFrameworks.map(framework => {
                                                const lang = allLanguages.find(l => l.name === framework.language);
                                                return (
                                                    <div
                                                        key={framework.id}
                                                        className={`${styles.frameworkOption} ${formData.frameworks.includes(framework.id) ? styles.selected : ''
                                                            }`}
                                                        onClick={() => handleFrameworkToggle(framework.id)}
                                                    >
                                                        <div className={styles.frameworkHeader}>
                                                            <div className={styles.frameworkName}>
                                                                {framework.name}
                                                            </div>
                                                            <div
                                                                className={styles.frameworkLanguage}
                                                                style={{
                                                                    backgroundColor: lang?.color + '20',
                                                                    color: lang?.color
                                                                }}
                                                            >
                                                                {framework.language}
                                                            </div>
                                                            {formData.frameworks.includes(framework.id) && (
                                                                <div className={styles.checkmark}>
                                                                    ✓
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={styles.frameworkCategory}>
                                                            {framework.category}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {filteredFrameworks.length === 0 && (
                                            <div className={styles.noResults}>
                                                {formData.languages.length === 0
                                                    ? 'Select languages first to see available frameworks'
                                                    : `No frameworks found matching "${frameworkSearch}" for selected languages`
                                                }
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className={styles.formActions}>
                            <div className={styles.actionInfo}>
                                <FaInfoCircle />
                                <div>
                                    <strong>Note:</strong>
                                    <p>
                                        {formData.githubLink
                                            ? "With GitHub link, you can submit for admin review"
                                            : "Without GitHub link, task will be saved as draft"
                                        }
                                    </p>
                                    <p className={styles.selectionSummary}>
                                        Selected: {selectedLanguageNames.length} language(s), {selectedFrameworkNames.length} framework(s)
                                    </p>
                                </div>
                            </div>

                            <div className={styles.actionButtons}>
                                <button
                                    type="button"
                                    className={styles.btnDraft}
                                    onClick={handleSaveDraft}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FaSpinner className={styles.spinning} /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave /> Save as Draft
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className={styles.btnSubmit}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.githubLink}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FaSpinner className={styles.spinning} /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <FaPaperPlane /> Submit for Review
                                        </>
                                    )}
                                </button>
                            </div>

                            {!formData.githubLink && (
                                <div className={styles.submitNote}>
                                    <FaExclamationCircle />
                                    <span>GitHub link required to submit for review. Currently saving as draft only.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
};

export default CreateLearningTask;