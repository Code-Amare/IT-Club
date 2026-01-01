import styles from "./AdminDashboard.module.css";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Added this import
import {
    FaUsers,
    FaChartBar,
    FaTasks,
    FaProjectDiagram,
    FaStar,
    FaMale,
    FaFemale,
    FaGraduationCap,
    FaSpinner,
    FaExclamationTriangle,
    FaChevronLeft,
    FaChevronRight,
    FaSearch,
    FaFilter,
    FaSort,
    FaEnvelope,
    FaPhone,
    FaCalendar,
} from "react-icons/fa";
import { FiTrendingUp, FiUser } from "react-icons/fi";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";

const AdminDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate(); // Added this line
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        by_grade: {},
        by_section: {},
        attendance: {
            total_sessions: 0,
            average_attendance_percentage: 0,
            present_percentage: 0,
            late_percentage: 0,
            absent_percentage: 0
        }
    });

    const [gradeData, setGradeData] = useState([]);
    const [genderData, setGenderData] = useState([
        { name: "Male", value: 0, color: "#4f46e5" },
        { name: "Female", value: 100, color: "#ec4899" },
    ]);
    const [topLearningTasks, setTopLearningTasks] = useState([]);
    const [cssVars, setCssVars] = useState({
        borderColor: "#e5e7eb",
        textSecondary: "#4b5563"
    });

    // Students table states
    const [students, setStudents] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        page_size: 10,
        total_count: 0,
        total_pages: 1,
    });
    const [filters, setFilters] = useState({
        search: "",
        grade: "",
        section: "",
        accountStatus: "",
    });
    const [sortConfig, setSortConfig] = useState({
        sort_by: "-user__date_joined",
        sort_order: "desc"
    });
    const [showFilters, setShowFilters] = useState(false);
    const [availableGrades, setAvailableGrades] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);

    // Fetch all dashboard data
    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            return;
        }

        fetchDashboardData();

        // Get CSS variables for chart styling
        const getCssVariable = (name) => {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        };

        setCssVars({
            borderColor: getCssVariable('--border-color') || "#e5e7eb",
            textSecondary: getCssVariable('--text-secondary') || "#4b5563"
        });
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch student stats and students in parallel
            const [statsRes, studentsRes] = await Promise.all([
                api.get("/api/management/students/stats/"),
                api.get("/api/management/students/", {
                    params: {
                        page: 1,
                        page_size: 10,
                        ...sortConfig,
                        ...filters
                    }
                })
            ]);

            // Process stats data
            const statsData = statsRes.data.overall || {};
            setStats({
                total: statsData.total || 0,
                active: statsData.active || 0,
                inactive: statsData.inactive || 0,
                by_grade: statsData.by_grade || {},
                by_section: statsData.by_section || {},
                attendance: statsData.attendance || {
                    total_sessions: 0,
                    average_attendance_percentage: 0,
                    present_percentage: 0,
                    late_percentage: 0,
                    absent_percentage: 0
                }
            });

            // Process grade data for chart
            const gradeChartData = Object.entries(statsData.by_grade || {}).map(([grade, count]) => ({
                grade: `Grade ${grade}`,
                students: count
            })).sort((a, b) => {
                const gradeA = parseInt(a.grade.replace('Grade ', ''));
                const gradeB = parseInt(b.grade.replace('Grade ', ''));
                return gradeA - gradeB;
            });
            setGradeData(gradeChartData);

            // Process students data
            const studentsData = studentsRes.data;
            setStudents(studentsData.students || []);
            setPagination(studentsData.pagination || {
                current_page: 1,
                page_size: 10,
                total_count: 0,
                total_pages: 1,
            });
            setAvailableGrades(studentsData.filters?.available_grades || []);
            setAvailableSections(studentsData.filters?.available_sections || []);

            // Calculate gender distribution from students data
            if (studentsData.students && studentsData.students.length > 0) {
                // Count gender if available in student data
                const maleCount = studentsData.students.filter(s =>
                    s.gender === 'M' || s.gender === 'male' || s.gender === 'Male'
                ).length;
                const femaleCount = studentsData.students.filter(s =>
                    s.gender === 'F' || s.gender === 'female' || s.gender === 'Female'
                ).length;
                const otherCount = studentsData.students.length - maleCount - femaleCount;

                const totalGender = maleCount + femaleCount + otherCount;
                const malePercentage = totalGender > 0 ? (maleCount / totalGender) * 100 : 0;
                const femalePercentage = totalGender > 0 ? (femaleCount / totalGender) * 100 : 0;

                if (maleCount > 0 || femaleCount > 0) {
                    setGenderData([
                        { name: "Male", value: Math.round(malePercentage), count: maleCount, color: "#4f46e5" },
                        { name: "Female", value: Math.round(femalePercentage), count: femaleCount, color: "#ec4899" },
                        ...(otherCount > 0 ? [{ name: "Other", value: 100 - malePercentage - femalePercentage, count: otherCount, color: "#10b981" }] : [])
                    ]);
                }
            }

            // Fetch top learning tasks
            try {
                const learningTasksRes = await api.get("/api/management/top-learning-tasks/10/");
                const tasksData = learningTasksRes.data.top_learning_tasks || [];

                const transformedTasks = tasksData.map(task => {
                    let averageRating = 0;
                    if (task.reviews && task.reviews.length > 0) {
                        const totalRating = task.reviews.reduce((sum, review) => sum + review.rating, 0);
                        averageRating = totalRating / task.reviews.length;
                    }

                    return {
                        id: task.id,
                        title: task.title || "Untitled Task",
                        student: {
                            fullName: task.user?.full_name || "Unknown Student",
                            grade: task.profile?.grade || "N/A",
                            profile_pic_url: task.user?.profile_pic_url || null,
                        },
                        rating: averageRating,
                        likes_count: task.likes_count || 0,
                        reviews: task.reviews || [],
                    };
                });

                const topTasks = transformedTasks
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 5);

                setTopLearningTasks(topTasks);
            } catch (taskError) {
                console.error("Error fetching top learning tasks:", taskError);
                setTopLearningTasks([]);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            neonToast.error("Failed to load dashboard data", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (page = 1) => {
        setStudentsLoading(true);
        try {
            const params = {
                page,
                page_size: pagination.page_size,
                ...sortConfig,
                ...filters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === "" || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            const response = await api.get("/api/management/students/", { params });
            const data = response.data;

            setStudents(data.students || []);
            setPagination(data.pagination || {
                current_page: 1,
                page_size: 10,
                total_count: 0,
                total_pages: 1,
            });

            // Update available filters if returned
            if (data.filters) {
                setAvailableGrades(data.filters.available_grades || availableGrades);
                setAvailableSections(data.filters.available_sections || availableSections);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            neonToast.error("Failed to load students", "error");
        } finally {
            setStudentsLoading(false);
        }
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= pagination.total_pages) {
            fetchStudents(page);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSort = (field) => {
        const isCurrentlyDesc = sortConfig.sort_by === `-${field}`;
        const isCurrentlyAsc = sortConfig.sort_by === field;

        let newSortConfig = { ...sortConfig };

        if (isCurrentlyDesc) {
            // Switch to ascending
            newSortConfig.sort_by = field;
            newSortConfig.sort_order = "asc";
        } else if (isCurrentlyAsc) {
            // Switch to default (date joined desc)
            newSortConfig.sort_by = "-user__date_joined";
            newSortConfig.sort_order = "desc";
        } else {
            // Set to descending
            newSortConfig.sort_by = `-${field}`;
            newSortConfig.sort_order = "desc";
        }

        setSortConfig(newSortConfig);
        fetchStudents(1); // Reset to page 1 when sorting
    };

    const handleSearch = () => {
        fetchStudents(1); // Reset to page 1 when applying filters
    };

    const handleClearFilters = () => {
        setFilters({
            search: "",
            grade: "",
            section: "",
            accountStatus: "",
        });
        setSortConfig({
            sort_by: "-user__date_joined",
            sort_order: "desc"
        });
        fetchStudents(1);
    };

    const getSortIcon = (field) => {
        if (sortConfig.sort_by === `-${field}`) {
            return <FaSort className={styles.sortIcon} />; // Descending
        } else if (sortConfig.sort_by === field) {
            return <FaSort className={`${styles.sortIcon} ${styles.sortAsc}`} />; // Ascending
        }
        return null;
    };

    const getAttendanceRatingColor = (rating) => {
        switch (rating) {
            case "excellent": return "#10b981";
            case "good": return "#3b82f6";
            case "average": return "#f59e0b";
            case "poor": return "#ef4444";
            default: return "#6b7280";
        }
    };

    const COLORS = ["#4f46e5", "#ec4899", "#10b981", "#f59e0b"];

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.tooltip}>
                    <p className={styles.tooltipLabel}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Handle image error
    const handleImageError = (e) => {
        e.target.style.display = "none";
        const nextSibling = e.target.nextElementSibling;
        if (nextSibling) {
            nextSibling.style.display = "flex";
        }
    };

    // Handle row click
    const handleRowClick = (studentId) => {
        navigate(`/admin/student/${studentId}`);
    };

    if (loading) {
        return (
            <div className={styles.AdminDashboardContainer}>
                <SideBar>
                    <div className={styles.dashboard}>
                        <div className={styles.loadingContainer}>
                            <FaSpinner className={styles.loadingSpinner} />
                            <p>Loading dashboard data...</p>
                        </div>
                    </div>
                </SideBar>
            </div>
        );
    }

    return (
        <div className={styles.AdminDashboardContainer}>
            <SideBar>
                <div className={styles.dashboard}>
                    <header className={styles.header}>
                        <h1>Admin Dashboard</h1>
                        <p className={styles.subtitle}>Welcome back! Here's what's happening today.</p>
                    </header>

                    {/* Stats Cards */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(79, 70, 229, 0.1)" }}>
                                <FaUsers className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Total Students</h3>
                                <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> {stats.active} active
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                                <FaChartBar className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Attendance</h3>
                                <p className={styles.statValue}>{stats.attendance.average_attendance_percentage || 0}%</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> {stats.attendance.total_sessions || 0} sessions
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                                <FaTasks className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Active Students</h3>
                                <p className={styles.statValue}>{stats.active}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> {stats.total - stats.active} inactive
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(236, 72, 153, 0.1)" }}>
                                <FaProjectDiagram className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Learning Tasks</h3>
                                <p className={styles.statValue}>{topLearningTasks.length}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> Top {Math.min(topLearningTasks.length, 5)} rated
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className={styles.chartsSection}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2>
                                    <FaGraduationCap className={styles.chartIcon} /> Grade Distribution
                                </h2>
                                <p className={styles.chartSubtitle}>Students per Grade Level</p>
                            </div>
                            <div className={styles.chartContainer}>
                                {gradeData.length === 0 ? (
                                    <div className={styles.noDataMessage}>
                                        <FaExclamationTriangle size={24} />
                                        <p>No grade data available</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart
                                            data={gradeData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke={cssVars.borderColor}
                                            />
                                            <XAxis
                                                dataKey="grade"
                                                stroke={cssVars.textSecondary}
                                                tick={{ fill: cssVars.textSecondary }}
                                            />
                                            <YAxis
                                                stroke={cssVars.textSecondary}
                                                tick={{ fill: cssVars.textSecondary }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar
                                                dataKey="students"
                                                name="Students"
                                                fill="#4f46e5"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2>
                                    <FaUsers className={styles.chartIcon} /> Gender Distribution
                                </h2>
                                <p className={styles.chartSubtitle}>Student Gender Ratio</p>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={genderData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}%`}
                                            outerRadius={100}
                                            innerRadius={60}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={5}
                                        >
                                            {genderData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className={styles.tooltip}>
                                                            <p className={styles.tooltipLabel}>{data.name}</p>
                                                            <p style={{ color: data.color }}>
                                                                Percentage: {data.value}%
                                                            </p>
                                                            {data.count !== undefined && (
                                                                <p style={{ color: data.color }}>
                                                                    Count: {data.count}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={styles.genderLegend}>
                                    {genderData.map((item, index) => (
                                        <div key={item.name} className={styles.genderItem}>
                                            <div
                                                className={styles.genderColorBox}
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className={styles.genderLabel}>{item.name}</span>
                                            <span className={styles.genderPercentage}>{item.value}%</span>
                                            {item.count !== undefined && (
                                                <span className={styles.genderCount}>({item.count})</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Existing Tables Section (Learning Tasks & Attendance) */}
                    <div className={styles.tablesSection}>
                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaTasks className={styles.tableIcon} /> Top Rated Learning Tasks
                                </h2>
                                <span className={styles.badge}>Top {Math.min(topLearningTasks.length, 5)}</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    {topLearningTasks.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <FaExclamationTriangle size={24} />
                                            <p>No learning tasks available or endpoint not accessible</p>
                                            <button
                                                onClick={fetchDashboardData}
                                                className={styles.retryButton}
                                            >
                                                Retry Loading Tasks
                                            </button>
                                        </div>
                                    ) : (
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th>Task Name</th>
                                                    <th className={styles.hideOnMobile}>Student</th>
                                                    <th>Grade</th>
                                                    <th>Rating</th>
                                                    <th className={styles.hideOnMobile}>Likes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topLearningTasks.map((task) => {
                                                    const avatarClassName = task.student.profile_pic_url
                                                        ? `${styles.avatarPlaceholder} ${styles.fallbackAvatar}`
                                                        : styles.avatarPlaceholder;

                                                    return (
                                                        <tr key={task.id} className={styles.clickableRow} onClick={() => navigate(`/admin/learning-task/${task.id}`)}>
                                                            <td>
                                                                <div className={styles.taskCell}>
                                                                    <span className={styles.taskName}>{task.title}</span>
                                                                </div>
                                                            </td>
                                                            <td className={styles.hideOnMobile}>
                                                                <div className={styles.studentCell}>
                                                                    {task.student.profile_pic_url ? (
                                                                        <img
                                                                            src={task.student.profile_pic_url}
                                                                            alt={task.student.fullName}
                                                                            className={styles.profileImage}
                                                                            onError={handleImageError}
                                                                        />
                                                                    ) : null}
                                                                    <div className={avatarClassName}>
                                                                        {task.student.fullName.charAt(0)}
                                                                    </div>
                                                                    <span>{task.student.fullName}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={styles.gradeBadge}>
                                                                    <FaGraduationCap className={styles.gradeIcon} /> {task.student.grade}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className={styles.rating}>
                                                                    <span className={styles.ratingValue}>{task.rating.toFixed(1)}</span>
                                                                    <div className={styles.stars}>
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <FaStar
                                                                                key={i}
                                                                                className={`${styles.star} ${i < Math.floor(task.rating) ? styles.starFilled : ""}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className={styles.hideOnMobile}>
                                                                <div className={styles.likesCount}>
                                                                    <span className={styles.likesBadge}>
                                                                        {task.likes_count || 0} ❤️
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaProjectDiagram className={styles.tableIcon} /> Attendance Status
                                </h2>
                                <span className={styles.badge}>Overall</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Status</th>
                                                <th>Percentage</th>
                                                <th>Count</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: "#10b98120", color: "#10b981" }}>
                                                        Present
                                                    </span>
                                                </td>
                                                <td>{stats.attendance.present_percentage || 0}%</td>
                                                <td>{stats.attendance.total_present || 0}</td>
                                                <td>Students who attended on time</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>
                                                        Late
                                                    </span>
                                                </td>
                                                <td>{stats.attendance.late_percentage || 0}%</td>
                                                <td>{stats.attendance.total_late || 0}</td>
                                                <td>Students who arrived late</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>
                                                        Absent
                                                    </span>
                                                </td>
                                                <td>{stats.attendance.absent_percentage || 0}%</td>
                                                <td>{stats.attendance.total_absent || 0}</td>
                                                <td>Students who didn't attend</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <span className={styles.statusBadge} style={{ backgroundColor: "#4f46e520", color: "#4f46e5" }}>
                                                        Average
                                                    </span>
                                                </td>
                                                <td>{stats.attendance.average_attendance_percentage || 0}%</td>
                                                <td>{stats.attendance.total_attendance_records || 0}</td>
                                                <td>Overall attendance average</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Management Section - Placed below everything */}
                    <div className={styles.studentManagementSection}>
                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaUsers className={styles.tableIcon} /> Student Management
                                </h2>
                                <div className={styles.tableActions}>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={styles.filterButton}
                                    >
                                        <FaFilter /> Filters
                                    </button>
                                    <button
                                        onClick={handleClearFilters}
                                        className={styles.clearButton}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Filters Section */}
                            {showFilters && (
                                <div className={styles.filtersSection}>
                                    <div className={styles.filterRow}>
                                        <div className={styles.filterGroup}>
                                            <label>Search</label>
                                            <div className={styles.searchInput}>
                                                <FaSearch className={styles.searchIcon} />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, email, grade, etc."
                                                    value={filters.search}
                                                    onChange={(e) => handleFilterChange("search", e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.filterRow}>
                                        <div className={styles.filterGroup}>
                                            <label>Grade</label>
                                            <select
                                                value={filters.grade}
                                                onChange={(e) => handleFilterChange("grade", e.target.value)}
                                            >
                                                <option value="">All Grades</option>
                                                {availableGrades.map(grade => (
                                                    <option key={grade} value={grade}>Grade {grade}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Section</label>
                                            <select
                                                value={filters.section}
                                                onChange={(e) => handleFilterChange("section", e.target.value)}
                                            >
                                                <option value="">All Sections</option>
                                                {availableSections.map(section => (
                                                    <option key={section} value={section}>{section}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <label>Account Status</label>
                                            <select
                                                value={filters.accountStatus}
                                                onChange={(e) => handleFilterChange("accountStatus", e.target.value)}
                                            >
                                                <option value="">All Status</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            className={styles.applyButton}
                                            disabled={studentsLoading}
                                        >
                                            {studentsLoading ? <FaSpinner className={styles.spinner} /> : "Apply Filters"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Students Table */}
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    {studentsLoading ? (
                                        <div className={styles.loadingOverlay}>
                                            <FaSpinner className={styles.loadingSpinner} />
                                            <p>Loading students...</p>
                                        </div>
                                    ) : students.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <FaExclamationTriangle size={24} />
                                            <p>No students found</p>
                                            {Object.values(filters).some(val => val !== "") && (
                                                <button
                                                    onClick={handleClearFilters}
                                                    className={styles.clearButton}
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <table className={styles.dataTable}>
                                            <thead>
                                                <tr>
                                                    <th onClick={() => handleSort("full_name")} className={styles.sortable}>
                                                        Name {getSortIcon("full_name")}
                                                    </th>
                                                    <th onClick={() => handleSort("email")} className={`${styles.sortable} ${styles.hideOnMobile}`}>
                                                        Email {getSortIcon("email")}
                                                    </th>
                                                    <th onClick={() => handleSort("grade")} className={styles.sortable}>
                                                        Grade {getSortIcon("grade")}
                                                    </th>
                                                    <th onClick={() => handleSort("section")} className={`${styles.sortable} ${styles.hideOnMobile}`}>
                                                        Section {getSortIcon("section")}
                                                    </th>
                                                    <th>Attendance</th>
                                                    <th onClick={() => handleSort("account_status")} className={styles.sortable}>
                                                        Status {getSortIcon("account_status")}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map((student) => (
                                                    <tr
                                                        key={student.id}
                                                        className={styles.clickableRow}
                                                        onClick={() => handleRowClick(student.id)}
                                                    >
                                                        <td>
                                                            <div className={styles.studentCell}>
                                                                {student.profile_pic_url ? (
                                                                    <img
                                                                        src={student.profile_pic_url}
                                                                        alt={student.full_name}
                                                                        className={styles.profileImage}
                                                                        onError={handleImageError}
                                                                    />
                                                                ) : null}
                                                                <div className={styles.avatarPlaceholder}>
                                                                    {student.full_name?.charAt(0) || '?'}
                                                                </div>
                                                                <div className={styles.studentInfo}>
                                                                    <span className={styles.studentName}>{student.full_name}</span>
                                                                    <span className={styles.mobileEmail}>{student.email}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={styles.hideOnMobile}>{student.email}</td>
                                                        <td>
                                                            <span className={styles.gradeBadge}>
                                                                {student.grade || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className={styles.hideOnMobile}>{student.section || 'N/A'}</td>
                                                        <td>
                                                            <div className={styles.attendanceCell}>
                                                                <div className={styles.attendanceProgress}>
                                                                    <div
                                                                        className={styles.progressBar}
                                                                        title={`${student.attendance?.attendance_percentage || 0}%`}
                                                                    >
                                                                        <div
                                                                            className={styles.progressFill}
                                                                            style={{
                                                                                width: `${Math.min(student.attendance?.attendance_percentage || 0, 100)}%`,
                                                                                backgroundColor: getAttendanceRatingColor(student.attendance?.attendance_rating)
                                                                            }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className={styles.attendancePercentage}>
                                                                        {student.attendance?.attendance_percentage || 0}%
                                                                    </span>
                                                                </div>
                                                                <div className={styles.attendanceRating}>
                                                                    <span
                                                                        className={styles.ratingBadge}
                                                                        style={{
                                                                            backgroundColor: `${getAttendanceRatingColor(student.attendance?.attendance_rating)}20`,
                                                                            color: getAttendanceRatingColor(student.attendance?.attendance_rating)
                                                                        }}
                                                                    >
                                                                        {student.attendance?.attendance_rating || 'No data'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`${styles.statusBadge} ${student.account_status === 'active' ? styles.activeBadge : styles.inactiveBadge
                                                                }`}>
                                                                {student.account_status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Pagination */}
                                {students.length > 0 && (
                                    <div className={styles.pagination}>
                                        <div className={styles.paginationInfo}>
                                            Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to {Math.min(pagination.current_page * pagination.page_size, pagination.total_count)} of {pagination.total_count} students
                                        </div>
                                        <div className={styles.paginationControls}>
                                            <button
                                                onClick={() => handlePageChange(pagination.current_page - 1)}
                                                disabled={pagination.current_page === 1 || studentsLoading}
                                                className={styles.paginationButton}
                                            >
                                                <FaChevronLeft /> Previous
                                            </button>
                                            <div className={styles.pageNumbers}>
                                                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                                    let pageNum;
                                                    if (pagination.total_pages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (pagination.current_page <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (pagination.current_page >= pagination.total_pages - 2) {
                                                        pageNum = pagination.total_pages - 4 + i;
                                                    } else {
                                                        pageNum = pagination.current_page - 2 + i;
                                                    }
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => handlePageChange(pageNum)}
                                                            className={`${styles.pageButton} ${pagination.current_page === pageNum ? styles.activePage : ''
                                                                }`}
                                                            disabled={studentsLoading}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => handlePageChange(pagination.current_page + 1)}
                                                disabled={pagination.current_page === pagination.total_pages || studentsLoading}
                                                className={styles.paginationButton}
                                            >
                                                Next <FaChevronRight />
                                            </button>
                                        </div>
                                        <div className={styles.pageSizeSelector}>
                                            <label>Show: </label>
                                            <select
                                                value={pagination.page_size}
                                                onChange={(e) => {
                                                    setPagination(prev => ({
                                                        ...prev,
                                                        page_size: parseInt(e.target.value)
                                                    }));
                                                    setTimeout(() => fetchStudents(1), 0);
                                                }}
                                                disabled={studentsLoading}
                                                className={styles.pageSizeSelect}
                                            >
                                                <option value="5">5</option>
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </select>
                                            <span>per page</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
};

export default AdminDashboard;