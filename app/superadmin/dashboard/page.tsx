"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "./protectRoute"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Eye, FileText, Mail, Building2, Calendar, School, Users, Search } from "lucide-react"

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
  const [schoolsSearchQuery, setSchoolsSearchQuery] = useState("")
  const [filteredSchools, setFilteredSchools] = useState<School[]>([])

  useEffect(() => {
    fetchApplications()
    fetchSchools()
  }, [])

  useEffect(() => {
    // Filter schools based on search query
    if (schoolsSearchQuery.trim() === "") {
      setFilteredSchools(schools)
    } else {
      const query = schoolsSearchQuery.toLowerCase()
      const filtered = schools.filter(school =>
        school.school_name.toLowerCase().includes(query) ||
        school.admin_name.toLowerCase().includes(query) ||
        school.admin_email.toLowerCase().includes(query)
      )
      setFilteredSchools(filtered)
    }
  }, [schoolsSearchQuery, schools])

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
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
        <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
          <div className="container mx-auto px-6 py-8">
            {error && (
              <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
                {error}
              </div>
            )}

            {/* Schools Section */}
            <div className="rounded-lg overflow-hidden shadow-lg mb-12">
              {/* Header with purple background */}
              <div className="px-8 py-6" style={{ backgroundColor: '#5B5FDE' }}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
                      <School className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        All Schools
                        <Badge className="bg-white/20 border-0 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {schools.length}
                        </Badge>
                      </h2>
                      <p className="mt-1.5 text-sm text-white/90">
                        Showing {filteredSchools.length} of {schools.length} schools
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative w-80">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center z-10">
                        <Search className="w-5 h-5" style={{ color: '#FFFFFF', opacity: 0.9 }} />
                      </div>
                      <Input
                        type="text"
                        placeholder="Search schools..."
                        value={schoolsSearchQuery}
                        onChange={(e) => setSchoolsSearchQuery(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:bg-white/20 shadow-lg text-white placeholder-white/60 font-medium transition-all"
                      />
                    </div>
                    <Button
                      onClick={() => { fetchApplications(); fetchSchools() }}
                      className="bg-white/20 border border-white/20 text-white hover:bg-white/30 px-4 py-2 rounded-xl"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>

              {/* Gap between header and body */}
              <div className="h-4" style={{ backgroundColor: '#F7F7F7' }}></div>

              {/* Table card with white background */}
              <Card className="border-0 rounded-none bg-white">
                {filteredSchools.length === 0 ? (
                  <CardContent className="text-center py-12">
                    <School className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                      {schoolsSearchQuery ? "No schools found" : "No Schools"}
                    </h3>
                    <p style={{ color: '#6B7280' }}>
                      {schoolsSearchQuery ? "Try adjusting your search" : "Schools will appear here once admin applications are approved"}
                    </p>
                  </CardContent>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#F9FAFB' }}>
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>School Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Admin Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Contact</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Counts</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white" style={{ borderColor: '#E5E7EB' }}>
                        {filteredSchools.map((school, index) => (
                          <tr
                            key={index}
                            className="hover:bg-purple-50 transition-all duration-150"
                            style={{
                              animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                            }}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: '#5B5FDE' }}>
                                  {school.school_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: '#1A202C' }}>
                                    {school.school_name}
                                  </div>
                                  <div className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                    Created: {format(new Date(school.date_created), "MMM dd, yyyy")}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-sm font-medium" style={{ color: '#1A202C' }}>
                                {school.admin_name}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                <span className="text-sm" style={{ color: '#6B7280' }}>{school.admin_email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-sm" style={{ color: '#6B7280' }}>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                  <span className="font-medium">{school.admin_count} admins</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Building2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                  <span className="text-xs">{school.vendor_count} vendors, {school.deliverer_count} deliverers</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <Badge
                                className={`px-3 py-1 rounded-full font-medium text-xs ${
                                  school.status === 'approved'
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : school.status === 'declined'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}
                              >
                                {school.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                  onClick={() => openSchoolModal(school)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                                {school.status === 'approved' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
                                    onClick={() => deactivateSchool(school.school_name)}
                                    disabled={actionLoadingId === school.school_name}
                                  >
                                    {actionLoadingId === school.school_name ? "Working..." : "Deactivate"}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Pending Applications Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: '#1A202C' }}>Pending Admin Applications</h2>
              {appLoading ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#5B5FDE' }}></div>
                    <p style={{ color: '#6B7280' }}>Loading applications...</p>
                  </CardContent>
                </Card>
              ) : applications.length === 0 ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>No Pending Applications</h3>
                    <p style={{ color: '#6B7280' }}>New admin applications will appear here for review</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {applications.map((app) => (
                    <div key={app.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg" style={{ color: '#1A202C' }}>{app.organization}</h3>
                            <div className="flex items-center gap-1 text-sm mt-1" style={{ color: '#6B7280' }}>
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{app.email}</span>
                            </div>
                          </div>
                          <Badge
                            variant={app.status === 'pending' ? 'secondary' : 'default'}
                            className={app.status === 'admin' ? 'bg-[#5B5FDE] text-white' : ''}
                          >
                            {app.status}
                          </Badge>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                          <Calendar className="w-3 h-3" />
                          <span>{app.created_at ? format(new Date(app.created_at), "MMM dd, yyyy HH:mm") : "—"}</span>
                        </div>

                        {/* Documents Preview */}
                        {app.document_urls && app.document_urls.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {app.document_urls.slice(0, 2).map((url, idx) => (
                              <div key={idx} className="w-20 h-20 border rounded overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                                <img
                                  src={url}
                                  alt={`Document ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {app.document_urls.length > 2 && (
                              <div className="w-20 h-20 rounded border flex items-center justify-center text-xs" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}>
                                +{app.document_urls.length - 2}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        <Button
                          variant="outline"
                          className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
        </div>

        {/* Review Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white">
            <DialogHeader className="pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <DialogTitle style={{ color: '#1A202C' }}>Review Admin Application</DialogTitle>
              <DialogDescription style={{ color: '#6B7280' }}>
                Review the details and documents before approving or declining
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              {selectedApp && (
                <div className="space-y-6 py-4">
                  {/* Organization Info */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                      <Building2 className="w-5 h-5" style={{ color: '#6B7280' }} />
                      Organization Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      <div>
                        <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Organization</label>
                        <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.organization}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Email</label>
                        <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Status</label>
                        <p className="text-sm mt-1 capitalize" style={{ color: '#1A202C' }}>{selectedApp.status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Submitted</label>
                        <p className="text-sm mt-1" style={{ color: '#1A202C' }}>
                          {selectedApp.created_at ? format(new Date(selectedApp.created_at), "MMM dd, yyyy HH:mm") : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  {selectedApp.document_urls && selectedApp.document_urls.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                        <FileText className="w-5 h-5" style={{ color: '#6B7280' }} />
                        Documents ({selectedApp.document_urls.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-4 pl-7">
                        {selectedApp.document_urls.map((url, idx) => (
                          <div key={idx} className="space-y-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                              style={{ borderColor: '#E5E7EB' }}
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
                              className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => window.open(url, '_blank')}
                            >
                              <Eye className="w-3 h-3 mr-2" />
                              View Document {idx + 1}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t mt-4" style={{ borderColor: '#E5E7EB' }}>
              <Button
                variant="outline"
                className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setIsModalOpen(false)}
                disabled={actionLoadingId === selectedApp?.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                onClick={() => selectedApp && handleDeclineApplication(selectedApp.id)}
                disabled={actionLoadingId === selectedApp?.id}
              >
                {actionLoadingId === selectedApp?.id ? "Declining..." : "Decline"}
              </Button>
              <Button
                className="flex-1"
                style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
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
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-white">
            <DialogHeader className="pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <DialogTitle style={{ color: '#1A202C' }}>School Details</DialogTitle>
              <DialogDescription style={{ color: '#6B7280' }}>
                View all admins for this school
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              {selectedSchool && (
                <div className="space-y-4 py-4">
                  {/* School Info */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <h3 className="font-semibold text-lg mb-2" style={{ color: '#1A202C' }}>{selectedSchool.school_name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Status</span>
                        <Badge
                          variant={selectedSchool.status === 'approved' ? 'default' : selectedSchool.status === 'declined' ? 'destructive' : 'secondary'}
                          className={selectedSchool.status === 'approved' ? 'bg-[#10B981] text-white' : ''}
                        >
                          {selectedSchool.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Created</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{format(new Date(selectedSchool.date_created), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#DBEAFE' }}>
                      <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{selectedSchool.admin_count}</div>
                      <div className="text-sm mt-1" style={{ color: '#6B7280' }}>Total Admins</div>
                    </div>
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#D1FAE5' }}>
                      <div className="text-2xl font-bold" style={{ color: '#10B981' }}>{selectedSchool.vendor_count}</div>
                      <div className="text-sm mt-1" style={{ color: '#6B7280' }}>Total Vendors</div>
                    </div>
                    <div className="p-4 rounded-lg text-center" style={{ backgroundColor: '#E9D5FF' }}>
                      <div className="text-2xl font-bold" style={{ color: '#A855F7' }}>{selectedSchool.deliverer_count}</div>
                      <div className="text-sm mt-1" style={{ color: '#6B7280' }}>Total Deliverers</div>
                    </div>
                  </div>

                  {/* Admins List */}
                  <div>
                    <h4 className="font-semibold mb-3" style={{ color: '#1A202C' }}>Admin Accounts</h4>
                    <div className="space-y-2">
                      {selectedSchool.all_admins.map((admin) => (
                        <div key={admin.id} className="border rounded-lg p-3" style={{ borderColor: '#E5E7EB' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium" style={{ color: '#1A202C' }}>{admin.full_name || "N/A"}</div>
                              <div className="text-sm flex items-center gap-1 mt-1" style={{ color: '#6B7280' }}>
                                <Mail className="w-3 h-3" />
                                {admin.email || "N/A"}
                              </div>
                              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                                Created: {admin.created_at ? format(new Date(admin.created_at), "MMM dd, yyyy") : "N/A"}
                              </div>
                            </div>
                            <div>
                              <Badge
                                variant={admin.status === 'approved' ? 'default' : admin.status === 'declined' ? 'destructive' : 'secondary'}
                                className={admin.status === 'approved' ? 'bg-[#10B981] text-white' : ''}
                              >
                                {admin.status || "pending"}
                              </Badge>
                            </div>
                          </div>
                          {admin.status === 'approved' && (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
            </ScrollArea>

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <Button
                variant="outline"
                className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setIsSchoolModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}