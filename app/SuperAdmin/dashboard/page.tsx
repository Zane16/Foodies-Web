"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "../../layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "./protectRoute"
import { supabase } from "@/../../supabaseClient"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Mail, Building2, Calendar } from "lucide-react"

type AdminProfile = {
  id: string
  full_name: string | null
  organization: string | null
  status: string | null
  created_at: string | null
  email?: string | null
}

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

export default function Dashboard() {
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [appLoading, setAppLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchAdmins()
    fetchApplications()
  }, [])

  // -------------------- Fetch Admins --------------------
  async function fetchAdmins() {
    setLoading(true)
    setError(null)
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, organization, status, created_at")
        .eq("role", "admin")

      if (profilesError) throw profilesError
      setAdmins(profiles || [])
    } catch (err: any) {
      console.error("fetchAdmins error:", err)
      setError(err.message || "Failed to load admins")
    } finally {
      setLoading(false)
    }
  }

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

  // -------------------- Admin Actions --------------------
  async function updateStatus(adminId: string, nextStatus: "approved" | "declined") {
    if (!confirm(`Are you sure you want to set status = "${nextStatus}" for this admin?`)) return
    setActionLoadingId(adminId)
    setError(null)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", adminId)

      if (error) throw error
      await fetchAdmins()
    } catch (err: any) {
      console.error("updateStatus error:", err)
      setError(err.message || "Failed to update status")
    } finally {
      setActionLoadingId(null)
    }
  }

  async function deleteAdmin(adminId: string) {
    if (!confirm("This will delete the admin profile. This does NOT delete the auth user. Continue?")) return
    setActionLoadingId(adminId)
    setError(null)
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", adminId)
      if (error) throw error
      await fetchAdmins()
    } catch (err: any) {
      console.error("deleteAdmin error:", err)
      setError(err.message || "Failed to delete admin")
    } finally {
      setActionLoadingId(null)
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

  // -------------------- Render --------------------
  if (loading || appLoading) {
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
          {/* ---------- Admins Table ---------- */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Manage Organizations (Admins)</h1>
              <p className="mt-1 text-sm text-muted-foreground">View and manage all school admins</p>
            </div>
            <div>
              <button
                onClick={() => { fetchAdmins(); fetchApplications() }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="mb-4 text-red-600">{error}</div>}

          {admins.length === 0 ? (
            <div className="py-6 text-gray-600">No organizations / admins found.</div>
          ) : (
            <div className="overflow-x-auto bg-white rounded shadow mb-12">
              <table className="min-w-full divide-y">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Organization</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{a.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{a.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{a.organization ?? "—"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{a.status ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{a.created_at ? format(new Date(a.created_at), "yyyy-MM-dd HH:mm") : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        <button
                          className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                          onClick={() => updateStatus(a.id, "approved")}
                          disabled={actionLoadingId === a.id}
                        >
                          {actionLoadingId === a.id ? "Working…" : "Approve"}
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-yellow-500 text-white text-xs hover:bg-yellow-600 disabled:opacity-50"
                          onClick={() => updateStatus(a.id, "declined")}
                          disabled={actionLoadingId === a.id}
                        >
                          {actionLoadingId === a.id ? "Working…" : "Decline"}
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                          onClick={() => deleteAdmin(a.id)}
                          disabled={actionLoadingId === a.id}
                        >
                          {actionLoadingId === a.id ? "Working…" : "Delete"}
                        </button>
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
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}