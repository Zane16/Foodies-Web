"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, School, Store } from "lucide-react"

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="w-64 bg-white fixed h-full shadow-lg">
        <div className="p-4 border-b">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <School className="w-6 h-6" />
            Super Admin
          </h1>
        </div>
        <nav className="p-4">
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
      </aside>
      <main className="ml-64">{children}</main>
    </div>
  )
}
