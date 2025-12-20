import styles from "./AdminDashboard.module.css";
import SideBar from "../../Components/SideBar/SideBar";
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
} from "react-icons/fa";
import { FiTrendingUp, FiUser } from "react-icons/fi";

const AdminDashboard = () => {
    // Sample data for stats
    const [stats] = useState({
        totalStudents: 1245,
        attendanceSession: 89.2,
        totalLearningTasks: 567,
        totalProjects: 234,
    });

    // Corrected data for learning tasks vs grade ratio
    const gradeTaskData = [
        { grade: "Grade 9", learningTasks: 98, projects: 45, students: 310 },
        { grade: "Grade 10", learningTasks: 124, projects: 52, students: 298 },
        { grade: "Grade 11", learningTasks: 187, projects: 78, students: 321 },
        { grade: "Grade 12", learningTasks: 158, projects: 59, students: 316 },
    ];

    // Corrected data for gender ratio
    const genderData = [
        { name: "Male", value: 60, color: "#4f46e5" },
        { name: "Female", value: 40, color: "#ec4899" },
    ];

    // Sample data for top learning tasks
    const topLearningTasks = [
        {
            id: 1,
            title: "Django Backend API",
            student: {
                fullName: "John Smith",
                grade: "11",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
            },
            rating: 4.9,
        },
        {
            id: 2,
            title: "React E-commerce Site",
            student: {
                fullName: "Emma Wilson",
                grade: "12",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
            },
            rating: 1.8,
        },
        {
            id: 3,
            title: "Machine Learning Model",
            student: {
                fullName: "Alex Johnson",
                grade: "10",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
            },
            rating: 4.7,
        },
        {
            id: 4,
            title: "Mobile App Development",
            student: {
                fullName: "Sarah Brown",
                grade: "11",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
            },
            rating: 4.6,
        },
        {
            id: 5,
            title: "Blockchain Protocol",
            student: {
                fullName: "Michael Chen",
                grade: "12",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
            },
            rating: 4.5,
        },
    ];

    // Sample data for top projects
    const topProjects = [
        {
            id: 1,
            title: "AI Assistant",
            student: {
                fullName: "Emma Wilson",
                grade: "12",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma2",
            },
            rating: 4.9,
        },
        {
            id: 2,
            title: "Cloud Infrastructure",
            student: {
                fullName: "John Smith",
                grade: "11",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=John2",
            },
            rating: 4.8,
        },
        {
            id: 3,
            title: "IoT System",
            student: {
                fullName: "Michael Chen",
                grade: "12",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael2",
            },
            rating: 4.7,
        },
        {
            id: 4,
            title: "AR Application",
            student: {
                fullName: "Sarah Brown",
                grade: "11",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah2",
            },
            rating: 4.6,
        },
        {
            id: 5,
            title: "Data Analytics",
            student: {
                fullName: "Alex Johnson",
                grade: "10",
                profile_pic_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex2",
            },
            rating: 4.5,
        },
    ];

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

    // Get CSS variables for chart styling
    const [cssVars, setCssVars] = useState({
        borderColor: "#e5e7eb",
        textSecondary: "#4b5563"
    });

    useEffect(() => {
        // Get CSS variables on mount and when theme changes
        const getCssVariable = (name) => {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        };

        setCssVars({
            borderColor: getCssVariable('--border-color'),
            textSecondary: getCssVariable('--text-secondary')
        });
    }, []);

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
                                <p className={styles.statValue}>{stats.totalStudents.toLocaleString()}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> +12% from last month
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                                <FaChartBar className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Attendance Session</h3>
                                <p className={styles.statValue}>{stats.attendanceSession}%</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> +2.3% from last week
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                                <FaTasks className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Total Learning Tasks</h3>
                                <p className={styles.statValue}>{stats.totalLearningTasks}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> +45 new this week
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(236, 72, 153, 0.1)" }}>
                                <FaProjectDiagram className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Total Projects</h3>
                                <p className={styles.statValue}>{stats.totalProjects}</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> +18 in progress
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className={styles.chartsSection}>
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2>
                                    <FaGraduationCap className={styles.chartIcon} /> Grade Distribution Analysis
                                </h2>
                                <p className={styles.chartSubtitle}>Learning Tasks, Projects & Students per Grade</p>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={gradeTaskData}
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
                                            dataKey="learningTasks"
                                            name="Learning Tasks"
                                            fill="#4f46e5"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="projects"
                                            name="Projects"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="students"
                                            name="Students"
                                            fill="#f59e0b"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
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
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                                            content={<CustomTooltip />}
                                            formatter={(value) => [`${value}%`, 'Percentage']}
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
                                <span className={styles.badge}>Top 5</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Task Name</th>
                                                <th className={styles.hideOnMobile}>Student</th>
                                                <th>Grade</th>
                                                <th>Rating</th>
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
                                                                <span className={styles.ratingValue}>{task.rating}</span>
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
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaProjectDiagram className={styles.tableIcon} /> Top Rated Projects
                                </h2>
                                <span className={styles.badge}>Top 5</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th className={styles.hideOnMobile}>Grade</th>
                                                <th>Project</th>
                                                <th>Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProjects.map((project) => {
                                                const avatarClassName = project.student.profile_pic_url
                                                    ? `${styles.avatarPlaceholder} ${styles.fallbackAvatar}`
                                                    : styles.avatarPlaceholder;

                                                return (
                                                    <tr key={project.id}>
                                                        <td>
                                                            <div className={styles.studentCell}>
                                                                {project.student.profile_pic_url ? (
                                                                    <img
                                                                        src={project.student.profile_pic_url}
                                                                        alt={project.student.fullName}
                                                                        className={styles.profileImage}
                                                                        onError={handleImageError}
                                                                    />
                                                                ) : null}
                                                                <div className={avatarClassName}>
                                                                    <FiUser />
                                                                </div>
                                                                <div className={styles.studentInfo}>
                                                                    <span className={styles.studentName}>{project.student.fullName}</span>
                                                                    <span className={styles.showOnMobile}>
                                                                        <span className={styles.mobileGradeBadge}>Grade {project.student.grade}</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={styles.hideOnMobile}>
                                                            <span className={styles.gradeBadge}>
                                                                <FaGraduationCap className={styles.gradeIcon} /> {project.student.grade}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={styles.projectName}>{project.title}</span>
                                                        </td>
                                                        <td>
                                                            <div className={styles.rating}>
                                                                <span className={styles.ratingValue}>{project.rating}</span>
                                                                <div className={styles.stars}>
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <FaStar
                                                                            key={i}
                                                                            className={`${styles.star} ${i < Math.floor(project.rating) ? styles.starFilled : ""}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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