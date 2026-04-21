import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from './ThemeContext'

export default function ThemeToggleBtn() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title={isDark ? 'Aydınlık Temaya Geç' : 'Karanlık Temaya Geç'}
      whileHover={{ scale: 1.1, rotate: 20 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Tema değiştir"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ display: 'block', lineHeight: 1 }}
        >
          {isDark ? '☀️' : '🌙'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
