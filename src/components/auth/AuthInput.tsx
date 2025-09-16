interface AuthInputProps {
  id: string
  name: string
  type: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  className?: string
}

export function AuthInput({
  id,
  name,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  required = false,
  minLength,
  className = "appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
}: AuthInputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      autoComplete={autoComplete}
      required={required}
      minLength={minLength}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )
}