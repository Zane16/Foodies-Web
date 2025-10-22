"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Store, Clock, TrendingUp, Eye, FileText, User, Mail, Building2, MapPin, Utensils, Car, Calendar, MessageSquare, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Vendor {
  id: string
  full_name: string
  email: string
  business_name: string
  total_items: number
  available_items: number
  is_active: boolean
}

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
  const [vendors, setVendors] = useState<Vendor[]>([])
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

        const [appsRes, vendorsRes] = await Promise.all([
          fetch("/api/applications", {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }),
          fetch("/api/vendors", {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        ])

        if (!appsRes.ok) {
          console.error("Applications fetch failed:", await appsRes.text())
        }
        if (!vendorsRes.ok) {
          console.error("Vendors fetch failed:", await vendorsRes.text())
        }

        const appsData: Application[] = await appsRes.json()

        console.log("Applications data:", appsData) // Debug log

        setApplications(Array.isArray(appsData) ? appsData : [])

        // Process document URLs - they're already public URLs from Supabase
        if (Array.isArray(appsData)) {
          appsData.forEach((app) => {
            if (app.document_urls && Array.isArray(app.document_urls) && app.document_urls.length > 0) {
              console.log(`App ${app.id} has ${app.document_urls.length} documents:`, app.document_urls) // Debug log
              // Use the URLs directly since they're already public
              setSignedUrls(prev => ({ ...prev, [app.id]: app.document_urls as string[] }))
            }
          })
        }

        const vendorsData = await vendorsRes.json()
        setVendors(Array.isArray(vendorsData) ? vendorsData : [])
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

  // Remove active vendor
  const handleRemoveVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" })
      if (res.ok) setVendors(vendors.filter(vendor => vendor.id !== id))
    } catch (error) {
      console.error(error)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage vendors and monitor the Foodies platform</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Sign Out</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendors.length + applications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">Pending Applications</TabsTrigger>
            <TabsTrigger value="vendors">Active Vendors</TabsTrigger>
          </TabsList>

          {/* Pending Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading applications...</p>
                </CardContent>
              </Card>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Applications</h3>
                  <p className="text-muted-foreground">New vendor applications will appear here for review</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app) => (
                  <Card key={app.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {app.full_name}
                            <Badge variant={app.role === 'vendor' ? 'default' : 'secondary'}>
                              {app.role || 'N/A'}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
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
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{app.business_name}</span>
                          </div>
                        )}
                        {app.vehicle_type && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Car className="w-4 h-4" />
                            <span>{app.vehicle_type}</span>
                          </div>
                        )}
                        {app.organization && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="truncate">{app.organization}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
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
                              className="w-16 h-16 object-cover rounded border border-border"
                            />
                          ))}
                          {signedUrls[app.id].length > 3 && (
                            <div className="w-16 h-16 bg-muted rounded border border-border flex items-center justify-center text-xs text-muted-foreground">
                              +{signedUrls[app.id].length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
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
          </TabsContent>

          {/* Active Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            {vendors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Active Vendors</h3>
                  <p className="text-muted-foreground">Approved vendors will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vendors.map((vendor) => (
                  <Card key={vendor.id}>
                    <CardHeader>
                      <CardTitle>{vendor.business_name}</CardTitle>
                      <CardDescription className="space-y-1">
                        <div>{vendor.full_name}</div>
                        <div className="text-xs">{vendor.email}</div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Menu Items:</span>
                          <span className="font-medium">{vendor.available_items} / {vendor.total_items}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({vendor.available_items} available)
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemoveVendor(vendor.id)}
                      >
                        Deactivate Vendor
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Application Review</span>
              <Badge variant={selectedApp?.role === 'vendor' ? 'default' : 'secondary'}>
                {selectedApp?.role || 'N/A'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Review all details before approving or declining this application
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            {selectedApp && (
              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-sm mt-1">{selectedApp.full_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm mt-1">{selectedApp.email}</p>
                    </div>
                    {selectedApp.organization && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Organization</label>
                        <p className="text-sm mt-1">{selectedApp.organization}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendor-specific Information */}
                {selectedApp.role === 'vendor' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Business Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 pl-7">
                      {selectedApp.business_name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                          <p className="text-sm mt-1">{selectedApp.business_name}</p>
                        </div>
                      )}
                      {selectedApp.business_address && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Business Address</label>
                          <p className="text-sm mt-1">{selectedApp.business_address}</p>
                        </div>
                      )}
                      {selectedApp.menu_summary && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Menu Summary</label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{selectedApp.menu_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deliverer-specific Information */}
                {selectedApp.role === 'deliverer' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      Delivery Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      {selectedApp.vehicle_type && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Vehicle Type</label>
                          <p className="text-sm mt-1">{selectedApp.vehicle_type}</p>
                        </div>
                      )}
                      {selectedApp.availability && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Availability</label>
                          <p className="text-sm mt-1">{selectedApp.availability}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {selectedApp.notes && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Additional Notes
                    </h3>
                    <div className="pl-7">
                      <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">{selectedApp.notes}</p>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {signedUrls[selectedApp.id] && signedUrls[selectedApp.id].length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" />
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
                            View Document {idx + 1}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Date */}
                <div className="text-xs text-muted-foreground pl-7">
                  Applied on: {formatDate(selectedApp.created_at)}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Action Buttons Footer */}
          <div className="flex items-center gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
              disabled={loadingId === selectedApp?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => selectedApp && handleDecline(selectedApp.id)}
              disabled={loadingId === selectedApp?.id}
            >
              {loadingId === selectedApp?.id ? "Declining..." : "Decline"}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Shield className="w-5 h-5" />
              Application Approved!
            </DialogTitle>
            <DialogDescription>
              A new account has been created. Please share these credentials with the user.
            </DialogDescription>
          </DialogHeader>

          {passwordInfo && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
                  <p className="text-sm font-medium capitalize">{passwordInfo.role}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1">{passwordInfo.email}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordInfo.email)
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono flex-1 bg-background px-3 py-2 rounded border">
                      {passwordInfo.password}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordInfo.password)
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                <strong>Important:</strong> Make sure to copy and share these credentials with the user.
                They will need to change their password on first login.
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  const credentials = `Email: ${passwordInfo.email}\nPassword: ${passwordInfo.password}`;
                  navigator.clipboard.writeText(credentials);
                }}
              >
                Copy All Credentials
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
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
    </div>
  )
}