import { Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      className={[
        'relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full border border-border px-1',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark ? 'bg-card' : 'bg-muted',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm',
          'transition-transform duration-200 ease-out',
          isDark ? 'translate-x-7' : 'translate-x-0',
        ].join(' ')}
      >
        {isDark ? <Moon size={15} weight="fill" aria-hidden="true" /> : <Sun size={15} weight="fill" aria-hidden="true" />}
      </span>
    </button>
  )
}
