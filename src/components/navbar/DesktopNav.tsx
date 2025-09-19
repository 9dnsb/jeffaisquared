import { NavLink } from '../../types/nav'
import NavLinkItem from './NavLinkItem'

interface DesktopNavProps {
  pathname: string
  navLinks: NavLink[]
}

export default function DesktopNav({ pathname, navLinks }: DesktopNavProps) {
  return (
    <nav className="hidden md:flex items-center gap-2">
      {navLinks.map((link) => {
        // Use outline variant for all navbar buttons for consistent professional look
        const variant = 'outline'

        return (
          <NavLinkItem
            key={link.href || link.label}
            link={link}
            pathname={pathname}
            variant={variant}
          />
        )
      })}
    </nav>
  )
}