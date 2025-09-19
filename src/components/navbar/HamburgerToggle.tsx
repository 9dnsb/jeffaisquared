'use client'

interface HamburgerToggleProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function HamburgerToggle({
  isOpen,
  setIsOpen,
}: HamburgerToggleProps) {
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="md:hidden focus:outline-none p-2"
      aria-label="Toggle Menu"
    >
      <div className="w-6 h-6 flex flex-col justify-center items-center">
        <span
          className={`block h-0.5 w-6 bg-white transition-transform duration-300 ${
            isOpen ? 'rotate-45 translate-y-1' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-6 bg-white mt-1 transition-opacity duration-300 ${
            isOpen ? 'opacity-0' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-6 bg-white mt-1 transition-transform duration-300 ${
            isOpen ? '-rotate-45 -translate-y-1' : ''
          }`}
        />
      </div>
    </button>
  )
}