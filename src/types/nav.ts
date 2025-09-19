export type NavLink =
  | { label: string; href: string; onClick?: never; target?: string }
  | { label: string; onClick: () => void; href?: never; target?: never }