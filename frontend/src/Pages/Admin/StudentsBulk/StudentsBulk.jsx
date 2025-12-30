import React, { useState, useRef, useEffect } from 'react';
import styles from './StudentsBulk.module.css';
import SideBar from '../../../Components/SideBar/SideBar';
import api from '../../../Utils/api';
import { neonToast } from '../../../Components/NeonToast/NeonToast';
import {
    FaUpload,
    FaDownload,
    FaFileExcel,
    FaFileCsv,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSpinner,
    FaEye,
    FaEyeSlash,
    FaTimes,
    FaCopy
} from 'react-icons/fa';
import { FiAlertCircle, FiInfo } from 'react-icons/fi';

const StudentsBulk = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [createdStudents, setCreatedStudents] = useState([]);
    const [showPasswords, setShowPasswords] = useState({});
    const [activeTab, setActiveTab] = useState('upload');
    const [showTemplateInfo, setShowTemplateInfo] = useState(false);
    const fileInputRef = useRef(null);
    const resultsRef = useRef(null);

    const requiredColumns = [
        "full_name",
        "email",
        "grade",
        "section",
        "field",
        "phone_number"
    ];

    const optionalColumns = ["account"];
    const fieldOptions = ["ai", "other", "backend", "frontend", "embbaded"];

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['csv', 'xlsx', 'xls'];

        if (!allowedExtensions.includes(fileExtension)) {
            neonToast.error('Invalid file format. Please upload CSV or Excel files.', 'error');
            e.target.value = '';
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            neonToast.error('File size too large. Maximum size is 5MB.', 'error');
            e.target.value = '';
            return;
        }

        setFile(selectedFile);
        setUploadResults(null);
        setValidationErrors([]);
        setCreatedStudents([]);
    };

    const handleUpload = async () => {
        if (!file) {
            neonToast.error('Please select a file to upload', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const response = await api.post('/api/management/students/bulk-upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { data } = response;

            if (data.errors && data.errors.length > 0) {
                setValidationErrors(data.errors);
                if (data.created_students && data.created_students.length > 0) {
                    setCreatedStudents(data.created_students);
                }
                neonToast.warning(`Upload completed with ${data.error_count} errors`, 'warning');
            } else {
                setCreatedStudents(data.created_students || []);
                neonToast.success(`Successfully uploaded ${data.created_count} students`, 'success');
            }

            setUploadResults(data);

            setTimeout(() => {
                if (resultsRef.current) {
                    resultsRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);

        } catch (error) {
            console.error('Upload error:', error);
            let errorMessage = 'Failed to upload file';

            if (error.response?.data) {
                const { error: apiError, errors, detail } = error.response.data;
                if (apiError) errorMessage = apiError;
                if (errors) setValidationErrors(Array.isArray(errors) ? errors : [errors]);
                if (detail) errorMessage += `: ${detail}`;
            }

            neonToast.error(errorMessage, 'error');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (format = 'csv') => {
        const headers = [...requiredColumns, ...optionalColumns];
        let content = '';

        if (format === 'csv') {
            content = headers.join(',') + '\n';
            const exampleRow = [
                'John Doe',
                'john.doe@example.com',
                '10',
                'A',
                'ai',
                '+1234567890',
                'optional_account_id'
            ];
            content += exampleRow.join(',');
        } else {
            content = headers.join('\t') + '\n';
            const exampleRow = [
                'John Doe',
                'john.doe@example.com',
                '10',
                'A',
                'ai',
                '+1234567890',
                'optional_account_id'
            ];
            content += exampleRow.join('\t');
        }

        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_template.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        neonToast.info(`Template downloaded as ${format.toUpperCase()}`, 'info');
    };

    const togglePasswordVisibility = (studentId) => {
        setShowPasswords(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const copyPassword = (password, studentName) => {
        navigator.clipboard.writeText(password).then(() => {
            neonToast.success(`Password for ${studentName} copied to clipboard`, 'success');
        }).catch(() => {
            neonToast.error('Failed to copy password', 'error');
        });
    };

    const formatError = (errorObj) => {
        if (typeof errorObj === 'string') return errorObj;
        if (Array.isArray(errorObj)) return errorObj.join(', ');
        if (typeof errorObj === 'object') {
            return Object.entries(errorObj).map(([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
            ).join('; ');
        }
        return String(errorObj);
    };

    const clearAll = () => {
        setFile(null);
        setUploadResults(null);
        setValidationErrors([]);
        setCreatedStudents([]);
        setShowPasswords({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.StudentsBulkUploadContainer}>
            <SideBar>
                <div className={styles.StudentsBulkUpload}>
                    {/* Header */}
                    <header className={styles.header}>
                        <div className={styles.headerContent}>
                            <h1>
                                <FaUpload className={styles.headerIcon} />
                                Bulk Student Upload
                            </h1>
                            <p className={styles.subtitle}>
                                Upload CSV or Excel files to create multiple student accounts at once
                            </p>
                        </div>

                        <div className={styles.headerActions}>
                            <button
                                className={`${styles.actionButton} ${styles.infoButton}`}
                                onClick={() => setShowTemplateInfo(!showTemplateInfo)}
                            >
                                <FiInfo />
                                Template Info
                            </button>

                            <div className={styles.templateButtons}>
                                <button
                                    className={`${styles.actionButton} ${styles.templateButton}`}
                                    onClick={() => downloadTemplate('csv')}
                                >
                                    <FaFileCsv />
                                    CSV Template
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.templateButton}`}
                                    onClick={() => downloadTemplate('xlsx')}
                                >
                                    <FaFileExcel />
                                    Excel Template
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Template Info Modal */}
                    {showTemplateInfo && (
                        <div className={styles.templateInfoModal}>
                            <div className={styles.modalContent}>
                                <div className={styles.modalHeader}>
                                    <h3>File Template Requirements</h3>
                                    <button
                                        className={styles.closeButton}
                                        onClick={() => setShowTemplateInfo(false)}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className={styles.modalBody}>
                                    <div className={styles.infoSection}>
                                        <h4>Required Columns:</h4>
                                        <div className={styles.columnsGrid}>
                                            {requiredColumns.map((col, index) => (
                                                <div key={index} className={styles.columnItem}>
                                                    <span className={styles.columnName}>{col}</span>
                                                    <span className={styles.columnDescription}>
                                                        {col === 'grade' ? 'Number between 1-12' :
                                                            col === 'section' ? 'Single letter (A-Z)' :
                                                                col === 'field' ? `One of: ${fieldOptions.join(', ')}` :
                                                                    col === 'email' ? 'Valid email address' :
                                                                        'Required field'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.infoSection}>
                                        <h4>Optional Columns:</h4>
                                        <div className={styles.columnsGrid}>
                                            {optionalColumns.map((col, index) => (
                                                <div key={index} className={styles.columnItem}>
                                                    <span className={styles.columnName}>{col}</span>
                                                    <span className={styles.columnDescription}>
                                                        Optional student account identifier
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.infoSection}>
                                        <h4>Example Data:</h4>
                                        <div className={styles.exampleTable}>
                                            <div className={styles.exampleHeader}>
                                                {[...requiredColumns, ...optionalColumns].map((col, i) => (
                                                    <div key={i} className={styles.exampleCell}>{col}</div>
                                                ))}
                                            </div>
                                            <div className={styles.exampleRow}>
                                                <div className={styles.exampleCell}>John Doe</div>
                                                <div className={styles.exampleCell}>john@example.com</div>
                                                <div className={styles.exampleCell}>10</div>
                                                <div className={styles.exampleCell}>A</div>
                                                <div className={styles.exampleCell}>ai</div>
                                                <div className={styles.exampleCell}>+1234567890</div>
                                                <div className={styles.exampleCell}>student_123</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.infoSection}>
                                        <div className={styles.note}>
                                            <FiAlertCircle className={styles.noteIcon} />
                                            <div className={styles.noteContent}>
                                                <strong>Important Notes:</strong>
                                                <ul>
                                                    <li>Emails must be unique across the system</li>
                                                    <li>Grade must be a number between 1 and 12</li>
                                                    <li>Section must be a single uppercase letter</li>
                                                    <li>Field must be one of the specified values</li>
                                                    <li>Duplicate emails in the file will be rejected</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload Section */}
                    <div className={styles.uploadSection}>
                        <div className={styles.uploadCard}>
                            <div className={styles.uploadHeader}>
                                <h2>Upload Student Data</h2>
                                <p className={styles.uploadSubtitle}>
                                    Select a CSV or Excel file containing student information
                                </p>
                            </div>

                            <div className={styles.dropZone}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add(styles.dragOver);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove(styles.dragOver);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove(styles.dragOver);
                                    if (e.dataTransfer.files.length > 0) {
                                        handleFileSelect({ target: { files: e.dataTransfer.files } });
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".csv,.xlsx,.xls"
                                    className={styles.fileInput}
                                />

                                {!file ? (
                                    <div className={styles.dropZoneContent}>
                                        <FaUpload className={styles.dropZoneIcon} />
                                        <p className={styles.dropZoneText}>
                                            Drag & drop your file here or click to browse
                                        </p>
                                        <p className={styles.dropZoneHint}>
                                            Supports CSV, XLSX, XLS (Max 5MB)
                                        </p>
                                    </div>
                                ) : (
                                    <div className={styles.fileSelected}>
                                        <div className={styles.fileInfo}>
                                            <FaFileCsv className={styles.fileIcon} />
                                            <div className={styles.fileDetails}>
                                                <h4>{file.name}</h4>
                                                <p>{(file.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.removeFileButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.uploadActions}>
                                <button
                                    className={`${styles.uploadButton} ${!file || uploading ? styles.disabled : ''}`}
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <FaSpinner className={styles.spinner} />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <FaUpload />
                                            Upload Students
                                        </>
                                    )}
                                </button>

                                {file && (
                                    <button
                                        className={styles.clearButton}
                                        onClick={clearAll}
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    {(uploadResults || validationErrors.length > 0) && (
                        <div ref={resultsRef} className={styles.resultsSection}>
                            {/* Tabs */}
                            <div className={styles.resultsTabs}>
                                <button
                                    className={`${styles.tabButton} ${activeTab === 'upload' ? styles.active : ''}`}
                                    onClick={() => setActiveTab('upload')}
                                >
                                    Upload Results
                                </button>
                                {validationErrors.length > 0 && (
                                    <button
                                        className={`${styles.tabButton} ${activeTab === 'errors' ? styles.active : ''}`}
                                        onClick={() => setActiveTab('errors')}
                                    >
                                        <FaExclamationTriangle />
                                        Errors ({validationErrors.length})
                                    </button>
                                )}
                                {createdStudents.length > 0 && (
                                    <button
                                        className={`${styles.tabButton} ${activeTab === 'students' ? styles.active : ''}`}
                                        onClick={() => setActiveTab('students')}
                                    >
                                        <FaCheckCircle />
                                        Created Students ({createdStudents.length})
                                    </button>
                                )}
                            </div>

                            {/* Tab Content */}
                            <div className={styles.tabContent}>
                                {activeTab === 'upload' && uploadResults && (
                                    <div className={styles.summaryCard}>
                                        <div className={styles.summaryHeader}>
                                            <h3>Upload Summary</h3>
                                            <div className={styles.summaryStats}>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statLabel}>Total Processed:</span>
                                                    <span className={styles.statValue}>
                                                        {uploadResults.created_count + (uploadResults.error_count || 0)}
                                                    </span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statLabel}>Successfully Created:</span>
                                                    <span className={styles.statValue}>
                                                        {uploadResults.created_count}
                                                    </span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <span className={styles.statLabel}>Errors:</span>
                                                    <span className={styles.statValue}>
                                                        {uploadResults.error_count || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {uploadResults.learning_task_limit_default && (
                                            <div className={styles.noteCard}>
                                                <FiInfo className={styles.noteIcon} />
                                                <p>
                                                    All created students have been assigned a default learning task limit of{' '}
                                                    <strong>{uploadResults.learning_task_limit_default}</strong> tasks.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'errors' && validationErrors.length > 0 && (
                                    <div className={styles.errorsCard}>
                                        <div className={styles.errorsHeader}>
                                            <h3>
                                                <FaExclamationTriangle />
                                                Validation Errors
                                            </h3>
                                            <p className={styles.errorsSubtitle}>
                                                Please fix these errors and try uploading again
                                            </p>
                                        </div>

                                        <div className={styles.errorsList}>
                                            {validationErrors.map((error, index) => (
                                                <div key={index} className={styles.errorItem}>
                                                    <div className={styles.errorHeader}>
                                                        <span className={styles.errorRow}>Row {error.row}</span>
                                                        <span className={styles.errorEmail}>{error.email}</span>
                                                    </div>
                                                    <div className={styles.errorDetails}>
                                                        {error.errors ? (
                                                            Object.entries(error.errors).map(([field, fieldErrors]) => (
                                                                <div key={field} className={styles.fieldError}>
                                                                    <strong>{field}:</strong>{' '}
                                                                    {Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className={styles.fieldError}>
                                                                {formatError(error.error || error)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'students' && createdStudents.length > 0 && (
                                    <div className={styles.studentsCard}>
                                        <div className={styles.studentsHeader}>
                                            <h3>
                                                <FaCheckCircle />
                                                Successfully Created Students
                                            </h3>
                                            <div className={styles.studentsActions}>
                                                <button
                                                    className={styles.togglePasswordsButton}
                                                    onClick={() => {
                                                        const allShown = Object.values(showPasswords).every(v => v);
                                                        const newState = {};
                                                        createdStudents.forEach(student => {
                                                            newState[student.id] = !allShown;
                                                        });
                                                        setShowPasswords(newState);
                                                    }}
                                                >
                                                    {Object.values(showPasswords).every(v => v) ? (
                                                        <>Hide All Passwords</>
                                                    ) : (
                                                        <>Show All Passwords</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.studentsTableContainer}>
                                            <table className={styles.studentsTable}>
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Grade & Section</th>
                                                        <th>Field</th>
                                                        <th>Phone</th>
                                                        <th>Temporary Password</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {createdStudents.map((student) => (
                                                        <tr key={student.id}>
                                                            <td>
                                                                <div className={styles.studentName}>
                                                                    {student.full_name}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className={styles.studentEmail}>
                                                                    {student.email}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={styles.gradeSectionBadge}>
                                                                    Grade {student.grade} - {student.section}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={styles.fieldBadge}>
                                                                    {student.field}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {student.phone_number}
                                                            </td>
                                                            <td>
                                                                <div className={styles.passwordCell}>
                                                                    <span className={styles.passwordValue}>
                                                                        {showPasswords[student.id]
                                                                            ? student.temporary_password || 'Generated on server'
                                                                            : '••••••••••••'}
                                                                    </span>
                                                                    <div className={styles.passwordActions}>
                                                                        <button
                                                                            className={styles.passwordToggle}
                                                                            onClick={() => togglePasswordVisibility(student.id)}
                                                                        >
                                                                            {showPasswords[student.id] ? <FaEyeSlash /> : <FaEye />}
                                                                        </button>
                                                                        <button
                                                                            className={styles.passwordCopy}
                                                                            onClick={() => copyPassword(
                                                                                student.temporary_password || 'No password available',
                                                                                student.full_name
                                                                            )}
                                                                        >
                                                                            <FaCopy />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={styles.messageBadge}>
                                                                    {student.message || 'Change password on first login'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className={styles.importantNote}>
                                            <div className={styles.noteHeader}>
                                                <FiAlertCircle />
                                                <strong>Important:</strong>
                                            </div>
                                            <p>
                                                Students must change their temporary passwords on first login.
                                                Make sure to provide them with their temporary passwords securely.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SideBar>
        </div>
    );
};

export default StudentsBulk;