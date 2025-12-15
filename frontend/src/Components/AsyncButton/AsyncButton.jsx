import { useState } from "react";
import styles from "./AsyncButton.module.css";

export default function AsyncButton({
    onClick,
    children,
    className = "",
    disabled = false,
    type = "button",
    ...props
}) {
    const [loading, setLoading] = useState(false);

    const handleClick = async (e) => {
        if (e && type === "submit") e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            // allow onClick to accept the event if it wants
            await onClick?.(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type={type}
            className={`${styles.customBtn} ${className}`}
            onClick={handleClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? <span className={styles.loader} aria-hidden="true" /> : children}
        </button>
    );
}
