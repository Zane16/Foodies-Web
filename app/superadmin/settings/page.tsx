"use client"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "../dashboard/protectRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon, Shield } from "lucide-react"

export default function Settings() {
  return (
    <ProtectedSuperAdminRoute>
      <SuperAdminLayout>
        <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                <SettingsIcon className="w-7 h-7" style={{ color: '#5B5FDE' }} />
                Settings
              </h1>
              <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>Manage platform settings and configurations</p>
            </div>

            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>Settings Coming Soon</h3>
                <p style={{ color: '#6B7280' }}>Platform configuration settings will be available here</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}
