"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Settings, LogOut, School } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard
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
    <div className="min-h-screen bg-gray-100">
      <aside className="w-64 bg-white fixed h-full shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <School className="w-6 h-6" />
            Admin Panel
          </h1>
        </div>

        <nav className="p-4 flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="ml-64">{children}</main>
    </div>
  )
}
