import { useState, useEffect, useRef } from "react";
import styles from "./SideBar.module.css";
import { MdInbox, MdMail, MdMenu, MdChevronLeft } from "react-icons/md";

export default function SideBar({ children }) {
    const [open, setOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const initialRender = useRef(true);

    const menuItems = [
        { icon: <MdInbox />, text: "Inbox" },
        { icon: <MdMail />, text: "Mail" },
    ];

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);

            // Only auto-close mobile drawer when resizing to desktop
            if (!mobile && mobileOpen) {
                setMobileOpen(false);
            }

            // Don't auto-expand sidebar on resize - let user control it
            // Remove this part that was causing the issue
        };

        // Don't set initial state on first render to avoid conflict with localStorage
        if (!initialRender.current) {
            handleResize();
        } else {
            initialRender.current = false;
        }

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [mobileOpen]); // Removed 'open' from dependencies

    const toggle = () => {
        setOpen(!open);
    };

    const toggleMobile = () => setMobileOpen(!mobileOpen);
    const closeMobileDrawer = () => setMobileOpen(false);

    return (
        <>
            {/* Mobile menu button - only on mobile */}
            {isMobile && (
                <button className={styles.mobileBtn} onClick={toggleMobile}>
                    <MdMenu size={28} />
                </button>
            )}

            {/* Desktop layout - only on desktop */}
            {!isMobile && (
                <div className={styles.desktopContainer}>
                    {/* Sidebar */}
                    <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
                        <button
                            className={styles.toggleBtn}
                            onClick={toggle}
                            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {open ? <MdChevronLeft size={24} /> : <MdMenu size={24} />}
                        </button>
                        <div className={styles.menuItems}>
                            {menuItems.map((item, i) => (
                                <div key={i} className={styles.item}>
                                    {item.icon}
                                    <span className={`${styles.text} ${open ? styles.showText : ""}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Content area */}
                    <main className={styles.content}>
                        {children}
                    </main>
                </div>
            )}

            {/* Mobile content - only on mobile */}
            {isMobile && (
                <main className={styles.mobileContent}>
                    {children}
                </main>
            )}

            {/* Mobile drawer with overlay */}
            {isMobile && (
                <>
                    {mobileOpen && (
                        <div
                            className={styles.overlay}
                            onClick={closeMobileDrawer}
                        />
                    )}

                    <div
                        className={`${styles.mobileDrawer} ${mobileOpen ? styles.open : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.drawerHeader}>
                            <button className={styles.closeBtn} onClick={closeMobileDrawer}>
                                <MdChevronLeft size={24} />
                            </button>
                        </div>
                        <div className={styles.mobileMenuItems}>
                            {menuItems.map((item, i) => (
                                <div key={i} className={styles.mobileItem}>
                                    {item.icon}
                                    <span className={styles.mobileText}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}