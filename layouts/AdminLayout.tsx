"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, School, Users, Store, Truck, Clock, CheckCircle2, AlertCircle, UserCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface QuickStats {
  pendingApplications: number
  activeVendors: number
  totalDeliverers: number
  recentActivity: number
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [organizationName, setOrganizationName] = useState("Admin Panel")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null)
  const [quickStats, setQuickStats] = useState<QuickStats>({
    pendingApplications: 0,
    activeVendors: 0,
    totalDeliverers: 0,
    recentActivity: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    async function fetchAdminProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("organization, full_name, profile_picture_url, header_image_url")
            .eq("id", user.id)
            .single()

          if (profile?.organization) {
            setOrganizationName(profile.organization)
          }
          if (profile?.profile_picture_url) {
            setLogoUrl(profile.profile_picture_url)
          }
          if (profile?.header_image_url) {
            setHeaderImageUrl(profile.header_image_url)
          }
        }
      } catch (error) {
        console.error("Failed to fetch admin profile:", error)
      }
    }
    fetchAdminProfile()
  }, [])

  useEffect(() => {
    async function fetchQuickStats() {
      try {
        // Get current user's organization
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("organization")
          .eq("id", user.id)
          .single()

        if (!profile?.organization) return

        const org = profile.organization

        // Fetch pending applications for this organization
        const { count: pendingCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("organization", org)

        // Fetch vendor IDs from this organization
        const { data: orgVendors } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "vendor")
          .eq("organization", org)

        const vendorIds = orgVendors?.map(v => v.id) || []

        // Fetch active vendors count
        let vendorsCount = 0
        if (vendorIds.length > 0) {
          const { count } = await supabase
            .from("vendors")
            .select("*", { count: "exact", head: true })
            .in("id", vendorIds)
            .eq("is_active", true)
          vendorsCount = count || 0
        }

        // Fetch deliverers count for this organization
        const { count: deliverersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "deliverer")
          .eq("organization", org)

        // Fetch recent activity (applications from last 7 days for this organization)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { count: recentCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("organization", org)
          .gte("created_at", sevenDaysAgo.toISOString())

        setQuickStats({
          pendingApplications: pendingCount || 0,
          activeVendors: vendorsCount,
          totalDeliverers: deliverersCount || 0,
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
      href: "/admin/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Customers",
      href: "/admin/customers",
      icon: UserCheck
    },
    {
      label: "Vendors",
      href: "/admin/vendors",
      icon: Store
    },
    {
      label: "Deliverers",
      href: "/admin/deliverers",
      icon: Truck
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: Users
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: Settings
    }
  ]

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) return

    try {
      await supabase.auth.signOut()
      router.push("/admin/signin")
    } catch (error) {
      console.error("Sign out error:", error)
      alert("Failed to sign out. Please try again.")
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
      {/* Fixed Organization Banner */}
      <div className="fixed top-0 left-64 right-0 z-30">
        {headerImageUrl ? (
          <div className="relative w-full h-48 overflow-hidden">
            <Image
              src={headerImageUrl}
              alt={`${organizationName} Header`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="container mx-auto">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                      <Image src={logoUrl} alt={`${organizationName} Logo`} width={64} height={64} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                      <School className="w-8 h-8" style={{ color: '#5B5FDE' }} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-white">{organizationName || "Admin Dashboard"}</h1>
                    <p className="text-sm text-white/90">Food Service Management Portal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-32" style={{ background: 'linear-gradient(135deg, #5B5FDE 0%, #7C7FE5 100%)' }}>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="container mx-auto">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/90 backdrop-blur-sm">
                      <Image src={logoUrl} alt={`${organizationName} Logo`} width={48} height={48} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                      <School className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-white">{organizationName || "Admin Dashboard"}</h1>
                    <p className="text-sm text-white/90">Food Service Management Portal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-64 bg-white fixed h-full shadow-md flex flex-col" style={{ borderRight: '1px solid #E5E7EB', top: 0, zIndex: 40 }}>
        {/* Logo & Branding Section */}
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F9FAFB' }}>
                <Image src={logoUrl} alt="Logo" width={40} height={40} className="object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5B5FDE' }}>
                <School className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base truncate" style={{ color: '#1A202C' }}>
                {organizationName}
              </h1>
              <p className="text-xs" style={{ color: '#6B7280' }}>Admin Portal</p>
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
                {/* Active Vendors */}
                <button
                  onClick={() => router.push("/admin/vendors")}
                  className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title={`View ${quickStats.activeVendors} active vendor${quickStats.activeVendors !== 1 ? 's' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <span className="text-sm" style={{ color: '#1A202C' }}>Vendors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: '#10B981' }}>
                      {quickStats.activeVendors}
                    </span>
                    {quickStats.activeVendors > 0 && (
                      <CheckCircle2 className="w-3 h-3" style={{ color: '#10B981' }} />
                    )}
                  </div>
                </button>

                {/* Deliverers */}
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="w-full flex items-center justify-between p-2 rounded-md transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  title={`${quickStats.totalDeliverers} registered deliverer${quickStats.totalDeliverers !== 1 ? 's' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" style={{ color: '#6B7280' }} />
                    <span className="text-sm" style={{ color: '#1A202C' }}>Deliverers</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#3B82F6' }}>
                    {quickStats.totalDeliverers}
                  </span>
                </button>

                {/* Pending Applications - Shows in Quick Stats */}
                {quickStats.pendingApplications > 0 && (
                  <div className="pt-2 mt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                    <button
                      onClick={() => router.push("/admin/dashboard")}
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

      <main className="ml-64" style={{ marginTop: headerImageUrl ? '192px' : '128px' }}>
        {children}
      </main>
    </div>
  )
}
