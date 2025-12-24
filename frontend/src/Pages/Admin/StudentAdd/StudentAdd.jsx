import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    FaArrowLeft,
    FaUser,
    FaCheckCircle,
    FaTimesCircle
} from "react-icons/fa";
import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdSchool,
    MdClass
} from "react-icons/md";
import styles from "./StudentAdd.module.css";

export default function StudentAdd() {
    const navigate = useNavigate();
    const { user } = useUser();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        grade: "",
        section: "",
        field: "",
        account: "",
        account_status: "active",
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitAction, setSubmitAction] = useState("add"); // "add" or "saveAndNew"

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
        if (formData.phone_number && !/^[\d\s\-\+\(\)]+$/.test(formData.phone_number))
            newErrors.phone_number = "Phone number is invalid";
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
            const studentData = {
                full_name: formData.full_name,
                email: formData.email,
                phone_number: formData.phone_number,
                grade: formData.grade,
                section: formData.section,
                field: formData.field,
                account: formData.account,
                account_status: formData.account_status,
            };

            const response = await api.post("/api/management/students/create/", studentData);

            neonToast.success("Student added successfully!", "success");

            if (submitAction === "saveAndNew") {
                setFormData({
                    full_name: "",
                    email: "",
                    phone_number: "",
                    grade: "",
                    section: "",
                    field: "",
                    account: "",
                    account_status: "active",
                });
                setErrors({});
                setSubmitAction("add");
                window.scrollTo(0, 0);
                neonToast.info("Form cleared. Add another student.", "info");
            } else {
                const studentId = response?.data?.student?.id;
                if (studentId) navigate(`/admin/student/${studentId}`);
                else navigate("/admin/students");
            }
        } catch (error) {
            console.error("Error adding student:", error?.response?.data || error);
            if (error.response?.data?.error) {
                neonToast.error(error.response.data.error, "error");
            } else if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                neonToast.error("Please fix the errors in the form", "error");
            } else {
                neonToast.error(
                    error.response?.data?.detail || "Failed to add student",
                    "error"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <SideBar>
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button className={styles.backBtn} onClick={() => navigate("/admin/students")}>
                            <FaArrowLeft /> Back to Students
                        </button>
                        <h1 className={styles.title}><FaUser /> Add New Student</h1>
                    </div>
                    <p className={styles.subtitle}>
                        Add a new student to the system. All fields marked with * are required.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}><MdPerson /> Personal Information</h2>

                            <div className={styles.formGroup}>
                                <label htmlFor="full_name">Full Name *</label>
                                <div className={styles.inputWithIcon}>
                                    <FaUser className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        placeholder="Enter student's full name"
                                        className={errors.full_name ? styles.errorInput : ""}
                                        required
                                    />
                                </div>
                                {errors.full_name && <span className={styles.errorText}>{errors.full_name}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="email">Email Address *</label>
                                <div className={styles.inputWithIcon}>
                                    <MdEmail className={styles.inputIcon} />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="student@example.com"
                                        className={errors.email ? styles.errorInput : ""}
                                        required
                                    />
                                </div>
                                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="phone_number">Phone Number</label>
                                <div className={styles.inputWithIcon}>
                                    <MdPhone className={styles.inputIcon} />
                                    <input
                                        type="tel"
                                        id="phone_number"
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        placeholder="(123) 456-7890"
                                        className={errors.phone_number ? styles.errorInput : ""}
                                    />
                                </div>
                                {errors.phone_number && <span className={styles.errorText}>{errors.phone_number}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="account">Account Identifier</label>
                                <div className={styles.inputWithIcon}>
                                    <MdPerson className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        id="account"
                                        name="account"
                                        value={formData.account}
                                        onChange={handleChange}
                                        placeholder="e.g., student_id_123"
                                        className={errors.account ? styles.errorInput : ""}
                                    />
                                </div>
                                {errors.account && <span className={styles.errorText}>{errors.account}</span>}
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}><MdSchool /> Academic Information</h2>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="grade">Grade Level</label>
                                    <div className={styles.inputWithIcon}>
                                        <FaUser className={styles.inputIcon} />
                                        <select
                                            id="grade"
                                            name="grade"
                                            value={formData.grade}
                                            onChange={handleChange}
                                            className={errors.grade ? styles.errorInput : ""}
                                        >
                                            <option value="">Select Grade</option>
                                            <option value="9">Grade 9</option>
                                            <option value="10">Grade 10</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {errors.grade && <span className={styles.errorText}>{errors.grade}</span>}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="section">Section</label>
                                    <div className={styles.inputWithIcon}>
                                        <MdClass className={styles.inputIcon} />
                                        <select
                                            id="section"
                                            name="section"
                                            value={formData.section}
                                            onChange={handleChange}
                                            className={errors.section ? styles.errorInput : ""}
                                        >
                                            <option value="">Select Section</option>
                                            <option value="A">Section A</option>
                                            <option value="B">Section B</option>
                                            <option value="C">Section C</option>
                                            <option value="D">Section D</option>
                                            <option value="E">Section E</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    {errors.section && <span className={styles.errorText}>{errors.section}</span>}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="field">Field</label>
                                <div className={styles.inputWithIcon}>
                                    <MdClass className={styles.inputIcon} />
                                    <select id="field" name="field" value={formData.field} onChange={handleChange}>
                                        <option value="">Select field</option>
                                        <option value="frontend">Frontend</option>
                                        <option value="backend">Backend</option>
                                        <option value="cyber">Cyber</option>
                                        <option value="embedded">Embedded</option>
                                        <option value="ai">AI</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                {errors.field && <span className={styles.errorText}>{errors.field}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="account_status">Account Status</label>
                                <div className={styles.statusSelect}>
                                    <select
                                        id="account_status"
                                        name="account_status"
                                        value={formData.account_status}
                                        onChange={handleChange}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                    <div className={styles.statusIndicator} data-status={formData.account_status}>
                                        {formData.account_status === "active" ? (
                                            <FaCheckCircle className={styles.activeIcon} />
                                        ) : (
                                            <FaTimesCircle className={styles.inactiveIcon} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/admin/students")}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <div className={styles.primaryActions}>
                            <AsyncButton
                                type="submit"
                                className={styles.secondaryBtn}
                                loading={loading}
                                disabled={loading}
                                onClick={() => setSubmitAction("saveAndNew")}
                            >
                                Save & Add Another
                            </AsyncButton>

                            <AsyncButton
                                type="submit"
                                className={styles.primaryBtn}
                                loading={loading}
                                disabled={loading}
                                onClick={() => setSubmitAction("add")}
                            >
                                <FaUser /> Add Student
                            </AsyncButton>
                        </div>
                    </div>
                </form>
            </SideBar>
        </div>
    );
}
