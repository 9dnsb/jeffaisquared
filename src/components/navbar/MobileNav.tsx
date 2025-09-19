'use client'

import { NavLink } from '../../types/nav'
import NavLinkItem from './NavLinkItem'

interface MobileNavProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  pathname: string
  navLinks: NavLink[]
}

export default function MobileNav({
  isOpen,
  setIsOpen,
  pathname,
  navLinks,
}: MobileNavProps) {
  return (
    <div
      className={`md:hidden overflow-hidden transition-all duration-300 bg-primary/90 border-t border-primary/60 px-4 ${
        isOpen ? 'max-h-96 py-4' : 'max-h-0 py-0'
      }`}
    >
      <ul className="flex flex-col gap-2">
        {navLinks.map((link) => {
          // Use outline variant for all mobile navbar buttons for consistency
          const variant = 'outline'

          return (
            <li key={link.href || link.label}>
              <NavLinkItem
                link={link}
                pathname={pathname}
                className="block w-full text-left"
                onLinkClick={() => setIsOpen(false)}
                variant={variant}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}