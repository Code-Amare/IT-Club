import styles from "./UserDashboard.module.css";
import SideBar from "../../../Components/SideBar/SideBar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    LineChart,
    Line,
} from "recharts";
import {
    FaTasks,
    FaCheckCircle,
    FaClock,
    FaCalendarCheck,
    FaUserGraduate,
    FaStar,
    FaExclamationTriangle,
    FaArrowRight,
    FaGraduationCap,
    FaChartLine,
    FaCalendarAlt,
    FaPercentage,
} from "react-icons/fa";
import { FiTrendingUp, FiUser, FiCalendar } from "react-icons/fi";
import { useUser } from "../../../Context/UserContext";
import { useNotifContext } from "../../../Context/NotifContext";

const UserDashboard = () => {
    const navigate = useNavigate();
    const { user } = useUser()
    
    const { updatePageTitle } = useNotifContext()
    useEffect(() => {
        updatePageTitle("User Dashboard")
    }, [])


    // User stats
    const [userStats] = useState({
        attendance: 92.5,
        attendanceTrend: "+5.2%",
        totalLearningTasks: 4,
        completedTasks: 2,
        averageGrade: 4.65,
        taskCompletion: 50,
        pendingReview: 1,
        certificatesEarned: 1,
    });

    // Attendance data for the month
    const attendanceData = [
        { day: "Mon", present: 1, absent: 0 },
        { day: "Tue", present: 1, absent: 0 },
        { day: "Wed", present: 0, absent: 1 },
        { day: "Thu", present: 1, absent: 0 },
        { day: "Fri", present: 1, absent: 0 },
        { day: "Sat", present: 1, absent: 0 },
        { day: "Sun", present: 1, absent: 0 },
    ];

    // Task status distribution
    const taskStatusData = [
        { name: "Completed", value: 2, color: "#10b981" },
        { name: "In Progress", value: 1, color: "#3b82f6" },
        { name: "Pending", value: 1, color: "#f59e0b" },
    ];

    // Grade progress data
    const gradeProgressData = [
        { month: "Jan", grade: 4.2 },
        { month: "Feb", grade: 4.5 },
        { month: "Mar", grade: 4.3 },
        { month: "Apr", grade: 4.7 },
        { month: "May", grade: 4.8 },
        { month: "Jun", grade: 4.9 },
    ];

    // Recently reviewed learning tasks (last 5)
    const [recentlyReviewedTasks] = useState([
        {
            id: 3,
            title: "Authentication System",
            description: "JWT-based authentication with refresh tokens and role-based access",
            languages: ["Python", "JavaScript"],
            frameworks: ["Django", "Django REST", "PostgreSQL"],
            status: "graded",
            grade: 4.5,
            adminFeedback: "Great implementation! Consider adding rate limiting for security.",
            reviewedDate: "2024-01-25",
            reviewer: "Admin - Dr. Johnson",
        },
        {
            id: 4,
            title: "Real-time Chat Application",
            description: "WebSocket-based chat with rooms, user presence, and file sharing",
            languages: ["JavaScript"],
            frameworks: ["Socket.io", "Express", "React"],
            status: "locked",
            grade: 4.8,
            adminFeedback: "Excellent real-time implementation! Production ready.",
            reviewedDate: "2024-01-20",
            reviewer: "Admin - Prof. Wilson",
        },
        {
            id: 6,
            title: "Mobile App Development",
            description: "Cross-platform mobile app with React Native",
            languages: ["JavaScript", "TypeScript"],
            frameworks: ["React Native", "Redux", "Firebase"],
            status: "graded",
            grade: 4.9,
            adminFeedback: "Perfect implementation with great UX design.",
            reviewedDate: "2024-01-18",
            reviewer: "Admin - Dr. Chen",
        },
        {
            id: 8,
            title: "E-commerce Backend",
            description: "REST API for e-commerce platform with payment integration",
            languages: ["JavaScript"],
            frameworks: ["Node.js", "Express", "MongoDB"],
            status: "graded",
            grade: 4.3,
            adminFeedback: "Good structure, needs more error handling.",
            reviewedDate: "2024-01-15",
            reviewer: "Admin - Prof. Brown",
        },
        {
            id: 10,
            title: "Data Visualization Dashboard",
            description: "Interactive dashboard with real-time data visualization",
            languages: ["Python", "JavaScript"],
            frameworks: ["Django", "React", "D3.js"],
            status: "graded",
            grade: 4.6,
            adminFeedback: "Excellent visualization techniques and user interface.",
            reviewedDate: "2024-01-12",
            reviewer: "Admin - Dr. Martinez",
        },
    ]);

    // Upcoming events/sessions
    const [upcomingEvents] = useState([
        {
            id: 1,
            title: "Advanced React Workshop",
            date: "2024-02-05",
            time: "14:00 - 16:00",
            type: "workshop",
            instructor: "Sarah Johnson",
        },
        {
            id: 2,
            title: "Database Design Seminar",
            date: "2024-02-08",
            time: "10:00 - 12:00",
            type: "seminar",
            instructor: "Dr. Michael Chen",
        },
        {
            id: 3,
            title: "Project Review Session",
            date: "2024-02-10",
            time: "15:00 - 17:00",
            type: "review",
            instructor: "Your Mentor",
        },
    ]);

    // Get CSS variables for chart styling
    const [cssVars, setCssVars] = useState({
        borderColor: "#e5e7eb",
        textSecondary: "#4b5563"
    });

    useEffect(() => {
        const getCssVariable = (name) => {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        };

        setCssVars({
            borderColor: getCssVariable('--border-color'),
            textSecondary: getCssVariable('--text-secondary')
        });
    }, []);

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

    // Handle navigation to tasks
    const handleViewAllTasks = () => {
        navigate("/user/my-learning-task");
    };

    // Handle navigation to create task
    const handleCreateTask = () => {
        navigate("/user/learning-task/create");
    };

    const COLORS = ["#10b981", "#3b82f6", "#f59e0b"];

    return (
        <div className={styles.UserDashboardContainer}>
            <SideBar>
                <div className={styles.UserDashboard}>
                    {/* Header with User Info */}
                    <header className={styles.header}>
                        <div className={styles.userInfo}>
                            <div className={styles.userAvatar}>
                                {user.profilePicURL ? (
                                    <img
                                        src={user.profilePicURL}
                                        alt={user.fullName}
                                        className={styles.profileImage}
                                        onError={handleImageError}
                                    />
                                ) : <div className={styles.avatarPlaceholder}>
                                    <FiUser />
                                </div>}

                            </div>
                            <div className={styles.userDetails}>
                                <h1>Welcome back, {user.fullName}!</h1>
                                <p className={styles.subtitle}>
                                    <FaUserGraduate /> Grade {user.grade} •
                                    <FiCalendar /> Member since {`${new Date(user.dateJoined).getFullYear()}-${String(new Date(user.dateJoined).getMonth() + 1).padStart(2, "0")}-${String(new Date(user.dateJoined).getDate()).padStart(2, "0")}`}
                                    •
                                    <span className={styles.memberId}>ID: {user.id}</span>
                                </p>
                            </div>
                        </div>
                        <button className={styles.createTaskBtn} onClick={handleCreateTask}>
                            <FaTasks /> Create New Task
                        </button>
                    </header>

                    {/* Stats Cards */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(79, 70, 229, 0.1)" }}>
                                <FaCalendarCheck className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Attendance Rate</h3>
                                <p className={styles.statValue}>{userStats.attendance}%</p>
                                <span className={styles.statTrend}>
                                    <FiTrendingUp /> {userStats.attendanceTrend} this month
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                                <FaTasks className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Learning Tasks</h3>
                                <p className={styles.statValue}>{userStats.totalLearningTasks}</p>
                                <span className={styles.statTrend}>
                                    {userStats.completedTasks} completed • {userStats.taskCompletion}% done
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                                <FaStar className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Average Grade</h3>
                                <p className={styles.statValue}>{userStats.averageGrade}/5</p>
                                <span className={styles.statTrend}>
                                    <FaChartLine /> {userStats.certificatesEarned} certificate earned
                                </span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ backgroundColor: "rgba(236, 72, 153, 0.1)" }}>
                                <FaClock className={styles.statIconSvg} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>Pending Review</h3>
                                <p className={styles.statValue}>{userStats.pendingReview}</p>
                                <span className={styles.statTrend}>
                                    Awaiting admin evaluation
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className={styles.chartsSection}>
                        {/* Attendance Chart */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2>
                                    <FaCalendarAlt className={styles.chartIcon} /> Weekly Attendance
                                </h2>
                                <p className={styles.chartSubtitle}>Your attendance record for the current week</p>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={attendanceData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={cssVars.borderColor}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            stroke={cssVars.textSecondary}
                                            tick={{ fill: cssVars.textSecondary }}
                                        />
                                        <YAxis
                                            stroke={cssVars.textSecondary}
                                            tick={{ fill: cssVars.textSecondary }}
                                            tickFormatter={(value) => `${value}h`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar
                                            dataKey="present"
                                            name="Present"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="absent"
                                            name="Absent"
                                            fill="#ef4444"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Task Status Chart */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h2>
                                    <FaPercentage className={styles.chartIcon} /> Task Status Distribution
                                </h2>
                                <p className={styles.chartSubtitle}>Overview of your learning tasks progress</p>
                            </div>
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={taskStatusData}
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
                                            {taskStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomTooltip />}
                                            formatter={(value) => [`${value} tasks`, 'Count']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={styles.chartLegend}>
                                    {taskStatusData.map((item, index) => (
                                        <div key={item.name} className={styles.legendItem}>
                                            <div
                                                className={styles.legendColorBox}
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className={styles.legendLabel}>{item.name}</span>
                                            <span className={styles.legendValue}>{item.value} tasks</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recently Reviewed Tasks & Upcoming Events */}
                    <div className={styles.tablesSection}>
                        {/* Recently Reviewed Tasks */}
                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaCheckCircle className={styles.tableIcon} /> Recently Reviewed Tasks
                                </h2>
                                <span className={styles.badge}>Last 5</span>
                            </div>
                            <div className={styles.tableWrapper}>
                                <div className={styles.tableContainer}>
                                    <table className={styles.dataTable}>
                                        <thead>
                                            <tr>
                                                <th>Task Name</th>
                                                <th className={styles.hideOnMobile}>Technologies</th>
                                                <th>Grade</th>
                                                <th>Reviewed</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentlyReviewedTasks.map((task) => (
                                                <tr key={task.id}>
                                                    <td>
                                                        <div className={styles.taskCell}>
                                                            <span className={styles.taskName}>{task.title}</span>
                                                            <div className={styles.taskDescription}>
                                                                {task.description.substring(0, 50)}...
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={styles.hideOnMobile}>
                                                        <div className={styles.techCell}>
                                                            <div className={styles.techTags}>
                                                                {task.languages.slice(0, 2).map((lang, idx) => (
                                                                    <span key={idx} className={styles.techTag}>
                                                                        {lang}
                                                                    </span>
                                                                ))}
                                                                {task.languages.length > 2 && (
                                                                    <span className={styles.moreTag}>
                                                                        +{task.languages.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={styles.gradeCell}>
                                                            <div className={styles.gradeValue}>
                                                                {task.grade}/5
                                                            </div>
                                                            <div className={styles.stars}>
                                                                {[...Array(5)].map((_, i) => (
                                                                    <FaStar
                                                                        key={i}
                                                                        className={`${styles.star} ${i < Math.floor(task.grade) ? styles.starFilled : ""}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={styles.dateCell}>
                                                            <div className={styles.reviewDate}>
                                                                {task.reviewedDate}
                                                            </div>
                                                            <div className={styles.reviewer}>
                                                                {task.reviewer}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className={styles.viewButton}
                                                            onClick={() => navigate(`/learning-task/${task.id}`)}
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className={styles.tableFooter}>
                                <button className={styles.viewAllBtn} onClick={handleViewAllTasks}>
                                    View All Tasks <FaArrowRight />
                                </button>
                            </div>
                        </div>

                        {/* Upcoming Events */}
                        <div className={styles.tableCard}>
                            <div className={styles.tableHeader}>
                                <h2>
                                    <FaCalendarAlt className={styles.tableIcon} /> Upcoming Sessions
                                </h2>
                                <span className={styles.badge}>3 events</span>
                            </div>
                            <div className={styles.eventsList}>
                                {upcomingEvents.map((event) => (
                                    <div key={event.id} className={styles.eventItem}>
                                        <div className={styles.eventDate}>
                                            <div className={styles.eventDay}>
                                                {new Date(event.date).getDate()}
                                            </div>
                                            <div className={styles.eventMonth}>
                                                {new Date(event.date).toLocaleString('default', { month: 'short' })}
                                            </div>
                                        </div>
                                        <div className={styles.eventDetails}>
                                            <div className={styles.eventTitle}>{event.title}</div>
                                            <div className={styles.eventTime}>
                                                <FiCalendar /> {event.date} • {event.time}
                                            </div>
                                            <div className={styles.eventInstructor}>
                                                Instructor: {event.instructor}
                                            </div>
                                        </div>
                                        <div className={styles.eventType}>
                                            <span className={`${styles.eventTypeBadge} ${styles[event.type]}`}>
                                                {event.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.tableFooter}>
                                <div className={styles.eventNote}>
                                    <FaExclamationTriangle className={styles.noteIcon} />
                                    <span>Remember to mark attendance for each session</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SideBar>
        </div>
    );
};

export default UserDashboard;