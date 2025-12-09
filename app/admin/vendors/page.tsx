"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Store, Search, Utensils, Mail, MapPin, Building2, CheckCircle2, XCircle } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"
import { supabase } from "@/lib/supabase"

interface Vendor {
  id: string
  full_name: string
  email: string
  business_name: string
  business_address: string
  total_items: number
  available_items: number
  total_categories: number
  is_active: boolean
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    // Filter vendors based on search query
    if (searchQuery.trim() === "") {
      setFilteredVendors(vendors)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = vendors.filter(vendor =>
        vendor.business_name.toLowerCase().includes(query) ||
        vendor.full_name.toLowerCase().includes(query) ||
        vendor.email.toLowerCase().includes(query)
      )
      setFilteredVendors(filtered)
    }
  }, [searchQuery, vendors])

  async function fetchVendors() {
    setLoading(true)
    try {
      // Fetch vendors for this organization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/vendors", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const vendorsData = await response.json()
        setVendors(Array.isArray(vendorsData) ? vendorsData : [])
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVendor = async (vendorId: string, currentStatus: boolean, vendorName: string) => {
    // If deactivating, ask for confirmation
    if (currentStatus) {
      const confirmed = confirm(
        `Are you sure you want to deactivate ${vendorName}?\n\nThis vendor will be removed from the active list and will no longer have access to the system.`
      )
      if (!confirmed) return
    }

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (response.ok) {
        // Refresh vendors list
        await fetchVendors()
      }
    } catch (error) {
      console.error("Failed to toggle vendor status:", error)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#5B5FDE' }} />
            <p className="text-lg" style={{ color: '#6B7280' }}>Loading vendors...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const activeVendors = vendors.filter(v => v.is_active).length
  const totalMenuItems = vendors.reduce((sum, v) => sum + v.total_items, 0)
  const availableItems = vendors.reduce((sum, v) => sum + v.available_items, 0)

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
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Total Vendors</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{vendors.length}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <Store className="h-6 w-6" style={{ color: '#5B5FDE' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Active</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#10B981' }}>{activeVendors}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                    <CheckCircle2 className="h-6 w-6" style={{ color: '#10B981' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Menu Items</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{totalMenuItems}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                    <Utensils className="h-6 w-6" style={{ color: '#F59E0B' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Available</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#10B981' }}>{availableItems}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                    <Utensils className="h-6 w-6" style={{ color: '#10B981' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendors Table */}
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
                      All Vendors
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
                    {searchQuery ? "Try adjusting your search" : "Approved vendors will appear here"}
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
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Menu</th>
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
                                {vendor.business_address && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                                    <span className="text-xs truncate max-w-[200px]" style={{ color: '#6B7280' }}>
                                      {vendor.business_address}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-medium" style={{ color: '#1A202C' }}>
                              {vendor.full_name}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#6B7280' }}>{vendor.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm" style={{ color: '#6B7280' }}>
                              <div className="flex items-center gap-2">
                                <Utensils className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                <span className="font-medium">{vendor.available_items} / {vendor.total_items} items</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Building2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                <span className="text-xs">{vendor.total_categories} categories</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <Badge
                              className={`px-3 py-1 rounded-full font-medium text-xs ${
                                vendor.is_active
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {vendor.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`font-medium transition-all ${
                                vendor.is_active
                                  ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300'
                                  : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
                              }`}
                              onClick={() => handleToggleVendor(vendor.id, vendor.is_active, vendor.business_name)}
                            >
                              {vendor.is_active ? (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
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
    </AdminLayout>
  )
}
