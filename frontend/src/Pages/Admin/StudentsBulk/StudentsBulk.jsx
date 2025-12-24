import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../Context/UserContext";
import api from "../../../Utils/api";
import { neonToast } from "../../../Components/NeonToast/NeonToast";
import AsyncButton from "../../../Components/AsyncButton/AsyncButton";
import SideBar from "../../../Components/SideBar/SideBar";
import {
    FaArrowLeft,
    FaUpload,
    FaDownload,
    FaCheck,
    FaTimes,
    FaExclamationTriangle,
    FaFileExcel,
    FaFileCsv,
    FaUsers
} from "react-icons/fa";
import {
    MdCloudUpload,
    MdError,
    MdCheckCircle,
    MdWarning
} from "react-icons/md";
import styles from "./StudentsBulk.module.css";

export default function StudentsBulk() {
    const navigate = useNavigate();
    const { user } = useUser();

    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [validationResults, setValidationResults] = useState(null);
    const [uploadResults, setUploadResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results
    const [templateType, setTemplateType] = useState("csv");

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

        if (!validTypes.includes(fileExtension)) {
            neonToast.error("Please upload a CSV or Excel file", "error");
            return;
        }

        // Validate file size (max 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            neonToast.error("File size should not exceed 10MB", "error");
            return;
        }

        setFile(selectedFile);
        parseFile(selectedFile);
    };

    const parseFile = (file) => {
        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim() !== '');
                    if (lines.length === 0) {
                        neonToast.error("CSV file is empty", "error");
                        return;
                    }

                    const headers = lines[0].split(',').map(h => h.trim());
                    const data = lines.slice(1, 11).map((line, index) => {
                        const values = line.split(',').map(v => v.trim());
                        const row = {};
                        headers.forEach((header, i) => {
                            row[header] = values[i] || '';
                        });
                        return { id: index + 1, ...row };
                    });

                    setPreview(data);
                    setStep(2);
                    validateData(data, headers);
                } catch (error) {
                    console.error("Error parsing CSV:", error);
                    neonToast.error("Error parsing CSV file. Please check the format.", "error");
                }
            };
            reader.onerror = () => {
                neonToast.error("Error reading file", "error");
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            // For Excel files, we'll just upload them to the backend without parsing on frontend
            // The backend will handle Excel parsing
            neonToast.info("Excel file selected. Validation will be done after upload.", "info");

            // Create a simple preview with just the filename
            const previewData = [
                { id: 1, note: "Excel files are processed server-side after upload." },
                { id: 2, note: "Please proceed to upload for validation." }
            ];

            setPreview(previewData);
            setStep(2);

            // For Excel files, we'll do minimal validation
            const validation = {
                totalRows: 1, // Placeholder
                validRows: 1,
                invalidRows: 0,
                errors: [],
                missingFields: [],
                duplicates: new Set(),
                warnings: [{
                    message: "Excel file validation will be done server-side after upload.",
                    severity: 'info'
                }]
            };
            setValidationResults(validation);
        }
    };

    const validateData = (data, headers) => {
        const requiredFields = ['full_name', 'email', 'grade', 'section'];
        const validation = {
            totalRows: data.length,
            validRows: 0,
            invalidRows: 0,
            errors: [],
            missingFields: [],
            duplicates: new Set(),
            warnings: []
        };

        // Check for missing required fields
        const missingFields = requiredFields.filter(field => !headers.includes(field));
        if (missingFields.length > 0) {
            validation.missingFields = missingFields;
            validation.errors.push({
                type: 'missing_fields',
                message: `Missing required columns: ${missingFields.join(', ')}`,
                severity: 'error'
            });
        }

        // Validate each row
        const emailSet = new Set();

        data.forEach((row, index) => {
            const rowErrors = [];

            // Check required fields
            requiredFields.forEach(field => {
                if (!row[field] || row[field].toString().trim() === '') {
                    rowErrors.push(`Missing ${field}`);
                }
            });

            // Validate email format
            if (row.email && !/\S+@\S+\.\S+/.test(row.email)) {
                rowErrors.push('Invalid email format');
            }

            // Check for duplicate emails
            if (row.email) {
                const emailLower = row.email.toLowerCase();
                if (emailSet.has(emailLower)) {
                    rowErrors.push('Duplicate email');
                } else {
                    emailSet.add(emailLower);
                }
            }

            // Validate account_status if present
            if (row.account_status && !['active', 'inactive', 'pending'].includes(row.account_status)) {
                rowErrors.push('Invalid account_status (must be active, inactive, or pending)');
            }

            if (rowErrors.length === 0) {
                validation.validRows++;
            } else {
                validation.invalidRows++;
                validation.errors.push({
                    type: 'row_error',
                    row: index + 2,
                    errors: rowErrors,
                    data: row
                });
            }
        });

        // Add warnings
        if (data.length > 100) {
            validation.warnings.push({
                message: `Large file detected (${data.length} rows). Upload may take several minutes.`,
                severity: 'warning'
            });
        }

        if (validation.validRows === 0 && validation.invalidRows > 0) {
            validation.warnings.push({
                message: 'No valid rows found. Please check your data format.',
                severity: 'error'
            });
        }

        setValidationResults(validation);
    };

    const downloadTemplate = async () => {
        setTemplateLoading(true);
        try {
            // Call backend API to download template
            const response = await api.get(`/api/management/students/template/?format=${templateType}`, {
                responseType: 'blob',
            });

            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `student_template_${new Date().toISOString().split('T')[0]}.${templateType === 'csv' ? 'csv' : 'xlsx'}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length === 2) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            neonToast.success(`Template downloaded as ${templateType.toUpperCase()}`, "success");
        } catch (error) {
            console.error("Error downloading template:", error);
            neonToast.error(
                error.response?.data?.message || "Failed to download template",
                "error"
            );
        } finally {
            setTemplateLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            neonToast.error("Please select a file first", "error");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/api/management/students/bulk-upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            setUploadResults(response.data);
            setStep(3);
            neonToast.success(`Successfully uploaded ${response.data.created || 0} students`, "success");

            if (response.data.errors && response.data.errors.length > 0) {
                neonToast.warning(`${response.data.errors.length} rows had errors`, "warning");
            }
        } catch (error) {
            console.error("Bulk upload error:", error);
            neonToast.error(
                error.response?.data?.message || "Failed to upload students",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setPreview([]);
        setValidationResults(null);
        setUploadResults(null);
        setStep(1);
        // Reset file input
        const fileInput = document.getElementById('fileUpload');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const renderStepIndicator = () => (
        <div className={styles.stepIndicator}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepLabel}>Upload File</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepLabel}>Preview & Validate</div>
            </div>
            <div className={styles.stepLine}></div>
            <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepLabel}>Results</div>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <SideBar>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button
                            className={styles.backBtn}
                            onClick={() => navigate("/admin/students")}
                            type="button"
                        >
                            <FaArrowLeft /> Back to Students
                        </button>
                        <h1 className={styles.title}>
                            <FaUpload /> Bulk Student Upload
                        </h1>
                    </div>
                    <p className={styles.subtitle}>
                        Upload multiple students at once using CSV or Excel files
                    </p>
                </div>

                {renderStepIndicator()}

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className={styles.uploadStep}>
                        <div className={styles.uploadCard}>
                            <div className={styles.uploadArea}>
                                <div className={styles.uploadIcon}>
                                    <MdCloudUpload />
                                </div>
                                <h3>Upload Student Data File</h3>
                                <p>Supported formats: CSV, XLSX, XLS (Max 10MB)</p>

                                <div className={styles.fileInputWrapper}>
                                    <input
                                        type="file"
                                        id="fileUpload"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileChange}
                                        className={styles.fileInput}
                                    />
                                    <label htmlFor="fileUpload" className={styles.uploadBtn}>
                                        <FaUpload /> Choose File
                                    </label>
                                    <span className={styles.fileHint}>or drag and drop here</span>
                                </div>

                                {file && (
                                    <div className={styles.fileInfo}>
                                        <FaCheck />
                                        <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                                        <button
                                            className={styles.removeFile}
                                            onClick={() => {
                                                setFile(null);
                                                const fileInput = document.getElementById('fileUpload');
                                                if (fileInput) fileInput.value = '';
                                            }}
                                            type="button"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.templateSection}>
                                <h4>
                                    <FaDownload /> Download Template
                                </h4>
                                <p>Use our template to ensure proper formatting</p>

                                <div className={styles.templateOptions}>
                                    <button
                                        type="button"
                                        className={`${styles.templateBtn} ${templateType === 'csv' ? styles.active : ''}`}
                                        onClick={() => setTemplateType('csv')}
                                        disabled={templateLoading}
                                    >
                                        <FaFileCsv /> CSV Template
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.templateBtn} ${templateType === 'excel' ? styles.active : ''}`}
                                        onClick={() => setTemplateType('excel')}
                                        disabled={templateLoading}
                                    >
                                        <FaFileExcel /> Excel Template
                                    </button>
                                </div>

                                <AsyncButton
                                    className={styles.downloadBtn}
                                    onClick={downloadTemplate}
                                    loading={templateLoading}
                                    disabled={templateLoading}
                                >
                                    <FaDownload /> Download {templateType.toUpperCase()} Template
                                </AsyncButton>

                                <div className={styles.templateInfo}>
                                    <h5>Required Fields:</h5>
                                    <ul>
                                        <li><strong>full_name</strong> (required) - Student's full name</li>
                                        <li><strong>email</strong> (required) - Valid email address</li>
                                        <li><strong>grade</strong> (required) - Grade level (9-12)</li>
                                        <li><strong>section</strong> (required) - Section (A, B, C, etc.)</li>
                                    </ul>
                                    <h5>Optional Fields:</h5>
                                    <ul>
                                        <li><strong>phone</strong> - Phone number</li>
                                        <li><strong>date_of_birth</strong> - YYYY-MM-DD format</li>
                                        <li><strong>address</strong> - Full address</li>
                                        <li><strong>parent_name</strong> - Parent/guardian name</li>
                                        <li><strong>parent_phone</strong> - Parent phone</li>
                                        <li><strong>parent_email</strong> - Parent email</li>
                                        <li><strong>account_status</strong> - active/inactive/pending</li>
                                        <li><strong>notes</strong> - Additional notes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview & Validate */}
                {step === 2 && validationResults && (
                    <div className={styles.previewStep}>
                        <div className={styles.validationCard}>
                            <h3>
                                <MdCheckCircle /> Validation Results
                            </h3>

                            <div className={styles.validationStats}>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber} style={{ color: 'var(--success)' }}>
                                        {file && file.name.endsWith('.csv') ? validationResults.validRows : "N/A"}
                                    </div>
                                    <div className={styles.statLabel}>Valid Rows</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber} style={{ color: 'var(--danger)' }}>
                                        {file && file.name.endsWith('.csv') ? validationResults.invalidRows : "N/A"}
                                    </div>
                                    <div className={styles.statLabel}>Invalid Rows</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statNumber} style={{ color: 'var(--text-primary)' }}>
                                        {file && file.name.endsWith('.csv') ? validationResults.totalRows : "Excel File"}
                                    </div>
                                    <div className={styles.statLabel}>File Type</div>
                                </div>
                            </div>

                            {validationResults.errors.length > 0 && (
                                <div className={styles.errorList}>
                                    <h4>
                                        <MdError /> Validation Errors
                                    </h4>
                                    <div className={styles.errors}>
                                        {validationResults.errors.slice(0, 10).map((error, index) => (
                                            <div key={index} className={styles.errorItem}>
                                                {error.type === 'missing_fields' ? (
                                                    <>
                                                        <FaExclamationTriangle />
                                                        <span>{error.message}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaTimes />
                                                        <span>
                                                            <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {validationResults.errors.length > 10 && (
                                            <div className={styles.errorItem}>
                                                <FaExclamationTriangle />
                                                <span>
                                                    ...and {validationResults.errors.length - 10} more errors
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {validationResults.warnings.length > 0 && (
                                <div className={styles.warningList}>
                                    <h4>
                                        <MdWarning /> Warnings
                                    </h4>
                                    <div className={styles.warnings}>
                                        {validationResults.warnings.map((warning, index) => (
                                            <div key={index} className={styles.warningItem}>
                                                <FaExclamationTriangle />
                                                <span>{warning.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.previewCard}>
                            <h3>
                                <FaUsers /> File Preview
                            </h3>
                            <div className={styles.previewTable}>
                                {file && file.name.endsWith('.csv') ? (
                                    <table>
                                        <thead>
                                            <tr>
                                                {preview.length > 0 && Object.keys(preview[0]).filter(key => key !== 'id').map(key => (
                                                    <th key={key}>{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.map((row, index) => (
                                                <tr key={index}>
                                                    {Object.entries(row).filter(([key]) => key !== 'id').map(([key, value]) => (
                                                        <td key={key}>{value}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className={styles.excelPreview}>
                                        <FaFileExcel size={48} />
                                        <p><strong>{file?.name}</strong></p>
                                        <p>Excel files are processed server-side after upload.</p>
                                        <p className={styles.note}>Note: Full validation and preview will be available after upload.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.stepActions}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={resetForm}
                                disabled={loading}
                            >
                                <FaTimes /> Cancel
                            </button>
                            <div className={styles.actionGroup}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <AsyncButton
                                    className={styles.primaryBtn}
                                    onClick={handleUpload}
                                    loading={loading}
                                    disabled={loading}
                                >
                                    <FaUpload /> Upload File
                                </AsyncButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && uploadResults && (
                    <div className={styles.resultsStep}>
                        <div className={styles.resultsCard}>
                            <h3>
                                <MdCheckCircle /> Upload Complete
                            </h3>

                            <div className={styles.resultsGrid}>
                                <div className={`${styles.resultItem} ${styles.success}`}>
                                    <div className={styles.resultIcon}>
                                        <FaCheck />
                                    </div>
                                    <div className={styles.resultNumber}>
                                        {uploadResults.created || 0}
                                    </div>
                                    <div className={styles.resultLabel}>
                                        Students Added
                                    </div>
                                </div>

                                <div className={`${styles.resultItem} ${styles.warning}`}>
                                    <div className={styles.resultIcon}>
                                        <FaExclamationTriangle />
                                    </div>
                                    <div className={styles.resultNumber}>
                                        {uploadResults.skipped || 0}
                                    </div>
                                    <div className={styles.resultLabel}>
                                        Students Skipped
                                    </div>
                                </div>

                                <div className={`${styles.resultItem} ${styles.danger}`}>
                                    <div className={styles.resultIcon}>
                                        <FaTimes />
                                    </div>
                                    <div className={styles.resultNumber}>
                                        {uploadResults.errors?.length || 0}
                                    </div>
                                    <div className={styles.resultLabel}>
                                        Errors Found
                                    </div>
                                </div>
                            </div>

                            {uploadResults.errors && uploadResults.errors.length > 0 && (
                                <div className={styles.errorList}>
                                    <h4>
                                        <MdError /> Upload Errors
                                    </h4>
                                    <div className={styles.errors}>
                                        {uploadResults.errors.slice(0, 10).map((error, index) => (
                                            <div key={index} className={styles.errorItem}>
                                                <FaTimes />
                                                <span>
                                                    <strong>Row {error.row}:</strong> {error.error}
                                                </span>
                                            </div>
                                        ))}
                                        {uploadResults.errors.length > 10 && (
                                            <div className={styles.errorItem}>
                                                <FaExclamationTriangle />
                                                <span>
                                                    ...and {uploadResults.errors.length - 10} more errors
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.stepActions}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={resetForm}
                            >
                                Upload Another File
                            </button>
                            <div className={styles.actionGroup}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => navigate("/admin/students")}
                                >
                                    Back to Students List
                                </button>
                                <button
                                    type="button"
                                    className={styles.primaryBtn}
                                    onClick={() => {
                                        resetForm();
                                        navigate("/admin/students");
                                    }}
                                >
                                    View All Students
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SideBar>
        </div>
    );
}