import { FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, ChevronLeftIcon, EyeCloseIcon, EyeIcon } from '../../icons'
import Label from '../form/Label'
import InputField from '../form/input/InputField'
import Checkbox from '../form/input/Checkbox'
import Button from '../ui/button/Button'

type SignInFormProps = {
  onSignIn: (email: string, password: string) => Promise<void>
  isSubmitting: boolean
}

export default function SignInForm({ onSignIn, isSubmitting }: SignInFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isChecked, setIsChecked] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    await onSignIn(email.trim(), password)
  }

  return (
    <div className="flex flex-1 flex-col bg-white px-4 py-10 dark:bg-gray-950 sm:px-8 lg:w-1/2 lg:py-0">
      <div className="mx-auto w-full max-w-md pt-2 sm:pt-6 lg:pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white/90"
        >
          <ChevronLeftIcon className="size-5 shrink-0" />
          Về trang chủ
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-12">
        <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-theme-md dark:border-gray-800 dark:bg-gray-900/60 dark:shadow-none sm:p-8">
          <div className="mb-8">
            <h1 className="mb-2 text-balance font-semibold tracking-tight text-gray-900 text-title-sm dark:text-white sm:text-title-md">
              Đăng nhập
            </h1>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Nhập email và mật khẩu được cấp để vào bảng điều khiển.
            </p>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-theme-xs transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:border-gray-600 dark:hover:bg-white/[0.04]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                    fill="#EB4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-theme-xs transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:border-gray-600 dark:hover:bg-white/[0.04]"
              >
                <svg
                  width="21"
                  className="fill-current"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
                </svg>
                X
              </button>
            </div>
            <div className="relative py-4 sm:py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider text-gray-400">
                <span className="bg-white px-3 py-1 dark:bg-gray-900">Hoặc email</span>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="signin-email">
                    Email <span className="text-error-500">*</span>{' '}
                  </Label>
                  <InputField
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="info@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">
                    Password <span className="text-error-500">*</span>{' '}
                  </Label>
                  <div className="relative">
                    <InputField
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      role="presentation"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="text-theme-sm font-normal text-gray-700 dark:text-gray-400">
                      Duy trì đăng nhập
                    </span>
                  </div>
                  <Link
                    to="/reset-password"
                    className="text-sm font-medium text-brand-600 transition-colors duration-200 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    size="md"
                    disabled={isSubmitting}
                    endIcon={
                      isSubmitting ? undefined : (
                        <ArrowRightIcon className="size-[18px] shrink-0 opacity-95" aria-hidden />
                      )
                    }
                  >
                    {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 sm:text-start">
                Chưa có tài khoản?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-brand-600 transition-colors duration-200 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Đăng ký
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
