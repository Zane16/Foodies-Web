"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Store, Settings, LogOut, Shield, Users, Building2, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface QuickStats {
  totalSchools: number
  pendingApplications: number
  totalAdmins: number
  recentActivity: number
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalSchools: 0,
    pendingApplications: 0,
    totalAdmins: 0,
    recentActivity: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function fetchQuickStats() {
      try {
        // Fetch total unique schools
        const { data: schools } = await supabase
          .from("profiles")
          .select("organization")
          .eq("role", "admin")
          .not("organization", "is", null)

        const uniqueSchools = new Set(schools?.map(s => s.organization))

        // Fetch pending admin applications
        const { count: pendingCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin")
          .eq("status", "pending")

        // Fetch total admins
        const { count: adminsCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin")

        // Fetch recent activity (applications from last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { count: recentCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin")
          .gte("created_at", sevenDaysAgo.toISOString())

        setQuickStats({
          totalSchools: uniqueSchools.size,
          pendingApplications: pendingCount || 0,
          totalAdmins: adminsCount || 0,
          recentActivity: recentCount || 0
        })
      } catch (error) {
        console.error("Failed to fetch quick stats:", error)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchQuickStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchQuickStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const navItems = [
    {
      label: "Dashboard",
      href: "/superadmin/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Vendors",
      href: "/superadmin/vendors",
      icon: Store
    },
    {
      label: "Deliverers",
      href: "/superadmin/deliverers",
      icon: Users
    },
    {
      label: "Settings",
      href: "/superadmin/settings",
      icon: Settings
    }
  ]

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return

    try {
      await supabase.auth.signOut()
      router.push("/superadmin/signin")
    } catch (error) {
      console.error("Sign out error:", error)
      alert("Failed to sign out. Please try again.")
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
      {/* Fixed Header Banner */}
      <div className="fixed top-0 left-64 right-0 z-30">
        <div className="relative w-full h-32" style={{ background: 'linear-gradient(135deg, #5B5FDE 0%, #7C7FE5 100%)' }}>
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="container mx-auto">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
                  <p className="text-sm text-white/90">Global Platform Management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-white fixed h-full shadow-md flex flex-col" style={{ borderRight: '1px solid #E5E7EB', top: 0, zIndex: 40 }}>
        {/* Logo & Branding Section */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5B5FDE' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base truncate" style={{ color: '#1A202C' }}>
                Super Admin
              </h1>
              <p className="text-xs" style={{ color: '#6B7280' }}>Platform Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? ""
                        : ""
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: '#5B5FDE', color: '#FFFFFF' }
                        : { color: '#6B7280' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Quick Stats Section */}
          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>Quick Stats</h3>
              {quickStats.recentActivity > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#10B981' }} />
                  <span className="text-xs" style={{ color: '#10B981' }}>Live</span>
                </div>
              )}
            </div>

            {loadingStats ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#5B5FDE' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Total Schools */}
                <button
                  onClick={() => router.push("/superadmin/dashboard")}
                  className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title={`${quickStats.totalSchools} registered school${quickStats.totalSchools !== 1 ? 's' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <span className="text-sm" style={{ color: '#1A202C' }}>Schools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: '#5B5FDE' }}>
                      {quickStats.totalSchools}
                    </span>
                    {quickStats.totalSchools > 0 && (
                      <CheckCircle2 className="w-3 h-3" style={{ color: '#5B5FDE' }} />
                    )}
                  </div>
                </button>

                {/* Total Admins */}
                <button
                  onClick={() => router.push("/superadmin/dashboard")}
                  className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title={`${quickStats.totalAdmins} total admin${quickStats.totalAdmins !== 1 ? 's' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <span className="text-sm" style={{ color: '#1A202C' }}>Admins</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#10B981' }}>
                    {quickStats.totalAdmins}
                  </span>
                </button>

                {/* Pending Applications */}
                {quickStats.pendingApplications > 0 && (
                  <div className="pt-2 mt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <button
                      onClick={() => router.push("/superadmin/dashboard")}
                      className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02]"
                      style={{ backgroundColor: '#FEF3C7' }}
                      title={`${quickStats.pendingApplications} pending application${quickStats.pendingApplications !== 1 ? 's' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" style={{ color: '#F59E0B' }} />
                        <span className="text-sm font-medium" style={{ color: '#1A202C' }}>Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                          {quickStats.pendingApplications}
                        </span>
                        <AlertCircle className="w-3 h-3" style={{ color: '#F59E0B' }} />
                      </div>
                    </button>
                  </div>
                )}

                {/* Recent Activity */}
                {quickStats.recentActivity > 0 && (
                  <div className="pt-2 mt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: '#6B7280' }}>Last 7 days</span>
                      <span className="font-semibold" style={{ color: '#5B5FDE' }}>
                        +{quickStats.recentActivity} new
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full"
            style={{ color: '#EF4444' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="ml-64" style={{ marginTop: '128px' }}>
        {children}
      </main>
    </div>
  )
}
