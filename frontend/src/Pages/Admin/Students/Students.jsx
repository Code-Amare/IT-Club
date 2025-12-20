import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import ConfirmAction from "../../../Components/ConfirmAction/ConfirmAction";
import SideBar from "../../../Components/SideBar/SideBar";
import ReactPaginate from "react-paginate";
import {
    FaSearch,
    FaFilter,
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaUpload,
    FaDownload,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaUserPlus,
    FaUsers,
    FaChartBar,
    FaIdCard,
    FaEnvelope,
    FaGraduationCap,
    FaUser,
    FaTimes,
    FaCheck,
    FaExclamationTriangle
} from "react-icons/fa";
import {
    MdPerson,
    MdEmail,
    MdGrade,
    MdClass,
    MdAccountCircle,
    MdAdd,
    MdDelete,
    MdRefresh
} from "react-icons/md";
import styles from "./Students.module.css";

export default function Students() {
    const { user } = useUser();
    const navigate = useNavigate();

    // State
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkPreview, setBulkPreview] = useState([]);
    const [filters, setFilters] = useState({
        grade: "",
        section: "",
        accountStatus: "",
        dateRange: { start: "", end: "" }
    });
    const [sortConfig, setSortConfig] = useState({ key: "full_name", direction: "asc" });
    const [addForm, setAddForm] = useState({
        full_name: "",
        email: "",
        grade: "",
        section: "",
        account_status: "active"
    });
    const [pagination, setPagination] = useState({
        currentPage: 0,
        itemsPerPage: 10,
        totalItems: 0
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        byGrade: {}
    });

    // Filter operators
    const [filterOperators, setFilterOperators] = useState({
        full_name: "contains",
        email: "contains",
        grade: "equals",
        section: "equals",
        account_status: "equals"
    });

    // Fetch students
    useEffect(() => {
        if (user.isAuthenticated === null) return;
        if (!user.isAuthenticated) {
            navigate("/login");
            return;
        }
        fetchStudents();
    }, [user, navigate]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await api.get("/api/students/");
            setStudents(response.data.students || []);
            setFilteredStudents(response.data.students || []);
            setPagination(prev => ({
                ...prev,
                totalItems: response.data.students?.length || 0
            }));
            calculateStats(response.data.students || []);
        } catch (error) {
            console.error("Error fetching students:", error);
            neonToast.error("Failed to load students", "error");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (studentList) => {
        const statsData = {
            total: studentList.length,
            active: studentList.filter(s => s.account_status === "active").length,
            inactive: studentList.filter(s => s.account_status === "inactive").length,
            byGrade: {}
        };

        studentList.forEach(student => {
            if (student.grade) {
                statsData.byGrade[student.grade] = (statsData.byGrade[student.grade] || 0) + 1;
            }
        });

        setStats(statsData);
    };

    // Search and filter logic
    useEffect(() => {
        let result = [...students];

        // Text search across all fields
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(student =>
                Object.values(student).some(value =>
                    value && value.toString().toLowerCase().includes(query)
                )
            );
        }

        // Apply advanced filters
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== "") {
                if (key === "dateRange") {
                    if (filters.dateRange.start) {
                        result = result.filter(student =>
                            new Date(student.created_at) >= new Date(filters.dateRange.start)
                        );
                    }
                    if (filters.dateRange.end) {
                        result = result.filter(student =>
                            new Date(student.created_at) <= new Date(filters.dateRange.end)
                        );
                    }
                } else {
                    result = result.filter(student =>
                        student[key] === filters[key]
                    );
                }
            }
        });

        // Apply custom operators
        Object.keys(filterOperators).forEach(field => {
            const operator = filterOperators[field];
            if (operator === "greater_than" && filters[field]) {
                result = result.filter(student =>
                    parseFloat(student[field]) > parseFloat(filters[field])
                );
            } else if (operator === "less_than" && filters[field]) {
                result = result.filter(student =>
                    parseFloat(student[field]) < parseFloat(filters[field])
                );
            } else if (operator === "equals" && filters[field]) {
                result = result.filter(student =>
                    student[field] === filters[field]
                );
            }
        });

        // Apply sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }

        setFilteredStudents(result);
        setPagination(prev => ({
            ...prev,
            totalItems: result.length,
            currentPage: 0
        }));
    }, [searchQuery, filters, filterOperators, sortConfig, students]);

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

    // Add Student
    const handleAddSubmit = async () => {
        try {
            const response = await api.post("/api/students/", addForm);
            setStudents(prev => [response.data.student, ...prev]);
            setAddForm({
                full_name: "",
                email: "",
                grade: "",
                section: "",
                account_status: "active"
            });
            setShowAddModal(false);
            neonToast.success("Student added successfully", "success");
        } catch (error) {
            console.error("Error adding student:", error);
            neonToast.error(error.response?.data?.message || "Failed to add student", "error");
        }
    };

    // Bulk Upload
    const handleBulkFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            neonToast.error("Please upload a CSV or Excel file", "error");
            return;
        }

        setBulkFile(file);

        // Preview CSV content
        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            const preview = lines.slice(1, 6).map(line => {
                const values = line.split(',');
                return headers.reduce((obj, header, index) => {
                    obj[header.trim()] = values[index]?.trim() || '';
                    return obj;
                }, {});
            });
            setBulkPreview(preview);
        };
        reader.readAsText(file);
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) {
            neonToast.error("Please select a file first", "error");
            return;
        }

        const formData = new FormData();
        formData.append("file", bulkFile);

        try {
            const response = await api.post("/api/students/bulk-upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setStudents(prev => [...response.data.students, ...prev]);
            setBulkFile(null);
            setBulkPreview([]);
            setShowBulkModal(false);
            neonToast.success(`${response.data.count} students uploaded successfully`, "success");
        } catch (error) {
            console.error("Bulk upload error:", error);
            neonToast.error(error.response?.data?.message || "Failed to upload students", "error");
        }
    };

    // Delete Student
    const handleDeleteStudent = async (studentId) => {
        try {
            await api.delete(`/api/students/${studentId}/`);
            setStudents(prev => prev.filter(s => s.id !== studentId));
            neonToast.success("Student deleted successfully", "success");
        } catch (error) {
            console.error("Error deleting student:", error);
            neonToast.error("Failed to delete student", "error");
        }
    };

    // Export Students
    const handleExport = () => {
        const csvContent = [
            ["Full Name", "Email", "Grade", "Section", "Account Status", "Created At"],
            ...filteredStudents.map(s => [
                s.full_name,
                s.email,
                s.grade,
                s.section,
                s.account_status,
                new Date(s.created_at).toLocaleDateString()
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Filter handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleOperatorChange = (field, operator) => {
        setFilterOperators(prev => ({ ...prev, [field]: operator }));
    };

    const clearFilters = () => {
        setFilters({
            grade: "",
            section: "",
            accountStatus: "",
            dateRange: { start: "", end: "" }
        });
        setFilterOperators({
            full_name: "contains",
            email: "contains",
            grade: "equals",
            section: "equals",
            account_status: "equals"
        });
        setSearchQuery("");
    };

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
                            >
                                <FaDownload />
                                <span>Export CSV</span>
                            </button>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowBulkModal(true)}
                            >
                                <FaUpload />
                                <span>Bulk Upload</span>
                            </button>
                            <button
                                className={styles.primaryBtn}
                                onClick={() => setShowAddModal(true)}
                            >
                                <FaUserPlus />
                                <span>Add Student</span>
                            </button>
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
                            <FaUser />
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
                            <h3>By Grade</h3>
                            <p className={styles.statNumber}>
                                {Object.keys(stats.byGrade).length} grades
                            </p>
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
                                placeholder="Search students by name, email, grade..."
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
                                onClick={() => document.getElementById("advancedFilters").classList.toggle(styles.show)}
                            >
                                <FaFilter />
                                <span>Advanced Filters</span>
                            </button>
                            {(filters.grade || filters.section || filters.accountStatus) && (
                                <button
                                    className={styles.clearFilters}
                                    onClick={clearFilters}
                                >
                                    <FaTimes />
                                    <span>Clear Filters</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div id="advancedFilters" className={styles.advancedFilters}>
                        <div className={styles.filterGrid}>
                            <div className={styles.filterGroup}>
                                <label>Grade</label>
                                <select
                                    value={filters.grade}
                                    onChange={(e) => handleFilterChange("grade", e.target.value)}
                                >
                                    <option value="">All Grades</option>
                                    {Array.from(new Set(students.map(s => s.grade))).sort().map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                                <div className={styles.operatorSelect}>
                                    <select
                                        value={filterOperators.grade}
                                        onChange={(e) => handleOperatorChange("grade", e.target.value)}
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="greater_than">Greater Than</option>
                                        <option value="less_than">Less Than</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.filterGroup}>
                                <label>Section</label>
                                <select
                                    value={filters.section}
                                    onChange={(e) => handleFilterChange("section", e.target.value)}
                                >
                                    <option value="">All Sections</option>
                                    {Array.from(new Set(students.map(s => s.section))).sort().map(section => (
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
                                    <option value="pending">Pending</option>
                                </select>
                            </div>

                            <div className={styles.filterGroup}>
                                <label>Date Range</label>
                                <div className={styles.dateRange}>
                                    <input
                                        type="date"
                                        value={filters.dateRange.start}
                                        onChange={(e) => handleFilterChange("dateRange", {
                                            ...filters.dateRange,
                                            start: e.target.value
                                        })}
                                        placeholder="Start Date"
                                    />
                                    <span>to</span>
                                    <input
                                        type="date"
                                        value={filters.dateRange.end}
                                        onChange={(e) => handleFilterChange("dateRange", {
                                            ...filters.dateRange,
                                            end: e.target.value
                                        })}
                                        placeholder="End Date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Students Table */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <h3>Students List</h3>
                        <div className={styles.tableControls}>
                            <select
                                value={pagination.itemsPerPage}
                                onChange={(e) => setPagination(prev => ({
                                    ...prev,
                                    itemsPerPage: parseInt(e.target.value),
                                    currentPage: 0
                                }))}
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
                                                    <span>Full Name</span>
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
                                                    <span>Account Status</span>
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
                                                        <button
                                                            className={styles.viewBtn}
                                                            onClick={() => {
                                                                setSelectedStudent(student);
                                                                setShowDetails(true);
                                                            }}
                                                        >
                                                            <FaEye />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            className={styles.editBtn}
                                                            onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                                                        >
                                                            <FaEdit />
                                                            <span>Edit</span>
                                                        </button>
                                                        <ConfirmAction
                                                            onConfirm={() => handleDeleteStudent(student.id)}
                                                            title="Delete Student"
                                                            message={`Are you sure you want to delete ${student.full_name}? This action cannot be undone.`}
                                                            confirmText="Delete"
                                                            cancelText="Cancel"
                                                        >
                                                            <button className={styles.deleteBtn}>
                                                                <FaTrash />
                                                                <span>Delete</span>
                                                            </button>
                                                        </ConfirmAction>
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
                                    <p>Try adjusting your search or filters</p>
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

            {/* Add Student Modal */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>
                                <FaUserPlus />
                                <span>Add New Student</span>
                            </h2>
                            <button
                                className={styles.closeModal}
                                onClick={() => setShowAddModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        value={addForm.full_name}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={addForm.email}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="student@example.com"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Grade</label>
                                    <input
                                        type="text"
                                        value={addForm.grade}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, grade: e.target.value }))}
                                        placeholder="e.g., 10th"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Section</label>
                                    <input
                                        type="text"
                                        value={addForm.section}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, section: e.target.value }))}
                                        placeholder="e.g., A"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Account Status</label>
                                    <select
                                        value={addForm.account_status}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, account_status: e.target.value }))}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                            <AsyncButton
                                className={styles.primaryBtn}
                                onClick={handleAddSubmit}
                                disabled={!addForm.full_name || !addForm.email}
                            >
                                <FaUserPlus />
                                <span>Add Student</span>
                            </AsyncButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>
                                <FaUpload />
                                <span>Bulk Upload Students</span>
                            </h2>
                            <button
                                className={styles.closeModal}
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setBulkFile(null);
                                    setBulkPreview([]);
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.uploadArea}>
                                <div className={styles.uploadPrompt}>
                                    <FaUpload size={48} />
                                    <h3>Upload CSV or Excel File</h3>
                                    <p>File should contain columns: full_name, email, grade, section, account_status</p>
                                    <input
                                        type="file"
                                        id="bulkUpload"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleBulkFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="bulkUpload" className={styles.uploadBtn}>
                                        Choose File
                                    </label>
                                    {bulkFile && (
                                        <div className={styles.fileInfo}>
                                            <FaCheck />
                                            <span>{bulkFile.name} ({Math.round(bulkFile.size / 1024)} KB)</span>
                                        </div>
                                    )}
                                </div>

                                {bulkPreview.length > 0 && (
                                    <div className={styles.previewSection}>
                                        <h4>Preview (first 5 rows)</h4>
                                        <div className={styles.previewTable}>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        {Object.keys(bulkPreview[0]).map(key => (
                                                            <th key={key}>{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bulkPreview.map((row, index) => (
                                                        <tr key={index}>
                                                            {Object.values(row).map((value, i) => (
                                                                <td key={i}>{value}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setBulkFile(null);
                                    setBulkPreview([]);
                                }}
                            >
                                Cancel
                            </button>
                            <AsyncButton
                                className={styles.primaryBtn}
                                onClick={handleBulkUpload}
                                disabled={!bulkFile}
                            >
                                <FaUpload />
                                <span>Upload Students</span>
                            </AsyncButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Details Modal */}
            {showDetails && selectedStudent && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} ${styles.detailsModal}`}>
                        <div className={styles.modalHeader}>
                            <h2>
                                <FaIdCard />
                                <span>Student Details</span>
                            </h2>
                            <button
                                className={styles.closeModal}
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedStudent(null);
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.detailsHeader}>
                                <div className={styles.detailsAvatar}>
                                    {selectedStudent.full_name?.charAt(0) || "S"}
                                </div>
                                <div className={styles.detailsTitle}>
                                    <h3>{selectedStudent.full_name}</h3>
                                    <p>ID: {selectedStudent.id}</p>
                                </div>
                            </div>

                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <FaEnvelope />
                                    </div>
                                    <div>
                                        <label>Email</label>
                                        <p>{selectedStudent.email}</p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <FaGraduationCap />
                                    </div>
                                    <div>
                                        <label>Grade</label>
                                        <p>{selectedStudent.grade}</p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <MdClass />
                                    </div>
                                    <div>
                                        <label>Section</label>
                                        <p>{selectedStudent.section}</p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <FaUser />
                                    </div>
                                    <div>
                                        <label>Account Status</label>
                                        <p className={`${styles.statusText} ${selectedStudent.account_status === "active" ? styles.active :
                                            selectedStudent.account_status === "inactive" ? styles.inactive :
                                                styles.pending
                                            }`}>
                                            {selectedStudent.account_status}
                                        </p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <FaChartBar />
                                    </div>
                                    <div>
                                        <label>Created</label>
                                        <p>{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <div className={styles.detailIcon}>
                                        <MdRefresh />
                                    </div>
                                    <div>
                                        <label>Last Updated</label>
                                        <p>{new Date(selectedStudent.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedStudent.notes && (
                                <div className={styles.notesSection}>
                                    <h4>Notes</h4>
                                    <p>{selectedStudent.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.secondaryBtn}
                                onClick={() => {
                                    setShowDetails(false);
                                    setSelectedStudent(null);
                                }}
                            >
                                Close
                            </button>
                            <button
                                className={styles.primaryBtn}
                                onClick={() => {
                                    setShowDetails(false);
                                    navigate(`/admin/students/${selectedStudent.id}/edit`);
                                }}
                            >
                                <FaEdit />
                                <span>Edit Student</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}