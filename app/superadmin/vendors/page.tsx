"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "../dashboard/protectRoute"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Store, Mail, MapPin, Calendar, ChevronRight, Building2, Search, Utensils } from "lucide-react"

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
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [searchQuery, setSearchQuery] = useState("")
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

  useEffect(() => {
    // Filter vendors based on search query
    if (searchQuery.trim() === "") {
      setFilteredVendors(vendors)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = vendors.filter(vendor =>
        vendor.business_name.toLowerCase().includes(query) ||
        vendor.profiles.full_name?.toLowerCase().includes(query) ||
        vendor.profiles.email?.toLowerCase().includes(query)
      )
      setFilteredVendors(filtered)
    }
  }, [searchQuery, vendors])

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
      <ProtectedSuperAdminRoute>
        <SuperAdminLayout>
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-lg" style={{ color: '#6B7280' }}>Loading...</p>
          </div>
        </SuperAdminLayout>
      </ProtectedSuperAdminRoute>
    )
  }

  return (
    <ProtectedSuperAdminRoute>
      <SuperAdminLayout>
        <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
          <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: '#6B7280' }}>
            <span
              className={selectedSchool ? "cursor-pointer hover:opacity-70" : ""}
              onClick={selectedSchool ? backToSchools : undefined}
              style={selectedSchool ? { color: '#5B5FDE' } : undefined}
            >
              Schools
            </span>
            {selectedSchool && (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium" style={{ color: '#1A202C' }}>{selectedSchool}</span>
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              {error}
            </div>
          )}

          {!selectedSchool ? (
            /* Schools List */
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: '#1A202C' }}>
                  <Store className="w-7 h-7" style={{ color: '#5B5FDE' }} />
                  Vendor Management
                </h1>
                <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>Select a school to view and manage their vendors</p>
              </div>

              {schools.length === 0 ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <Store className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>No Schools Found</h3>
                    <p style={{ color: '#6B7280' }}>Schools will appear here once registered</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schools.map((school, idx) => (
                    <button
                      key={idx}
                      onClick={() => fetchVendorsBySchool(school.school_name)}
                      className="bg-white p-6 rounded-lg shadow-sm border-2 transition-all text-left hover:shadow-md"
                      style={{ borderColor: '#E5E7EB' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#5B5FDE'
                        e.currentTarget.style.backgroundColor = '#F5F3FF'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB'
                        e.currentTarget.style.backgroundColor = '#FFFFFF'
                      }}
                    >
                      <h3 className="font-semibold text-lg mb-2" style={{ color: '#1A202C' }}>{school.school_name}</h3>
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                        <Store className="w-4 h-4" />
                        <span>{school.vendor_count} {school.vendor_count === 1 ? 'Vendor' : 'Vendors'}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-end text-sm font-medium" style={{ color: '#5B5FDE' }}>
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

              {vendorsLoading ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#5B5FDE' }}></div>
                    <p style={{ color: '#6B7280' }}>Loading vendors...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg overflow-hidden shadow-lg">
                  {/* Header with purple background */}
                  <div className="px-8 py-6" style={{ backgroundColor: '#5B5FDE' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
                          <Store className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {selectedSchool} Vendors
                            <Badge className="bg-white/20 border-0 px-2.5 py-0.5 text-xs font-semibold text-white">
                              {vendors.length}
                            </Badge>
                          </h2>
                          <p className="mt-1.5 text-sm text-white/90">
                            Showing {filteredVendors.length} of {vendors.length} vendors
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
                            placeholder="Search vendors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:bg-white/20 shadow-lg text-white placeholder-white/60 font-medium transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gap between header and body */}
                  <div className="h-4" style={{ backgroundColor: '#F7F7F7' }}></div>

                  {/* Table card with white background */}
                  <Card className="border-0 rounded-none bg-white">
                    {filteredVendors.length === 0 ? (
                      <CardContent className="text-center py-12">
                        <Store className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                        <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                          {searchQuery ? "No vendors found" : "No Vendors"}
                        </h3>
                        <p style={{ color: '#6B7280' }}>
                          {searchQuery ? "Try adjusting your search" : "No vendors found for this school"}
                        </p>
                      </CardContent>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead style={{ backgroundColor: '#F9FAFB' }}>
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Business Name</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Owner</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Contact</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Address</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Status</th>
                              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y bg-white" style={{ borderColor: '#E5E7EB' }}>
                            {filteredVendors.map((vendor, index) => (
                              <tr
                                key={vendor.id}
                                className="hover:bg-purple-50 transition-all duration-150"
                                style={{
                                  animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                                }}
                              >
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: '#5B5FDE' }}>
                                      {vendor.business_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm" style={{ color: '#1A202C' }}>
                                        {vendor.business_name}
                                      </div>
                                      <div className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                        Joined {format(new Date(vendor.created_at), "MMM dd, yyyy")}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="text-sm font-medium" style={{ color: '#1A202C' }}>
                                    {vendor.profiles.full_name || "N/A"}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                    <span className="text-sm" style={{ color: '#6B7280' }}>{vendor.profiles.email || "N/A"}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  {vendor.business_address ? (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                      <span className="text-sm truncate max-w-[200px]" style={{ color: '#6B7280' }}>
                                        {vendor.business_address}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm" style={{ color: '#9CA3AF' }}>—</span>
                                  )}
                                </td>
                                <td className="px-6 py-5">
                                  <Badge
                                    className={`px-3 py-1 rounded-full font-medium text-xs ${
                                      vendor.profiles.status === 'approved'
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}
                                  >
                                    {vendor.profiles.status || 'pending'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                      onClick={() => openVendorModal(vendor)}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300"
                                      onClick={() => deactivateVendor(vendor.id, vendor.business_name)}
                                      disabled={actionLoading === vendor.id}
                                    >
                                      {actionLoading === vendor.id ? "Working..." : "Deactivate"}
                                    </Button>
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
              )}
            </div>
          )}
          </div>
        </div>

        {/* Vendor Details Modal */}
        <Dialog open={isVendorModalOpen} onOpenChange={setIsVendorModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-white">
            <DialogHeader className="pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <DialogTitle style={{ color: '#1A202C' }}>Vendor Details</DialogTitle>
              <DialogDescription style={{ color: '#6B7280' }}>
                View vendor information and manage their account
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              {selectedVendor && (
                <div className="space-y-4 py-4">
                  {/* Business Info */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                    <h3 className="font-semibold text-lg mb-3" style={{ color: '#1A202C' }}>{selectedVendor.business_name}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Owner Name</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{selectedVendor.profiles.full_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Email</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{selectedVendor.profiles.email || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Organization</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{selectedVendor.profiles.organization || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Status</span>
                        <Badge
                          variant={selectedVendor.profiles.status === 'approved' ? 'default' : 'secondary'}
                          className={selectedVendor.profiles.status === 'approved' ? 'bg-[#10B981] text-white' : ''}
                        >
                          {selectedVendor.profiles.status || 'pending'}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Business Address</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{selectedVendor.business_address || "N/A"}</span>
                      </div>
                      {selectedVendor.menu_summary && (
                        <div className="col-span-2">
                          <span className="block mb-1" style={{ color: '#6B7280' }}>Menu Summary</span>
                          <span className="font-medium" style={{ color: '#1A202C' }}>{selectedVendor.menu_summary}</span>
                        </div>
                      )}
                      <div>
                        <span className="block mb-1" style={{ color: '#6B7280' }}>Joined Date</span>
                        <span className="font-medium" style={{ color: '#1A202C' }}>{format(new Date(selectedVendor.created_at), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t mt-4" style={{ borderColor: '#E5E7EB' }}>
              <Button
                variant="outline"
                className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setIsVendorModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                onClick={() => selectedVendor && deactivateVendor(selectedVendor.id, selectedVendor.business_name)}
                disabled={selectedVendor && actionLoading === selectedVendor.id}
              >
                {selectedVendor && actionLoading === selectedVendor.id ? "Deactivating..." : "Deactivate Vendor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}
