import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Clinical Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Clinical Mode`}
    >
      {isDark ? (
        <Sun size={16} className="theme-toggle-icon" aria-hidden="true" />
      ) : (
        <Moon size={16} className="theme-toggle-icon" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Light Console' : 'Dark Console'}</span>}
    </button>
  );
}
