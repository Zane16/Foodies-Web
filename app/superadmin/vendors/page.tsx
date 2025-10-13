"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "../dashboard/protectRoute"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Store, Mail, MapPin, Calendar, ChevronRight } from "lucide-react"

type Vendor = {
  id: string
  business_name: string
  business_address: string | null
  menu_summary: string | null
  is_active: boolean
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    email: string | null
    organization: string | null
    status: string | null
  }
}

type School = {
  school_name: string
  vendor_count: number
}

export default function VendorsManagement() {
  const [schools, setSchools] = useState<School[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false)

  useEffect(() => {
    fetchSchools()
  }, [])

  async function fetchSchools() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/schools')
      if (!response.ok) throw new Error('Failed to fetch schools')

      const result = await response.json()
      setSchools(result.schools || [])
    } catch (err: any) {
      console.error("fetchSchools error:", err)
      setError(err.message || "Failed to load schools")
    } finally {
      setLoading(false)
    }
  }

  async function fetchVendorsBySchool(schoolName: string) {
    setVendorsLoading(true)
    setError(null)
    setSelectedSchool(schoolName)
    try {
      const response = await fetch(`/api/superadmin/vendors?organization=${encodeURIComponent(schoolName)}`)
      if (!response.ok) throw new Error('Failed to fetch vendors')

      const result = await response.json()
      setVendors(result.vendors || [])
    } catch (err: any) {
      console.error("fetchVendors error:", err)
      setError(err.message || "Failed to load vendors")
    } finally {
      setVendorsLoading(false)
    }
  }

  async function deactivateVendor(vendorId: string, vendorName: string) {
    const confirmed = confirm(
      `⚠️ DEACTIVATE VENDOR: "${vendorName}"\n\n` +
      `This action will:\n` +
      `• Set vendor status to inactive\n` +
      `• Hide vendor from customer-facing menus\n` +
      `• This can be reversed by the school admin\n\n` +
      `Are you sure you want to proceed?`
    )

    if (!confirmed) return

    setActionLoading(vendorId)
    setError(null)

    try {
      const response = await fetch('/api/superadmin/vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to deactivate vendor')
      }

      alert(`Vendor "${vendorName}" has been deactivated.`)
      setIsVendorModalOpen(false)

      // Refresh the vendor list
      if (selectedSchool) {
        await fetchVendorsBySchool(selectedSchool)
      }
    } catch (err: any) {
      console.error("Deactivate vendor error:", err)
      setError(err.message || "Failed to deactivate vendor")
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  function openVendorModal(vendor: Vendor) {
    setSelectedVendor(vendor)
    setIsVendorModalOpen(true)
  }

  function backToSchools() {
    setSelectedSchool(null)
    setVendors([])
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <ProtectedSuperAdminRoute>
      <SuperAdminLayout>
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <span
              className={selectedSchool ? "cursor-pointer hover:text-primary" : ""}
              onClick={selectedSchool ? backToSchools : undefined}
            >
              Schools
            </span>
            {selectedSchool && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">{selectedSchool}</span>
              </>
            )}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">{error}</div>}

          {!selectedSchool ? (
            /* Schools List */
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Store className="w-7 h-7" />
                  Vendor Management
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Select a school to view and manage their vendors</p>
              </div>

              {schools.length === 0 ? (
                <div className="py-12 text-center text-gray-600">
                  <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>No schools found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schools.map((school, idx) => (
                    <button
                      key={idx}
                      onClick={() => fetchVendorsBySchool(school.school_name)}
                      className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left border-2 border-transparent hover:border-primary"
                    >
                      <h3 className="font-semibold text-lg mb-2">{school.school_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Store className="w-4 h-4" />
                        <span>{school.vendor_count} {school.vendor_count === 1 ? 'Vendor' : 'Vendors'}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-end text-primary text-sm font-medium">
                        View Vendors
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Vendors List for Selected School */
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">{selectedSchool} - Vendors</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage vendors for this school</p>
              </div>

              {vendorsLoading ? (
                <div className="py-12 text-center text-gray-600">Loading vendors...</div>
              ) : vendors.length === 0 ? (
                <div className="py-12 text-center text-gray-600">
                  <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>No vendors found for this school</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{vendor.business_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{vendor.profiles.full_name}</p>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{vendor.profiles.email}</span>
                          </div>
                          {vendor.business_address && (
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{vendor.business_address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">Joined {format(new Date(vendor.created_at), "MMM dd, yyyy")}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t">
                          <Badge variant={vendor.profiles.status === 'approved' ? 'default' : 'secondary'}>
                            {vendor.profiles.status || 'pending'}
                          </Badge>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => openVendorModal(vendor)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vendor Details Modal */}
        <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vendor Details</DialogTitle>
              <DialogDescription>
                View vendor information and manage their account
              </DialogDescription>
            </DialogHeader>

            {selectedVendor && (
              <div className="space-y-4">
                {/* Business Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">{selectedVendor.business_name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Owner Name</span>
                      <span className="font-medium">{selectedVendor.profiles.full_name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Email</span>
                      <span className="font-medium">{selectedVendor.profiles.email || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Organization</span>
                      <span className="font-medium">{selectedVendor.profiles.organization || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Status</span>
                      <Badge variant={selectedVendor.profiles.status === 'approved' ? 'default' : 'secondary'}>
                        {selectedVendor.profiles.status || 'pending'}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block mb-1">Business Address</span>
                      <span className="font-medium">{selectedVendor.business_address || "N/A"}</span>
                    </div>
                    {selectedVendor.menu_summary && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block mb-1">Menu Summary</span>
                        <span className="font-medium">{selectedVendor.menu_summary}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block mb-1">Joined Date</span>
                      <span className="font-medium">{format(new Date(selectedVendor.created_at), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsVendorModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deactivateVendor(selectedVendor.id, selectedVendor.business_name)}
                    disabled={actionLoading === selectedVendor.id}
                  >
                    {actionLoading === selectedVendor.id ? "Deactivating..." : "Deactivate Vendor"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}
