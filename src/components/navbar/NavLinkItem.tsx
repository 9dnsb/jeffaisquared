import { NavLink } from '../../types/nav'
import Link from 'next/link'

interface NavLinkItemProps {
  link: NavLink
  pathname: string
  className?: string
  onLinkClick?: () => void
  variant?: 'default' | 'button' | 'outline'
}

export default function NavLinkItem({
  link,
  pathname,
  className = '',
  onLinkClick,
  variant = 'default'
}: NavLinkItemProps) {
  const getVariantClasses = () => {
    const isActive = pathname === link.href

    switch (variant) {
      case 'button':
        return `px-4 py-2 rounded-md font-heading font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary/80 text-white shadow-sm'
            : 'text-white/80 hover:bg-primary/80 hover:text-white'
        }`
      case 'outline':
        return `px-4 py-2 border border-white/20 rounded-md font-heading font-medium transition-all duration-200 ${
          isActive
            ? 'bg-white text-primary border-white'
            : 'text-white hover:bg-white hover:text-primary hover:border-white'
        }`
      default:
        return `px-3 py-2 rounded-md font-heading font-medium transition-all duration-200 ${
          isActive
            ? 'text-white bg-primary/80'
            : 'text-white/80 hover:text-white hover:bg-primary/80'
        }`
    }
  }

  const baseClassName = getVariantClasses()
  const finalClassName = className ? `${baseClassName} ${className}` : baseClassName

  if (link.onClick) {
    return (
      <button
        onClick={() => {
          onLinkClick?.()
          link.onClick()
        }}
        className={finalClassName}
      >
        {link.label}
      </button>
    )
  }

  return (
    <Link
      href={link.href}
      target={link.target}
      onClick={onLinkClick}
      className={finalClassName}
    >
      {link.label}
    </Link>
  )
}