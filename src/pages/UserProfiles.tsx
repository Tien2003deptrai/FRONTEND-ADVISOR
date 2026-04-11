import { useLocation } from 'react-router'
import PageBreadcrumb from '../components/common/PageBreadCrumb'
import UserMetaCard from '../components/UserProfile/UserMetaCard'
import UserInfoCard from '../components/UserProfile/UserInfoCard'
import UserAddressCard from '../components/UserProfile/UserAddressCard'
import PageMeta from '../components/common/PageMeta'
import { UserCircleIcon } from '@/icons'

export default function UserProfiles() {
  const { pathname } = useLocation()
  const isStudent = pathname.includes('/student/')
  const isAdvisor = pathname.includes('/advisor/')

  const pageTitle = isStudent ? 'Hồ sơ sinh viên' : isAdvisor ? 'Hồ sơ cố vấn' : 'Hồ sơ'

  return (
    <>
      <PageMeta
        title={isStudent ? 'Hồ sơ | Sinh viên' : isAdvisor ? 'Hồ sơ | Cố vấn' : 'Hồ sơ | Advisor'}
        description={
          isStudent
            ? 'Thông tin tài khoản và liên hệ của sinh viên.'
            : isAdvisor
              ? 'Thông tin tài khoản và liên hệ của cố vấn.'
              : 'Thông tin tài khoản và liên hệ.'
        }
      />
      <PageBreadcrumb pageTitle={pageTitle} />

      {(isStudent || isAdvisor) && (
        <section
          className={`relative mb-8 overflow-hidden rounded-2xl border p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.22)] ring-1 sm:p-6 ${
            isStudent
              ? 'border-brand-200/50 bg-gradient-to-br from-brand-50 via-white to-violet-50/45 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/40 dark:via-gray-900 dark:to-violet-950/25 dark:ring-brand-400/10'
              : 'border-emerald-200/40 bg-gradient-to-br from-emerald-50/90 via-white to-brand-50/35 ring-emerald-500/10 dark:border-emerald-500/15 dark:from-emerald-950/30 dark:via-gray-900 dark:to-brand-950/20 dark:ring-emerald-400/10'
          }`}
          aria-labelledby="profile-hero-title"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-brand-400/15 blur-3xl dark:bg-brand-500/10"
            aria-hidden
          />
          <div className="relative z-10 flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-brand-600 shadow-md ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
              <UserCircleIcon className="size-8" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {isStudent ? 'Tài khoản sinh viên' : 'Tài khoản cố vấn'}
              </p>
              <h2
                id="profile-hero-title"
                className="mt-1 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
              >
                Quản lý thông tin cá nhân
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Cập nhật ảnh đại diện, thông tin liên hệ và địa chỉ — dữ liệu hiển thị trong hệ thống
                cố vấn học tập.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] lg:p-6">
        <div className="mb-6 border-b border-gray-100 pb-4 dark:border-gray-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Chi tiết
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
            {pageTitle}
          </h3>
        </div>
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
          <UserAddressCard />
        </div>
      </div>
    </>
  )
}
