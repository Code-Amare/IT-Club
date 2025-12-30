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
} from "react-icons/fa";
import { FiTrendingUp, FiUser } from "react-icons/fi";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";

const AdminDashboard = () => {
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
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
            // Fetch student stats
            const [statsRes, studentsRes] = await Promise.all([
                api.get("/api/management/students/stats/"),
                api.get("/api/management/students/")
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

            // Try to fetch gender data from students endpoint
            const studentsData = studentsRes.data.students || [];
            if (studentsData.length > 0) {
                // Count gender if available in student data
                // This is a fallback since your StudentStatsView doesn't have gender data
                const maleCount = studentsData.filter(s =>
                    s.gender === 'M' || s.gender === 'male' || s.gender === 'Male'
                ).length;
                const femaleCount = studentsData.filter(s =>
                    s.gender === 'F' || s.gender === 'female' || s.gender === 'Female'
                ).length;
                const otherCount = studentsData.length - maleCount - femaleCount;

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

            // Fetch top learning tasks from the correct endpoint
            try {
                const learningTasksRes = await api.get("/api/management/top-learning-tasks/10/");
                const tasksData = learningTasksRes.data.top_learning_tasks || [];

                // Transform learning tasks data for display
                const transformedTasks = tasksData.map(task => {
                    // Calculate average rating from reviews
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
                            grade: task.profile?.grade || "N/A", // Adjust if grade is in user object
                            profile_pic_url: task.user?.profile_pic_url || null,
                        },
                        rating: averageRating,
                        likes_count: task.likes_count || 0,
                        reviews: task.reviews || [],
                    };
                });

                // Sort by rating and take top 5
                const topTasks = transformedTasks
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 5);

                setTopLearningTasks(topTasks);
            } catch (taskError) {
                console.error("Error fetching top learning tasks:", taskError);
                // Try fallback endpoint if the management endpoint fails
                try {
                    const fallbackRes = await api.get("/api/learning-task/");
                    const tasksData = fallbackRes.data || [];

                    const transformedTasks = tasksData.map(task => ({
                        id: task.id || task._id || Math.random(),
                        title: task.title || task.name || "Untitled Task",
                        student: {
                            fullName: task.student?.full_name || task.student?.name || "Unknown Student",
                            grade: task.student?.grade || task.grade || "N/A",
                            profile_pic_url: task.student?.profile_pic_url || task.profile_picture || null,
                        },
                        rating: task.rating || task.average_rating || 0,
                    }));

                    const topTasks = transformedTasks
                        .sort((a, b) => b.rating - a.rating)
                        .slice(0, 5);

                    setTopLearningTasks(topTasks);
                } catch (fallbackError) {
                    console.warn("Both learning tasks endpoints failed:", fallbackError);
                    setTopLearningTasks([]);
                }
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            neonToast.error("Failed to load dashboard data", "error");
        } finally {
            setLoading(false);
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

    if (loading) {
        return (
            <div className={styles.AdminDashboardContainer}>
                <SideBar>
                    <div className={styles.AdminDashboard}>
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
                <div className={styles.AdminDashboard}>
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

                    {/* Tables Section */}
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
                                                        <tr key={task.id}>
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
                </div>
            </SideBar>
        </div>
    );
};

export default AdminDashboard;