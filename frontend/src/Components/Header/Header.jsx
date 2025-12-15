import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import styles from "./Header.module.css";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { Link } from "react-router-dom";


const Header = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const toggleMobileMenu = () => setMobileOpen(prev => !prev);


    return (
        <header className={styles.HeaderContainer}>
            <div className={styles.HeaderContent}>
                <div className={styles.Logo}>DRT <span className={styles.Version}>v1.0</span></div>

                <nav className={`${styles.Nav} ${mobileOpen ? styles.NavOpen : ""}`}>
                    <a href="#" className={styles.NavLink}>Docs</a>
                    <Link to="/verify-email">Verify Email</Link>
                    <ThemeToggle />
                </nav>

                <div className={styles.RightControls}>


                    <Link to="/login" className={styles.LoginBtn}>
                        <LogIn size={16} style={{ marginRight: '0.25rem' }} />
                        Login
                    </Link>

                    <Link to="/register" className={styles.RegisterBtn}>
                        Register
                    </Link>

                    <button className={styles.MobileMenuBtn} onClick={toggleMobileMenu}>
                        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
