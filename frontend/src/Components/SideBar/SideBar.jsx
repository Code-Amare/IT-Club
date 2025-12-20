import { useState, useEffect, useRef } from "react";
import styles from "./SideBar.module.css";
import {
    MdInbox,
    MdMail,
    MdMenu,
    MdChevronLeft,
    MdNotifications,
    MdAccountCircle,
    MdSettings,
    MdExitToApp,
    MdEdit,
    MdArrowDropDown,
    MdClose
} from "react-icons/md";
import { useUser } from "../../Context/UserContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { useNavigate } from "react-router-dom";

export default function SideBar({ children }) {
    const [open, setOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const initialRender = useRef(true);
    const { user, logout } = useUser();
    const navigate = useNavigate();

    const menuItems = [
        { icon: <MdAccountCircle />, text: "Inbox", to: "/profile" },
        { icon: <MdMail />, text: "Mail" },
    ];

    const profileMenuItems = [
        { icon: <MdEdit />, text: "Edit Account" },
        { icon: <MdSettings />, text: "Settings" },
        { icon: <MdExitToApp />, text: "Logout" },
    ];

    const notifications = [
        { id: 1, text: "New message received", time: "5 min ago" },
        { id: 2, text: "System update scheduled", time: "1 hour ago" },
    ];

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);

            if (!mobile && mobileOpen) {
                setMobileOpen(false);
            }
        };

        if (initialRender.current) {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (!mobile) {
                setOpen(false);
            }
            initialRender.current = false;
        }

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [mobileOpen]);

    const toggle = () => setOpen(!open);
    const toggleMobile = () => setMobileOpen(!mobileOpen);
    const closeMobileDrawer = () => setMobileOpen(false);

    const toggleProfileMenu = () => setProfileMenuOpen(!profileMenuOpen);
    const closeProfileMenu = () => setProfileMenuOpen(false);

    const toggleNotification = () => setNotificationOpen(!notificationOpen);
    const closeNotification = () => setNotificationOpen(false);

    // Handle mobile dropdowns with overlay
    const handleMobileProfileClick = () => {
        setProfileMenuOpen(!profileMenuOpen);
        setNotificationOpen(false);
    };

    const handleMobileNotificationClick = () => {
        setNotificationOpen(!notificationOpen);
        setProfileMenuOpen(false);
    };

    // Close all mobile dropdowns
    const closeAllMobileDropdowns = () => {
        setProfileMenuOpen(false);
        setNotificationOpen(false);
    };

    return (
        <>
            {/* Mobile menu button */}
            {isMobile && (
                <button className={styles.mobileBtn} onClick={toggleMobile}>
                    <MdMenu size={28} />
                </button>
            )}

            {/* Desktop layout */}
            {!isMobile && (
                <div className={styles.desktopContainer}>
                    {/* Sidebar */}
                    <aside className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}>
                        <div className={styles.sidebarHeader}>
                            <button
                                className={styles.toggleBtn}
                                onClick={toggle}
                                aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                            >
                                {open ? <MdChevronLeft size={24} /> : <MdMenu size={24} />}
                            </button>
                        </div>

                        <div className={styles.menuItems}>
                            {menuItems.map((item, i) => (
                                <div key={i} className={styles.item} onClick={navigate(item.to)}>
                                    {item.icon}
                                    <span className={`${styles.text} ${open ? styles.showText : ""}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                            <div className={`${styles.themeToggle} ${styles.desktopThemeToggle}`}>
                                <ThemeToggle />
                                <span className={`${styles.text} ${open ? styles.showText : ""}`}>Theme</span>
                            </div>
                        </div>
                    </aside>

                    {/* Main content with header */}
                    <div className={`${styles.mainContent} ${open ? styles.sidebarOpen : styles.sidebarClosed}`}>
                        {/* Top Header */}
                        <header className={styles.header}>
                            <div className={styles.headerLeft}>
                                <h1 className={styles.pageTitle}>Dashboard</h1>
                            </div>

                            <div className={styles.headerRight}>
                                {/* Notification Icon with Dropdown */}
                                <div className={styles.notificationContainer}>
                                    <button
                                        className={styles.notificationBtn}
                                        onClick={toggleNotification}
                                        aria-label="Notifications"
                                    >
                                        <MdNotifications size={24} />
                                        <span className={styles.notificationBadge}>3</span>
                                    </button>

                                    {notificationOpen && (
                                        <div className={styles.notificationDropdown}>
                                            <div className={styles.notificationHeader}>
                                                <h3>Notifications</h3>
                                                <span className={styles.clearAll}>Clear All</span>
                                            </div>
                                            <div className={styles.notificationList}>
                                                {notifications.map(notification => (
                                                    <div key={notification.id} className={styles.notificationItem}>
                                                        <div className={styles.notificationText}>{notification.text}</div>
                                                        <div className={styles.notificationTime}>{notification.time}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Profile with Dropdown */}
                                <div className={styles.profileContainer}>
                                    <button
                                        className={styles.profileBtn}
                                        onClick={toggleProfileMenu}
                                        aria-label="Profile menu"
                                    >
                                        <div className={styles.profileImage}>
                                            <img src={user.profilePicURL} className={styles.profilePic} alt={`${user.fullName} proilfe image.`} />

                                        </div>
                                        <div className={styles.profileInfo}>
                                            <span className={styles.profileName}>{user.fullName}</span>
                                            <span className={styles.profileRole}>{user.role}</span>
                                        </div>
                                        <MdArrowDropDown size={24} className={`${styles.dropdownArrow} ${profileMenuOpen ? styles.rotated : ''}`} />
                                    </button>

                                    {profileMenuOpen && (
                                        <div className={styles.profileDropdown}>
                                            {profileMenuItems.map((item, index) => (
                                                <button key={index} className={styles.profileMenuItem}>
                                                    {item.icon}
                                                    <span>{item.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* Content Area */}
                        <main className={styles.content}>
                            {children}
                        </main>
                    </div>
                </div>
            )}

            {/* Mobile layout */}
            {isMobile && (
                <div className={styles.mobileContainer}>
                    {/* Mobile Header */}
                    <header className={styles.mobileHeader}>
                        <div className={styles.mobileHeaderLeft}>
                            {/* Empty left side on mobile */}
                        </div>

                        <div className={styles.mobileHeaderRight}>
                            {/* Mobile Notification Icon */}
                            <div className={styles.mobileNotificationContainer}>
                                <button
                                    className={styles.notificationBtn}
                                    onClick={handleMobileNotificationClick}
                                    aria-label="Notifications"
                                >
                                    <MdNotifications size={24} />
                                    <span className={styles.notificationBadge}>3</span>
                                </button>

                                {notificationOpen && (
                                    <div className={styles.mobileNotificationDropdown}>
                                        <div className={styles.mobileDropdownHeader}>
                                            <h3>Notifications</h3>
                                            <button
                                                className={styles.mobileCloseBtn}
                                                onClick={closeAllMobileDropdowns}
                                            >
                                                <MdClose size={20} />
                                            </button>
                                        </div>
                                        <div className={styles.mobileNotificationList}>
                                            {notifications.map(notification => (
                                                <div key={notification.id} className={styles.mobileNotificationItem}>
                                                    <div className={styles.notificationText}>{notification.text}</div>
                                                    <div className={styles.notificationTime}>{notification.time}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Profile Icon */}
                            <div className={styles.mobileProfileContainer}>
                                <button
                                    className={styles.profileBtn}
                                    onClick={handleMobileProfileClick}
                                    aria-label="Profile menu"
                                >
                                    <img src={user.profilePicURL} className={styles.profilePic} alt={`${user.fullName} proilfe image.`} />
                                    <span className={styles.mobileProfileName}>{user.fullName}</span>
                                </button>

                                {profileMenuOpen && (
                                    <div className={styles.mobileProfileDropdown}>
                                        <div className={styles.mobileProfileHeader}>
                                            <img src={user.profilePicURL} className={styles.profilePic} alt={`${user.fullName} proilfe image.`} />
                                            <div className={styles.mobileProfileInfo}>

                                                <span className={styles.profileName}>{user.fullName}</span>
                                                <span className={styles.profileEmail}>{user.email}</span>
                                            </div>
                                            <button
                                                className={styles.mobileCloseBtn}
                                                onClick={closeAllMobileDropdowns}
                                            >
                                                <MdClose size={20} />
                                            </button>
                                        </div>
                                        <div className={styles.mobileProfileMenuItems}>

                                            {profileMenuItems.map((item, index) => (

                                                <button key={index} className={styles.mobileProfileMenuItem} onClick={() => navigate(item.to)}>
                                                    {item.icon}
                                                    <span>{item.text}</span>
                                                </button>
                                            ))}

                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Mobile Content */}
                    <main className={styles.mobileContent}>
                        {children}
                    </main>

                    {/* Overlay for mobile dropdowns */}
                    {(profileMenuOpen || notificationOpen) && (
                        <div className={styles.mobileDropdownOverlay} onClick={closeAllMobileDropdowns} />
                    )}

                    {/* Mobile drawer */}
                    <div className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ''}`}>
                        <div className={styles.drawerHeader}>
                            <div className={styles.drawerProfile}>
                                <img src={user.profilePicURL} className={styles.profilePic} alt={`${user.fullName} proilfe image.`} />

                                <div className={styles.drawerProfileInfo}>
                                    <span className={styles.profileName}>{user.fullName}</span>
                                    <span title={user.email} className={styles.profileEmail}>{user.email}</span>
                                </div>
                            </div>
                            <button className={styles.closeBtn} onClick={closeMobileDrawer}>
                                <MdChevronLeft size={24} />
                            </button>
                        </div>
                        <div className={styles.mobileMenuItems}>
                            {menuItems.map((item, i) => (
                                <div key={i} className={styles.mobileItem} onClick={() => navigate(item.to)}>
                                    {item.icon}
                                    <span className={styles.mobileText}>{item.text}</span>
                                </div>
                            ))}
                            <div className={styles.themeToggle}>
                                <ThemeToggle />
                                <span>Theme</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile drawer overlay */}
                    {mobileOpen && (
                        <div
                            className={styles.mobileDrawerOverlay}
                            onClick={closeMobileDrawer}
                        />
                    )}
                </div>
            )}
        </>
    );
}