
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  ChevronDown,
  BarChart
} from "lucide-react";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Demo purposes: Check for a user role in local storage
    const storedRole = localStorage.getItem("userRole");
    if (storedRole) {
      setIsAuthenticated(true);
      setUserRole(storedRole);
    }

    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    // Demo purposes: Remove user role from local storage
    localStorage.removeItem("userRole");
    setIsAuthenticated(false);
    setUserRole(null);
    // Redirect to login page
    window.location.href = "/login";
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <BarChart className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold tracking-tight">
                SalesHire
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1">
              <Link
                to="/"
                className={cn(
                  "nav-item",
                  isActive("/") && "nav-item-active"
                )}
              >
                Home
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to={`/dashboard/${userRole}`}
                    className={cn(
                      "nav-item",
                      isActive(`/dashboard/${userRole}`) && "nav-item-active"
                    )}
                  >
                    Dashboard
                  </Link>

                  {userRole === "candidate" && (
                    <Link
                      to="/application"
                      className={cn(
                        "nav-item",
                        isActive("/application") && "nav-item-active"
                      )}
                    >
                      My Application
                    </Link>
                  )}

                  {userRole === "manager" && (
                    <>
                      <Link
                        to="/candidates"
                        className={cn(
                          "nav-item",
                          isActive("/candidates") && "nav-item-active"
                        )}
                      >
                        Candidates
                      </Link>
                      <Link
                        to="/assessments"
                        className={cn(
                          "nav-item",
                          isActive("/assessments") && "nav-item-active"
                        )}
                      >
                        Assessments
                      </Link>
                    </>
                  )}

                  {userRole === "admin" && (
                    <Link
                      to="/users"
                      className={cn(
                        "nav-item",
                        isActive("/users") && "nav-item-active"
                      )}
                    >
                      User Management
                    </Link>
                  )}

                  <div className="relative group">
                    <button className="nav-item flex items-center space-x-1">
                      <span>Account</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-2">
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/about"
                    className={cn(
                      "nav-item",
                      isActive("/about") && "nav-item-active"
                    )}
                  >
                    About
                  </Link>
                  <Link
                    to="/login"
                    className={cn(
                      "nav-item",
                      isActive("/login") && "nav-item-active"
                    )}
                  >
                    Login
                  </Link>
                  <Button asChild className="ml-2">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "h-auto opacity-100 visible"
            : "h-0 opacity-0 invisible overflow-hidden"
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
          <Link
            to="/"
            className={cn(
              "block px-3 py-2 rounded-md text-base font-medium",
              isActive("/") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            )}
            onClick={closeMenu}
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={`/dashboard/${userRole}`}
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive(`/dashboard/${userRole}`) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={closeMenu}
              >
                Dashboard
              </Link>

              {userRole === "candidate" && (
                <Link
                  to="/application"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive("/application") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={closeMenu}
                >
                  My Application
                </Link>
              )}

              {userRole === "manager" && (
                <>
                  <Link
                    to="/candidates"
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium",
                      isActive("/candidates") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={closeMenu}
                  >
                    Candidates
                  </Link>
                  <Link
                    to="/assessments"
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium",
                      isActive("/assessments") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={closeMenu}
                  >
                    Assessments
                  </Link>
                </>
              )}

              {userRole === "admin" && (
                <Link
                  to="/users"
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    isActive("/users") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={closeMenu}
                >
                  User Management
                </Link>
              )}

              <Link
                to="/profile"
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive("/profile") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={closeMenu}
              >
                Profile
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/about"
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive("/about") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={closeMenu}
              >
                About
              </Link>
              <Link
                to="/login"
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium",
                  isActive("/login") ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={closeMenu}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium bg-primary text-white hover:bg-primary/90"
                )}
                onClick={closeMenu}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
