"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Store, Clock, Eye, FileText, User, Mail, Building2, Car, MessageSquare } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [signedUrls, setSignedUrls] = useState<{ [id: string]: string[] }>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [passwordInfo, setPasswordInfo] = useState<{ email: string; password: string; role: string } | null>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

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
      <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Stats Overview - White Cards with Shadow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Pending Applications</CardTitle>
              <Clock className="h-4 w-4" style={{ color: '#6B7280' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#1A202C' }}>{applications.length}</div>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Vendors</CardTitle>
              <Store className="h-4 w-4" style={{ color: '#10B981' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#10B981' }}>View All</div>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Manage active vendors</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Deliverers</CardTitle>
              <Users className="h-4 w-4" style={{ color: '#3B82F6' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>View All</div>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Track delivery personnel</p>
            </CardContent>
          </Card>
        </div>

          {/* Pending Applications Section */}
          <div className="space-y-4">
            {loading ? (
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#5B5FDE' }}></div>
                  <p style={{ color: '#6B7280' }}>Loading applications...</p>
                </CardContent>
              </Card>
            ) : applications.length === 0 ? (
              <Card className="bg-white shadow-sm border-gray-200">
                <CardContent className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>No Pending Applications</h3>
                  <p style={{ color: '#6B7280' }}>New vendor applications will appear here for review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app) => (
                  <Card key={app.id} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2" style={{ color: '#1A202C' }}>
                            {app.full_name}
                            <Badge
                              variant={app.role === 'vendor' ? 'default' : 'secondary'}
                              className={app.role === 'vendor' ? 'bg-[#5B5FDE] text-white' : ''}
                            >
                              {app.role || 'N/A'}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1" style={{ color: '#6B7280' }}>
                            <Mail className="w-3 h-3" />
                            {app.email}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Quick Preview Info */}
                      <div className="space-y-2 text-sm">
                        {app.business_name && (
                          <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{app.business_name}</span>
                          </div>
                        )}
                        {app.vehicle_type && (
                          <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                            <Car className="w-4 h-4" />
                            <span>{app.vehicle_type}</span>
                          </div>
                        )}
                        {app.organization && (
                          <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                            <Users className="w-4 h-4" />
                            <span className="truncate">{app.organization}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(app.created_at)}</span>
                        </div>
                      </div>

                      {/* Documents Preview */}
                      {signedUrls[app.id] && signedUrls[app.id].length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {signedUrls[app.id].slice(0, 3).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Document ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded border"
                              style={{ borderColor: '#E5E7EB' }}
                            />
                          ))}
                          {signedUrls[app.id].length > 3 && (
                            <div className="w-16 h-16 rounded border flex items-center justify-center text-xs" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}>
                              +{signedUrls[app.id].length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons - Gray secondary button */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          onClick={() => openReviewModal(app)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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