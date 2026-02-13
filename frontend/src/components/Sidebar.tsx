'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/editor', icon: '💻', label: 'Editor' },
  { path: '/analytics', icon: '📈', label: 'Analytics' },
  { path: '/materials', icon: '📚', label: 'Materials' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Brand */}
      <div className={styles.brand} onClick={() => router.push('/dashboard')}>
        <div className={styles.logoIcon}>
          <span>⚡</span>
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>Vox<span className={styles.accent}>Coder</span></span>
            <span className={styles.logoSub}>Voice to Code</span>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button 
        className={styles.toggle} 
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '→' : '←'}
      </button>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => router.push(item.path)}
              title={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {isActive && <div className={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user?.name || 'Guest'}</span>
              <span className={styles.userEmail}>{user?.email || ''}</span>
            </div>
          )}
        </div>
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Logout"
        >
          {collapsed ? '🚪' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
