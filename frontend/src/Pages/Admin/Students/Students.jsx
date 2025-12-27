import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import SideBar from "../../../Components/SideBar/SideBar";
import ReactPaginate from "react-paginate";
import {
    FaSearch,
    FaFilter,
    FaPlus,
    FaEdit,
    FaEye,
    FaUpload,
    FaDownload,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaUserPlus,
    FaUsers,
    FaChartBar,
    FaEnvelope,
    FaGraduationCap,
    FaUser,
    FaTimes,
    FaCheck,
    FaExclamationTriangle
} from "react-icons/fa";
import {
    MdClass,
    MdRefresh
} from "react-icons/md";
import styles from "./Students.module.css";

export default function Students() {
    const { user } = useUser();
    const navigate = useNavigate();

    // State
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        grade: "",
        section: "",
        accountStatus: ""
    });
    const [sortConfig, setSortConfig] = useState({ key: "full_name", direction: "asc" });
    const [pagination, setPagination] = useState({
        currentPage: 0,
        itemsPerPage: 10,
        totalItems: 0
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0
    });

    // Fetch students
    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        getStats();
        fetchStudents();
    }, [user, navigate]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/management/students/");
            const studentsData = response.data.students || [];
            setStudents(studentsData);
            setPagination(prev => ({
                ...prev,
                totalItems: studentsData.length || 0
            }));
        } catch (error) {
            console.error("Error fetching students:", error);
            neonToast.error("Failed to load students", "error");
        } finally {
            setLoading(false);
        }
    };

    const getStats = async () => {
        try {
            const res = await api.get("/api/management/students/stats/");
            const statsData = res.data.overall || null;
            if (!statsData) {
                return neonToast.error("Failed to load stats.", "error");
            }
            const newStats = {
                total: statsData.total || 0,
                active: statsData.active || 0,
                inactive: statsData.inactive || 0,
            };
            setStats(newStats);
        } catch (error) {
            console.error("Error fetching stats:", error);
            neonToast.error("Failed to load stats.", "error");
        }
    };

    // Filter and sort students using useMemo
    const filteredStudents = useMemo(() => {
        let result = [...students];

        // Apply text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(student => {
                // Search in multiple fields
                return (
                    (student.full_name?.toLowerCase().includes(query)) ||
                    (student.email?.toLowerCase().includes(query)) ||
                    (student.grade?.toString().includes(query)) ||
                    (student.section?.toLowerCase().includes(query)) ||
                    (student.id?.toString().includes(query))
                );
            });
        }

        // Apply filters
        if (filters.grade) {
            result = result.filter(student => {
                // Handle grade as string or number
                const studentGrade = student.grade?.toString();
                const filterGrade = filters.grade.toString();
                return studentGrade === filterGrade;
            });
        }
        if (filters.section) {
            result = result.filter(student => {
                // Handle case-insensitive section comparison
                const studentSection = student.section?.toLowerCase() || "";
                const filterSection = filters.section.toLowerCase();
                return studentSection === filterSection;
            });
        }
        if (filters.accountStatus) {
            result = result.filter(student =>
                student.account_status?.toLowerCase() === filters.accountStatus.toLowerCase()
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle null/undefined values
                if (aValue == null) aValue = "";
                if (bValue == null) bValue = "";

                // Handle different data types
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
                }

                // Convert to string for comparison
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();

                if (aValue < bValue) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [students, searchQuery, filters, sortConfig]);

    // Update pagination when filtered students change
    useEffect(() => {
        setPagination(prev => ({
            ...prev,
            totalItems: filteredStudents.length,
            currentPage: 0 // Reset to first page when filters change
        }));
    }, [filteredStudents]);

    // Sorting
    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
        }));
    };

    // Pagination
    const handlePageClick = (data) => {
        setPagination(prev => ({
            ...prev,
            currentPage: data.selected
        }));
    };

    const paginatedStudents = useMemo(() => {
        const start = pagination.currentPage * pagination.itemsPerPage;
        const end = start + pagination.itemsPerPage;
        return filteredStudents.slice(start, end);
    }, [filteredStudents, pagination]);

    // Export Students
    const handleExport = useCallback(() => {
        if (filteredStudents.length === 0) {
            neonToast.warning("No students to export", "warning");
            return;
        }

        const csvContent = [
            ["Full Name", "Email", "Grade", "Section", "Account Status", "Created At"],
            ...filteredStudents.map(s => [
                s.full_name || "",
                s.email || "",
                s.grade || "",
                s.section || "",
                s.account_status || "",
                s.created_at ? new Date(s.created_at).toLocaleDateString() : ""
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        neonToast.success("Students exported successfully", "success");
    }, [filteredStudents]);

    // Filter handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            grade: "",
            section: "",
            accountStatus: ""
        });
        setSearchQuery("");
    };

    // Get unique values for filter dropdowns
    const uniqueGrades = useMemo(() => {
        const grades = students
            .map(s => s.grade)
            .filter(grade => grade != null && grade !== "")
            .map(grade => grade.toString());
        return [...new Set(grades)].sort((a, b) => {
            // Sort grades numerically if they are numbers
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a.localeCompare(b);
        });
    }, [students]);

    const uniqueSections = useMemo(() => {
        const sections = students
            .map(s => s.section)
            .filter(section => section != null && section !== "")
            .map(section => section.toString());
        return [...new Set(sections)].sort();
    }, [students]);

    if (user.isAuthenticated === null) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <FaSort />;
        return sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
    };

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FaUsers className={styles.titleIcon} />
                            <div>
                                <h1>Students Management</h1>
                                <p>Manage and monitor student records</p>
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.exportBtn}
                                onClick={handleExport}
                                disabled={filteredStudents.length === 0}
                            >
                                <FaDownload />
                                <span>Export CSV</span>
                            </button>
                            <Link
                                to="/admin/students/bulk"
                                className={styles.secondaryBtn}
                            >
                                <FaUpload />
                                <span>Bulk Upload</span>
                            </Link>
                            <Link
                                to="/admin/student/add"
                                className={styles.primaryBtn}
                            >
                                <FaUserPlus />
                                <span>Add Student</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
                            <FaUsers />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Total Students</h3>
                            <p className={styles.statNumber}>{stats.total}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                            <FaCheck />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Active Accounts</h3>
                            <p className={styles.statNumber}>{stats.active}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            <FaChartBar />
                        </div>
                        <div className={styles.statContent}>
                            <h3>Inactive</h3>
                            <p className={styles.statNumber}>{stats.inactive}</p>
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
                                placeholder="Search students by name, email, grade, section or ID..."
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
                                onClick={() => {
                                    const filtersElement = document.getElementById("advancedFilters");
                                    if (filtersElement) {
                                        filtersElement.classList.toggle(styles.show);
                                    }
                                }}
                            >
                                <FaFilter />
                                <span>Filters</span>
                            </button>
                            {(filters.grade || filters.section || filters.accountStatus || searchQuery) && (
                                <button
                                    className={styles.clearFilters}
                                    onClick={clearFilters}
                                >
                                    <FaTimes />
                                    <span>Clear All</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div id="advancedFilters" className={styles.advancedFilters}>
                        <div className={styles.filterGrid}>
                            <div className={styles.filterGroup}>
                                <label>Grade</label>
                                <select
                                    value={filters.grade}
                                    onChange={(e) => handleFilterChange("grade", e.target.value)}
                                >
                                    <option value="">All Grades</option>
                                    {uniqueGrades.map(grade => (
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
                                    {uniqueSections.map(section => (
                                        <option key={section} value={section}>Section {section}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.filterGroup}>
                                <label>Status</label>
                                <select
                                    value={filters.accountStatus}
                                    onChange={(e) => handleFilterChange("accountStatus", e.target.value)}
                                >
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <h3>Students List</h3>
                        <div className={styles.tableControls}>
                            <div className={styles.resultsInfo}>
                                Showing {paginatedStudents.length} of {filteredStudents.length} students
                            </div>
                            <select
                                value={pagination.itemsPerPage}
                                onChange={(e) => setPagination(prev => ({
                                    ...prev,
                                    itemsPerPage: parseInt(e.target.value),
                                    currentPage: 0
                                }))}
                                className={styles.pageSelect}
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                            <button
                                className={styles.refreshBtn}
                                onClick={fetchStudents}
                                disabled={loading}
                            >
                                <MdRefresh />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loadingTable}>
                            <div className={styles.spinner}></div>
                            <p>Loading students...</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th onClick={() => handleSort("full_name")}>
                                                <div className={styles.tableHeaderCell}>
                                                    <span>Student</span>
                                                    <SortIcon column="full_name" />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort("email")}>
                                                <div className={styles.tableHeaderCell}>
                                                    <span>Email</span>
                                                    <SortIcon column="email" />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort("grade")}>
                                                <div className={styles.tableHeaderCell}>
                                                    <span>Grade</span>
                                                    <SortIcon column="grade" />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort("section")}>
                                                <div className={styles.tableHeaderCell}>
                                                    <span>Section</span>
                                                    <SortIcon column="section" />
                                                </div>
                                            </th>
                                            <th onClick={() => handleSort("account_status")}>
                                                <div className={styles.tableHeaderCell}>
                                                    <span>Status</span>
                                                    <SortIcon column="account_status" />
                                                </div>
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedStudents.map((student) => (
                                            <tr key={student.id}>
                                                <td>
                                                    <div className={styles.studentCell}>
                                                        <div className={styles.studentAvatar}>
                                                            {student.full_name?.charAt(0) || "S"}
                                                        </div>
                                                        <div>
                                                            <div className={styles.studentName}>
                                                                {student.full_name}
                                                            </div>
                                                            <div className={styles.studentId}>
                                                                ID: {student.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.emailCell}>
                                                        <FaEnvelope />
                                                        <span>{student.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={styles.gradeBadge}>
                                                        <FaGraduationCap />
                                                        {student.grade}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={styles.sectionBadge}>
                                                        <MdClass />
                                                        {student.section}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`${styles.statusBadge} ${student.account_status === "active" ? styles.active :
                                                        student.account_status === "inactive" ? styles.inactive :
                                                            styles.pending
                                                        }`}>
                                                        {student.account_status === "active" ? (
                                                            <>
                                                                <FaCheck /> Active
                                                            </>
                                                        ) : student.account_status === "inactive" ? (
                                                            <>
                                                                <FaTimes /> Inactive
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaExclamationTriangle /> Pending
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        <Link
                                                            to={`/admin/student/${student.id}`}
                                                            className={styles.viewBtn}
                                                        >
                                                            <FaEye />
                                                            <span>View</span>
                                                        </Link>
                                                        <Link
                                                            to={`/admin/student/edit/${student.id}`}
                                                            className={styles.editBtn}
                                                        >
                                                            <FaEdit />
                                                            <span>Edit</span>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {paginatedStudents.length === 0 && (
                                <div className={styles.emptyState}>
                                    <FaUsers size={48} />
                                    <h3>No students found</h3>
                                    <p>{students.length === 0 ? "No students available. Add some students first." : "Try adjusting your search or filters"}</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {filteredStudents.length > pagination.itemsPerPage && (
                                <div className={styles.pagination}>
                                    <ReactPaginate
                                        previousLabel={"Previous"}
                                        nextLabel={"Next"}
                                        breakLabel={"..."}
                                        breakClassName={styles.break}
                                        pageCount={Math.ceil(filteredStudents.length / pagination.itemsPerPage)}
                                        marginPagesDisplayed={2}
                                        pageRangeDisplayed={5}
                                        onPageChange={handlePageClick}
                                        containerClassName={styles.paginationContainer}
                                        pageClassName={styles.pageItem}
                                        pageLinkClassName={styles.pageLink}
                                        previousClassName={styles.pageItem}
                                        previousLinkClassName={styles.pageLink}
                                        nextClassName={styles.pageItem}
                                        nextLinkClassName={styles.pageLink}
                                        activeClassName={styles.active}
                                        disabledClassName={styles.disabled}
                                        forcePage={pagination.currentPage}
                                    />
                                    <div className={styles.paginationInfo}>
                                        Showing {pagination.currentPage * pagination.itemsPerPage + 1} to{" "}
                                        {Math.min((pagination.currentPage + 1) * pagination.itemsPerPage, filteredStudents.length)} of{" "}
                                        {filteredStudents.length} students
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SideBar>
        </div>
    );
}