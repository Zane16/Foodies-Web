"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "./protectRoute"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Mail, Building2, Calendar, School } from "lucide-react"

type AdminApplication = {
  id: string
  full_name: string
  organization: string
  email: string
  role: string
  status: string
  document_urls: string[] | null
  created_at: string | null
}

type School = {
  school_name: string
  admin_email: string
  admin_name: string
  admin_id: string
  status: string
  date_created: string
  admin_count: number
  vendor_count: number
  deliverer_count: number
  all_admins: Array<{
    id: string
    full_name: string | null
    email: string | null
    status: string | null
    created_at: string | null
  }>
}

export default function Dashboard() {
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [appLoading, setAppLoading] = useState(true)
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)

  useEffect(() => {
    fetchApplications()
    fetchSchools()
  }, [])

  // -------------------- Fetch Applications --------------------
  async function fetchApplications() {
    setAppLoading(true)
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (err: any) {
      console.error("fetchApplications error:", err)
    } finally {
      setAppLoading(false)
    }
  }

  // -------------------- Fetch Schools --------------------
  async function fetchSchools() {
    setSchoolsLoading(true)
    try {
      const response = await fetch('/api/schools')
      if (!response.ok) throw new Error('Failed to fetch schools')

      const result = await response.json()
      setSchools(result.schools || [])
    } catch (err: any) {
      console.error("fetchSchools error:", err)
    } finally {
      setSchoolsLoading(false)
    }
  }

  // -------------------- Application Actions --------------------
  async function handleApproveApplication(appId: string, email: string) {
    if (!confirm(`Approve this application? A magic link will be sent to ${email}`)) return
    setActionLoadingId(appId)
    setError(null)
    
    try {
      // Call your API to approve and send magic link
      const response = await fetch('/api/approve-admin-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, email })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve application')
      }

      // Show the password to the SuperAdmin
      alert(`Application approved!\n\nEmail: ${result.email}\nPassword: ${result.tempPassword}\n\nPlease save these credentials and share them with the admin.`)
      setIsModalOpen(false)
      await fetchApplications()
    } catch (err: any) {
      console.error("Approve error:", err)
      setError(err.message || "Failed to approve application")
      alert(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeclineApplication(appId: string) {
    if (!confirm('Decline this application? This action cannot be undone.')) return
    setActionLoadingId(appId)
    setError(null)

    try {
      // Call the decline API endpoint
      const response = await fetch('/api/decline-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline application')
      }

      alert('Application declined')
      setIsModalOpen(false)
      await fetchApplications()
    } catch (err: any) {
      console.error("Decline error:", err)
      setError(err.message || "Failed to decline application")
    } finally {
      setActionLoadingId(null)
    }
  }

  // Document URLs are already public URLs in the new schema
  // No need to fetch from storage

  const openReviewModal = (app: AdminApplication) => {
    setSelectedApp(app)
    setIsModalOpen(true)
  }

  const openSchoolModal = (school: School) => {
    setSelectedSchool(school)
    setIsSchoolModalOpen(true)
  }

  async function resetAdminPassword(adminId: string, adminEmail: string, adminName: string) {
    if (!confirm(`Reset password for ${adminName} (${adminEmail})?\n\nA new password will be generated and displayed to you.`)) return

    setActionLoadingId(adminId)
    setError(null)

    try {
      const response = await fetch('/api/reset-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      alert(`Password reset successful!\n\nEmail: ${result.email}\nNew Password: ${result.newPassword}\n\nPlease save this password and share it securely with the admin.`)
    } catch (err: any) {
      console.error("Reset password error:", err)
      setError(err.message || "Failed to reset password")
      alert(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  async function deactivateSchool(schoolName: string) {
    const confirmed = confirm(
      `⚠️ DEACTIVATE SCHOOL: "${schoolName}"\n\n` +
      `This action will:\n` +
      `• Set ALL admin accounts to "declined" status\n` +
      `• Prevent all admins from accessing the system\n` +
      `• This action CANNOT be undone easily\n\n` +
      `Are you absolutely sure you want to proceed?`
    )

    if (!confirmed) return

    const school = schools.find(s => s.school_name === schoolName)
    if (!school) return

    setActionLoadingId(schoolName)
    setError(null)

    try {
      // Update all admins for this school
      for (const admin of school.all_admins) {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "declined" })
          .eq("id", admin.id)

        if (error) throw error
      }

      await fetchSchools()
      alert(`All admins for "${schoolName}" have been deactivated.`)
      setIsSchoolModalOpen(false) // Close the modal after deactivation
    } catch (err: any) {
      console.error("Deactivate school error:", err)
      setError(err.message || "Failed to deactivate school")
    } finally {
      setActionLoadingId(null)
    }
  }

  // -------------------- Render --------------------
  if (appLoading || schoolsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <ProtectedSuperAdminRoute>
      <SuperAdminLayout>
        <div className="p-6">
          {/* ---------- Schools Table ---------- */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <School className="w-7 h-7" />
                Schools Overview
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">View all registered schools and their admin contacts</p>
            </div>
            <div>
              <button
                onClick={() => { fetchApplications(); fetchSchools() }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="mb-4 text-red-600">{error}</div>}

          {schools.length === 0 ? (
            <div className="py-6 text-gray-600">No schools found.</div>
          ) : (
            <div className="overflow-x-auto bg-white rounded shadow mb-12">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">School Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Admin Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Admin Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date Created</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Admins</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schools.map((school, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{school.school_name}</td>
                      <td className="px-4 py-3 text-sm">{school.admin_name}</td>
                      <td className="px-4 py-3 text-sm">{school.admin_email}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={school.status === 'approved' ? 'default' : school.status === 'declined' ? 'destructive' : 'secondary'}>
                          {school.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{format(new Date(school.date_created), "MMM dd, yyyy")}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge variant="outline">{school.admin_count}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        <button
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                          onClick={() => openSchoolModal(school)}
                        >
                          View Details
                        </button>
                        {school.status === 'approved' && (
                          <button
                            className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                            onClick={() => deactivateSchool(school.school_name)}
                            disabled={actionLoadingId === school.school_name}
                          >
                            {actionLoadingId === school.school_name ? "Working…" : "Deactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- Admin Applications Table ---------- */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Pending Admin Applications</h2>
            {applications.length === 0 ? (
              <div className="py-6 text-gray-600">No pending applications.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{app.organization}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{app.email}</span>
                          </div>
                        </div>
                        <Badge variant={app.status === 'pending' ? 'secondary' : 'default'}>
                          {app.status}
                        </Badge>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{app.created_at ? format(new Date(app.created_at), "MMM dd, yyyy HH:mm") : "—"}</span>
                      </div>

                      {/* Documents Preview */}
                      {app.document_urls && app.document_urls.length > 0 && (
                        <div className="flex gap-2">
                          {app.document_urls.slice(0, 2).map((url, idx) => (
                            <div key={idx} className="w-20 h-20 border rounded overflow-hidden">
                              <img
                                src={url}
                                alt={`Document ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {app.document_urls.length > 2 && (
                            <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center text-xs">
                              +{app.document_urls.length - 2}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openReviewModal(app)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review Application
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Review Admin Application</DialogTitle>
              <DialogDescription>
                Review the details and documents before approving or declining
              </DialogDescription>
            </DialogHeader>

            {selectedApp && (
              <div className="flex-1 overflow-y-auto space-y-6 py-4">
                {/* Organization Info */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Organization Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Organization</label>
                      <p className="text-sm mt-1">{selectedApp.organization}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm mt-1">{selectedApp.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-sm mt-1 capitalize">{selectedApp.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                      <p className="text-sm mt-1">
                        {selectedApp.created_at ? format(new Date(selectedApp.created_at), "MMM dd, yyyy HH:mm") : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {selectedApp.document_urls && selectedApp.document_urls.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents ({selectedApp.document_urls.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      {selectedApp.document_urls.map((url, idx) => (
                        <div key={idx} className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Document {idx + 1}</label>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`Document ${idx + 1}`}
                              className="w-full h-48 object-cover"
                            />
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Eye className="w-3 h-3 mr-2" />
                            View Full Size
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
                disabled={actionLoadingId === selectedApp?.id}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => selectedApp && handleDeclineApplication(selectedApp.id)}
                disabled={actionLoadingId === selectedApp?.id}
              >
                {actionLoadingId === selectedApp?.id ? "Declining..." : "Decline"}
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => selectedApp && handleApproveApplication(selectedApp.id, selectedApp.email)}
                disabled={actionLoadingId === selectedApp?.id}
              >
                {actionLoadingId === selectedApp?.id ? "Approving..." : "Approve & Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* School Details Modal */}
        <Dialog open={isSchoolModalOpen} onOpenChange={setIsSchoolModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>School Details</DialogTitle>
              <DialogDescription>
                View all admins for this school
              </DialogDescription>
            </DialogHeader>

            {selectedSchool && (
              <div className="space-y-4">
                {/* School Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{selectedSchool.school_name}</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-muted-foreground block mb-1">Status</span>
                      <Badge variant={selectedSchool.status === 'approved' ? 'default' : selectedSchool.status === 'declined' ? 'destructive' : 'secondary'}>
                        {selectedSchool.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Created</span>
                      <span className="font-medium">{format(new Date(selectedSchool.date_created), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedSchool.admin_count}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Admins</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedSchool.vendor_count}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Vendors</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedSchool.deliverer_count}</div>
                    <div className="text-sm text-muted-foreground mt-1">Total Deliverers</div>
                  </div>
                </div>

                {/* Admins List */}
                <div>
                  <h4 className="font-semibold mb-3">Admin Accounts</h4>
                  <div className="space-y-2">
                    {selectedSchool.all_admins.map((admin) => (
                      <div key={admin.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{admin.full_name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {admin.email || "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created: {admin.created_at ? format(new Date(admin.created_at), "MMM dd, yyyy") : "N/A"}
                            </div>
                          </div>
                          <div>
                            <Badge variant={admin.status === 'approved' ? 'default' : admin.status === 'declined' ? 'destructive' : 'secondary'}>
                              {admin.status || "pending"}
                            </Badge>
                          </div>
                        </div>
                        {admin.status === 'approved' && (
                          <div className="mt-3 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => resetAdminPassword(admin.id, admin.email || '', admin.full_name || 'Admin')}
                              disabled={actionLoadingId === admin.id}
                            >
                              {actionLoadingId === admin.id ? "Resetting..." : "Reset Password"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsSchoolModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}