import { AuthInput } from './AuthInput'

interface AuthEmailPasswordInputsProps {
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  passwordPlaceholder?: string
  autoComplete?: 'current-password' | 'new-password'
  stacked?: boolean
  minLength?: number
}

export function AuthEmailPasswordInputs({
  email,
  setEmail,
  password,
  setPassword,
  passwordPlaceholder = 'Password',
  autoComplete = 'current-password',
  stacked = false,
  minLength,
}: AuthEmailPasswordInputsProps) {
  const emailInputProps = {
    id: "email",
    name: "email",
    type: "email",
    placeholder: "Email address",
    value: email,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    autoComplete: "email",
    required: true,
    ...(stacked && {
      className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
    })
  }

  const passwordInputProps = {
    id: "password",
    name: "password",
    type: "password",
    placeholder: passwordPlaceholder,
    value: password,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    autoComplete: autoComplete,
    required: true,
    ...(minLength !== undefined && { minLength }),
    ...(stacked && {
      className: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
    })
  }

  const emailInput = <AuthInput {...emailInputProps} />
  const passwordInput = <AuthInput {...passwordInputProps} />

  if (stacked) {
    return (
      <div className="rounded-md shadow-sm -space-y-px">
        <div>{emailInput}</div>
        <div>{passwordInput}</div>
      </div>
    )
  }

  return (
    <>
      <div>{emailInput}</div>
      <div>{passwordInput}</div>
    </>
  )
}