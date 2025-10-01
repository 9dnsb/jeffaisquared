'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NavLink } from '../../types/nav'
import LogoLink from './LogoLink'
import DesktopNav from './DesktopNav'
import HamburgerToggle from './HamburgerToggle'
import MobileNav from './MobileNav'
import { useSession } from '../../hooks/useSession'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, setUser } = useSession()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setUser(null)
        router.push('/')
      }
    } catch {
      router.push('/')
    }
  }

  const navLinks: NavLink[] = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        {
          label: 'Sign Out',
          onClick: handleLogout,
        },
      ]
    : [
        { href: '/auth/login', label: 'Sign In' },
        { href: '/auth/register', label: 'Sign Up' },
      ]

  if (loading) {
    return (
      <header className="bg-primary text-white sticky top-0 z-50 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <LogoLink />
          <div className="animate-pulse bg-primary/80 h-6 w-20 rounded"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-primary text-white sticky top-0 z-50 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <LogoLink />
        <DesktopNav pathname={pathname} navLinks={navLinks} />
        <HamburgerToggle isOpen={isOpen} setIsOpen={setIsOpen} />
      </div>
      <MobileNav
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        pathname={pathname}
        navLinks={navLinks}
      />
    </header>
  )
}