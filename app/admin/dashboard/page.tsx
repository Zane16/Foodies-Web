"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Users, Store, Clock, Eye, FileText, User, Mail, Building2, Car, MessageSquare, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import AdminLayout from "@/layouts/AdminLayout"

interface Application {
  id: string
  full_name: string
  email: string
  role?: string
  business_name?: string
  business_address?: string
  menu_summary?: string
  vehicle_type?: string
  availability?: string
  notes?: string
  organization?: string
  document_urls?: string[]
  created_at?: string
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [signedUrls, setSignedUrls] = useState<{ [id: string]: string[] }>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [passwordInfo, setPasswordInfo] = useState<{ email: string; password: string; role: string } | null>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  // Fetch data from backend
  useEffect(() => {
    async function fetchData() {
      try {
        // Get the current session from Supabase to get the access token
        const { supabase } = await import("@/lib/supabase")
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.error("No session found")
          setLoading(false)
          return
        }

        const accessToken = session.access_token

        const appsRes = await fetch("/api/applications", {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!appsRes.ok) {
          console.error("Applications fetch failed:", await appsRes.text())
        }

        const appsData: Application[] = await appsRes.json()

        setApplications(Array.isArray(appsData) ? appsData : [])

        // Process document URLs - they're already public URLs from Supabase
        if (Array.isArray(appsData)) {
          appsData.forEach((app) => {
            if (app.document_urls && Array.isArray(app.document_urls) && app.document_urls.length > 0) {
              // Use the URLs directly since they're already public
              setSignedUrls(prev => ({ ...prev, [app.id]: app.document_urls as string[] }))
            }
          })
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter applications based on search and role
  useEffect(() => {
    let filtered = applications

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter(app => app.role === roleFilter)
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(app =>
        app.full_name.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.business_name?.toLowerCase().includes(query) ||
        app.vehicle_type?.toLowerCase().includes(query)
      )
    }

    setFilteredApplications(filtered)
  }, [applications, searchQuery, roleFilter])

  // Approve application
  const handleApprove = async (applicationId: string) => {
    setLoadingId(applicationId)
    const res = await fetch("/api/approve-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    })
    const data = await res.json()
    setLoadingId(null)

    if (data.success) {
      // Remove from applications list
      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      setIsModalOpen(false)

      // If a new user was created with a temp password, show it
      if (data.tempPassword && selectedApp) {
        setPasswordInfo({
          email: selectedApp.email,
          password: data.tempPassword,
          role: data.role || selectedApp.role || 'user'
        })
        setIsPasswordModalOpen(true)
      }
    } else {
      alert(data.error || "Error approving application")
    }
  }

  // Decline application
  const handleDecline = async (applicationId: string) => {
    setLoadingId(applicationId)
    const res = await fetch("/api/decline-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    })
    const data = await res.json()
    setLoadingId(null)

    if (data.success) {
      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      setIsModalOpen(false)
    } else {
      alert(data.error || "Error declining application")
    }
  }

  const openReviewModal = (app: Application) => {
    setSelectedApp(app)
    setIsModalOpen(true)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
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
          {/* Stats Overview - Redesigned Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Pending Applications</CardTitle>
                  <div className="text-3xl font-bold mt-2" style={{ color: '#F59E0B' }}>{applications.length}</div>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                  <Clock className="h-6 w-6" style={{ color: '#F59E0B' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Awaiting review</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Vendors</CardTitle>
                  <div className="text-3xl font-bold mt-2" style={{ color: '#10B981' }}>View All</div>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <Store className="h-6 w-6" style={{ color: '#10B981' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Manage active vendors</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Deliverers</CardTitle>
                  <div className="text-3xl font-bold mt-2" style={{ color: '#3B82F6' }}>View All</div>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                  <Users className="h-6 w-6" style={{ color: '#3B82F6' }} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Track delivery personnel</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Applications Section */}
          <div className="rounded-lg overflow-hidden shadow-lg">
            {/* Header with purple background */}
            <div className="px-8 py-6" style={{ backgroundColor: '#5B5FDE' }}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      All Applications
                      <Badge className="bg-white/20 border-0 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {applications.length}
                      </Badge>
                    </h2>
                    <p className="mt-1.5 text-sm text-white/90">
                      Showing {filteredApplications.length} of {applications.length} applications
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
                      placeholder="Search by name, email or details..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:bg-white/20 shadow-lg text-white placeholder-white/60 font-medium transition-all"
                    />
                  </div>
                  {/* Filter Dropdown */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg py-3 text-white font-medium focus:ring-2 focus:ring-white focus:bg-white/20 transition-all [&_svg]:!text-white [&_svg]:!opacity-90">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-xl border-0 overflow-hidden">
                      <SelectItem value="all" className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          <span className="font-medium">All Roles</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="vendor" className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#5B5FDE' }}></div>
                          <span className="font-medium">Vendors</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="deliverer" className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                          <span className="font-medium">Deliverers</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Gap between header and body */}
            <div className="h-4" style={{ backgroundColor: '#F7F7F7' }}></div>

            {/* Table card with white background */}
            <Card className="border-0 rounded-none bg-white">

            {loading ? (
              <CardContent className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#5B5FDE' }}></div>
                <p style={{ color: '#6B7280' }}>Loading applications...</p>
              </CardContent>
            ) : filteredApplications.length === 0 ? (
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                  {applications.length === 0 ? "No Pending Applications" : "No Results Found"}
                </h3>
                <p style={{ color: '#6B7280' }}>
                  {applications.length === 0 ? "New applications will appear here for review" : "Try adjusting your search or filter"}
                </p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#F9FAFB' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Applicant Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Date Applied</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white" style={{ borderColor: '#E5E7EB' }}>
                    {filteredApplications.map((app, index) => (
                      <tr
                        key={app.id}
                        className="hover:bg-purple-50 transition-all duration-150"
                        style={{
                          animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                        }}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{
                              backgroundColor: app.role === 'vendor' ? '#5B5FDE' : app.role === 'deliverer' ? '#3B82F6' : '#10B981'
                            }}>
                              {app.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="font-semibold text-sm" style={{ color: '#1A202C' }}>
                              {app.full_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant="default"
                            className={`px-3 py-1 rounded-full font-medium text-xs ${
                              app.role === 'vendor'
                                ? 'bg-purple-100 text-purple-700'
                                : app.role === 'deliverer'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {app.role ? app.role.charAt(0).toUpperCase() + app.role.slice(1) : 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                            <span className="text-sm" style={{ color: '#6B7280' }}>{app.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm" style={{ color: '#6B7280' }}>
                            {app.business_name && (
                              <div className="flex items-center gap-2 mb-1">
                                <Building2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                <span className="truncate max-w-[180px] font-medium">{app.business_name}</span>
                              </div>
                            )}
                            {app.vehicle_type && (
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                <span className="font-medium">{app.vehicle_type}</span>
                              </div>
                            )}
                            {!app.business_name && !app.vehicle_type && <span style={{ color: '#D1D5DB' }}>—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                            <span className="text-sm" style={{ color: '#6B7280' }}>{formatDate(app.created_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium text-xs">
                            Pending
                          </Badge>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 font-medium transition-all"
                            onClick={() => openReviewModal(app)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-white">
          <DialogHeader className="pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
            <DialogTitle className="flex items-center justify-between" style={{ color: '#1A202C' }}>
              <span>Application Review</span>
              <Badge
                variant={selectedApp?.role === 'vendor' ? 'default' : 'secondary'}
                className={selectedApp?.role === 'vendor' ? 'bg-[#5B5FDE] text-white' : ''}
              >
                {selectedApp?.role || 'N/A'}
              </Badge>
            </DialogTitle>
            <DialogDescription style={{ color: '#6B7280' }}>
              Review all details before approving or declining this application
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            {selectedApp && (
              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                    <User className="w-5 h-5" style={{ color: '#6B7280' }} />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Full Name</label>
                      <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.full_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Email</label>
                      <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.email}</p>
                    </div>
                    {selectedApp.organization && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Organization</label>
                        <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.organization}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendor-specific Information */}
                {selectedApp.role === 'vendor' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                      <Store className="w-5 h-5" style={{ color: '#6B7280' }} />
                      Business Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 pl-7">
                      {selectedApp.business_name && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Business Name</label>
                          <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.business_name}</p>
                        </div>
                      )}
                      {selectedApp.business_address && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Business Address</label>
                          <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.business_address}</p>
                        </div>
                      )}
                      {selectedApp.menu_summary && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Menu Summary</label>
                          <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#1A202C' }}>{selectedApp.menu_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deliverer-specific Information */}
                {selectedApp.role === 'deliverer' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                      <Car className="w-5 h-5" style={{ color: '#6B7280' }} />
                      Delivery Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      {selectedApp.vehicle_type && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Vehicle Type</label>
                          <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.vehicle_type}</p>
                        </div>
                      )}
                      {selectedApp.availability && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: '#6B7280' }}>Availability</label>
                          <p className="text-sm mt-1" style={{ color: '#1A202C' }}>{selectedApp.availability}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedApp.notes && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                      <MessageSquare className="w-5 h-5" style={{ color: '#6B7280' }} />
                      Additional Notes
                    </h3>
                    <div className="pl-7">
                      <p className="text-sm whitespace-pre-wrap p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', color: '#1A202C' }}>{selectedApp.notes}</p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {signedUrls[selectedApp.id] && signedUrls[selectedApp.id].length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                      <FileText className="w-5 h-5" style={{ color: '#6B7280' }} />
                      Documents ({signedUrls[selectedApp.id].length})
                    </h3>
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      {signedUrls[selectedApp.id].map((url, idx) => (
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

                {/* Application Date */}
                <div className="text-xs pl-7" style={{ color: '#9CA3AF' }}>
                  Applied on: {formatDate(selectedApp.created_at)}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Action Buttons Footer - Gray Cancel, Red Decline, Green Approve */}
          <div className="flex items-center gap-3 pt-4 border-t mt-4" style={{ borderColor: '#E5E7EB' }}>
            <Button
              variant="outline"
              className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => setIsModalOpen(false)}
              disabled={loadingId === selectedApp?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
              onClick={() => selectedApp && handleDecline(selectedApp.id)}
              disabled={loadingId === selectedApp?.id}
            >
              {loadingId === selectedApp?.id ? "Declining..." : "Decline"}
            </Button>
            <Button
              className="flex-1"
              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
              onClick={() => selectedApp && handleApprove(selectedApp.id)}
              disabled={loadingId === selectedApp?.id}
            >
              {loadingId === selectedApp?.id ? "Approving..." : "Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Display Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#10B981' }}>
              <Shield className="w-5 h-5" />
              Application Approved!
            </DialogTitle>
            <DialogDescription style={{ color: '#6B7280' }}>
              A new account has been created. Please share these credentials with the user.
            </DialogDescription>
          </DialogHeader>

          {passwordInfo && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#F9FAFB' }}>
                <div>
                  <label className="text-xs font-medium uppercase" style={{ color: '#6B7280' }}>Role</label>
                  <p className="text-sm font-medium capitalize" style={{ color: '#1A202C' }}>{passwordInfo.role}</p>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase" style={{ color: '#6B7280' }}>Email</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1" style={{ color: '#1A202C' }}>{passwordInfo.email}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordInfo.email)
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase" style={{ color: '#6B7280' }}>Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1 px-3 py-2 rounded border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1A202C' }}>
                      {passwordInfo.password}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordInfo.password)
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs p-3 rounded border" style={{ color: '#92400E', backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
                <strong>Important:</strong> Make sure to copy and share these credentials with the user.
                They will need to change their password on first login.
              </div>

              <Button
                className="w-full"
                style={{ backgroundColor: '#5B5FDE', color: '#FFFFFF' }}
                onClick={() => {
                  const credentials = `Email: ${passwordInfo.email}\nPassword: ${passwordInfo.password}`;
                  navigator.clipboard.writeText(credentials);
                }}
              >
                Copy All Credentials
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <Button
              variant="outline"
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setIsPasswordModalOpen(false)
                setPasswordInfo(null)
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
    </AdminLayout>
  )

}