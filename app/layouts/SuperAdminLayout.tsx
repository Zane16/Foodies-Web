import React from "react"

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <aside className="w-64 bg-white fixed h-full shadow-lg">
        <div className="p-4 font-bold text-xl">Super Admin</div>
        <ul className="space-y-2 px-4">
          <li>Dashboard</li>
          <li>Schools</li>
          <li>Admins</li>
        </ul>
      </aside>
      <main className="ml-64 p-6">{children}</main>
    </div>
  )
}
