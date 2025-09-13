import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar-container">
      <div className="navbar-background">
        <div className="navbar-pattern"></div>
        <div className="navbar-glow"></div>
      </div>
      <div className="navbar-content">
        <div className="navbar-inner">
          {/* Logo + Brand */}
          <Link
            to="/"
            onClick={closeMenu}
            className="navbar-brand"
          >
            <img 
              src="/assets/BGR_PlateShare.png" 
              alt="PlateShare Logo" 
              className="logo"
            />
            <span className="navbar-brand-text">PlateShare</span>
          </Link>

          {/* Desktop Links */}
          <div className="navbar-links">
            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="nav-link"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenu}
                  className="nav-link nav-link-signup"
                >
                  Signup
                </Link>
              </>
            ) : (
              <>
                {user.role && (
                  <Link
                    to={`/${user.role.toLowerCase()}`}
                    onClick={closeMenu}
                    className="nav-link"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="nav-link nav-link-logout"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="mobile-menu-button"
          >
            {!isMenuOpen ? (
              <svg
                className="hamburger-icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <svg
                className="hamburger-icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Links */}
      {isMenuOpen && (
        <div className="mobile-menu">
          {!user ? (
            <>
              <Link
                to="/login"
                onClick={closeMenu}
                className="mobile-menu-link"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={closeMenu}
                className="mobile-menu-link mobile-menu-link-signup"
              >
                Signup
              </Link>
            </>
          ) : (
            <>
              {user.role && (
                <Link
                  to={`/${user.role.toLowerCase()}`}
                  onClick={closeMenu}
                  className="mobile-menu-link"
                >
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="mobile-menu-link mobile-menu-link-logout"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
