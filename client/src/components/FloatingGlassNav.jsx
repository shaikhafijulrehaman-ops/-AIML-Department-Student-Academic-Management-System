import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Users,
  GraduationCap,
  BarChart3,
  User,
  LogOut,
  Bell,
  Award,
  BookOpen,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import SpotlightNavItem from './SpotlightNavItem';
import CollegeLogo from './CollegeLogo';
import ProfileAvatar from './ProfileAvatar';
import BRANDING from '../config/branding';

/**
 * FloatingGlassNav Component
 * Responsive floating pill-shaped capsule navigation with mouse spotlight illumination,
 * theme active glow, profile section, and institutional branding.
 */
export const FloatingGlassNav = ({
  activeTab = 'home',
  onTabChange,
  onLogout,
  userProfile,
  className = '',
}) => {
  const { isHod, isStudent } = useTheme();
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: -200, y: -200 });
  const [isHovered, setIsHovered] = useState(false);
  const navContainerRef = useRef(null);

  // Sync state if activeTab changes externally
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // HOD Navigation Items
  const hodNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'records', label: 'Academic Records', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // Student Navigation Items
  const studentNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'academics', label: 'Academics', icon: BookOpen },
    { id: 'performance', label: 'Performance', icon: Award },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: 3 },
  ];

  const items = isHod ? hodNavItems : studentNavItems;

  const defaultUser = isHod
    ? { name: 'Dr. Thatibalamuralikrishna', role: 'Head of Department' }
    : { name: 'Sai Krishna MIC', role: 'AIML Student (3rd Year)' };

  const profile = userProfile || defaultUser;

  // Mouse-following soft spotlight
  const handleMouseMove = (e) => {
    if (!navContainerRef.current) return;
    const rect = navContainerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: -200, y: -200 });
  };

  const handleItemClick = (id) => {
    setCurrentTab(id);
    onTabChange?.(id);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setMobileMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      alert(`[Demo] Logging out of ${isHod ? 'HOD Admin' : 'Student Portal'} session.`);
    }
  };

  // Capsule theme classes
  const capsuleBackground = isHod
    ? 'bg-hod-claret/95 border-white/20 shadow-glass-nav text-white'
    : 'bg-student-teal/95 border-white/30 shadow-glass-nav text-white';

  const spotlightGlowColor = isHod
    ? 'rgba(255, 107, 26, 0.28)' // Tangerine
    : 'rgba(232, 33, 58, 0.28)'; // Cherry Soda

  return (
    <header className={`sticky top-3 sm:top-5 z-40 w-full px-3 sm:px-6 transition-all ${className}`}>
      <div
        ref={navContainerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          relative
          max-w-6xl mx-auto
          px-3 sm:px-5 py-2.5
          rounded-full
          glass-surface
          ${capsuleBackground}
          flex items-center justify-between
          gap-2 sm:gap-4
          transition-all duration-300
        `}
      >
        {/* Dynamic Mouse Spotlight Illumination */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300 overflow-hidden -z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(180px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightGlowColor}, transparent 80%)`,
          }}
          aria-hidden="true"
        />

        {/* Institutional Brand Pill */}
        <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
          <CollegeLogo
            size="sm"
            variant="on-dark"
            badge
          />
          <div className="hidden sm:flex flex-col min-w-0 leading-tight">
            <span className="text-xs font-bold text-white tracking-tight truncate max-w-[170px] lg:max-w-[240px]">
              {BRANDING.departmentAbbr} Portal
            </span>
            <span className="text-[10px] text-white/70 truncate max-w-[170px] lg:max-w-[240px]">
              DVR &amp; Dr. HS MIC
            </span>
          </div>
        </div>

        {/* Desktop / Tablet Nav Links (Pill Carousel) */}
        <nav
          className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5"
          aria-label="Main Navigation"
        >
          {items.map((item) => (
            <SpotlightNavItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              isActive={currentTab === item.id}
              onClick={handleItemClick}
            />
          ))}
        </nav>

        {/* Right Section: Profile & Logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden lg:flex items-center pl-2 border-l border-white/20">
            <ProfileAvatar
              name={profile.name}
              role={profile.role}
              size="sm"
              showStatus
            />
          </div>

          {/* Desktop Logout Button */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className={`
              hidden md:inline-flex items-center gap-1.5
              px-3 py-1.5
              min-h-[38px]
              rounded-full
              text-xs font-semibold
              transition-all duration-200
              hover:bg-white/15 active:scale-95
              border border-white/20
              focus-visible:outline-none focus-visible:ring-2
              ${isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'}
            `}
            title="Sign out of portal"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xl:inline">Logout</span>
          </button>

          {/* Mobile Hamburger Toggle (360px–768px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`
              md:hidden
              inline-flex items-center justify-center
              w-10 h-10
              rounded-full
              bg-white/15 hover:bg-white/25
              text-white
              focus-visible:outline-none focus-visible:ring-2
              ${isHod ? 'focus-visible:ring-hod-tangerine' : 'focus-visible:ring-student-cherry'}
              transition-colors
            `}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Capsule for screens < 768px */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`
              p-4 rounded-3xl glass-surface
              ${capsuleBackground}
              space-y-3
              border border-white/25 shadow-2xl
            `}
          >
            {/* Mobile Profile Lockup */}
            <div className="flex items-center justify-between pb-3 border-b border-white/20">
              <ProfileAvatar
                name={profile.name}
                role={profile.role}
                size="md"
                showStatus
              />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                {isHod ? 'HOD Admin' : 'Student'}
              </span>
            </div>

            {/* Mobile Links */}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full flex items-center justify-between
                      px-4 py-3
                      min-h-[44px]
                      rounded-2xl
                      text-sm font-semibold
                      transition-all
                      ${
                        isActive
                          ? isHod
                            ? 'bg-hod-claret text-white shadow-glow-tangerine ring-1 ring-hod-tangerine/60'
                            : 'bg-student-teal-dark text-white shadow-glow-cherry ring-1 ring-student-cherry/60'
                          : 'text-white/85 hover:bg-white/15'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <NotificationBadge count={item.badge} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Logout Button */}
            <div className="pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 min-h-[44px] rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default FloatingGlassNav;
