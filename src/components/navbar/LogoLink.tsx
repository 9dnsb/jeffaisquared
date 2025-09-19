import Link from 'next/link'
import Image from 'next/image'

export default function LogoLink() {
  return (
    <Link href="/" className="flex items-center h-12 py-2">
      <div className="relative h-8 w-auto">
        <Image
          src="/logo_white_260w.svg"
          alt="Sales Analytics Platform"
          width={130}
          height={32}
          priority
          className="object-contain"
        />
      </div>
    </Link>
  )
}