"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Store, Search, Utensils, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
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

  return (
    <AdminLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#F7F7F7' }}>
        <div className="container mx-auto px-4 py-8">
          {/* Page Header with Refresh Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Vendor Management</h2>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Manage and monitor all vendors</p>
            </div>
            <Button
              onClick={fetchVendors}
              className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Total Vendors</CardTitle>
                <Store className="h-4 w-4" style={{ color: '#6B7280' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#1A202C' }}>{vendors.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Active Vendors</CardTitle>
                <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                  {vendors.filter(v => v.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Total Menu Items</CardTitle>
                <Utensils className="h-4 w-4" style={{ color: '#6B7280' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#1A202C' }}>
                  {vendors.reduce((sum, v) => sum + v.total_items, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Available Items</CardTitle>
                <Utensils className="h-4 w-4" style={{ color: '#10B981' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                  {vendors.reduce((sum, v) => sum + v.available_items, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#6B7280' }} />
              <Input
                type="text"
                placeholder="Search vendors by name, business, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200"
                style={{ color: '#1A202C' }}
              />
            </div>
          </div>

          {/* Vendors Grid */}
          {filteredVendors.length === 0 ? (
            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="text-center py-12">
                <Store className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                  {searchQuery ? "No vendors found" : "No Active Vendors"}
                </h3>
                <p style={{ color: '#6B7280' }}>
                  {searchQuery ? "Try adjusting your search" : "Approved vendors will appear here"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => (
                <Card key={vendor.id} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle style={{ color: '#1A202C' }}>{vendor.business_name}</CardTitle>
                        <CardDescription className="space-y-1 mt-2" style={{ color: '#6B7280' }}>
                          <div>{vendor.full_name}</div>
                          <div className="text-xs">{vendor.email}</div>
                        </CardDescription>
                      </div>
                      <Badge
                        className={vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {vendor.business_address && (
                      <div className="text-sm" style={{ color: '#6B7280' }}>
                        <p className="font-medium" style={{ color: '#1A202C' }}>Address</p>
                        <p className="mt-1">{vendor.business_address}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Menu Items</p>
                        <p className="font-bold" style={{ color: '#1A202C' }}>
                          {vendor.available_items} / {vendor.total_items}
                        </p>
                      </div>
                      <div className="p-2 rounded" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Categories</p>
                        <p className="font-bold" style={{ color: '#1A202C' }}>
                          {vendor.total_categories}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={vendor.is_active ? "destructive" : "default"}
                      size="sm"
                      className="w-full"
                      style={vendor.is_active ?
                        { backgroundColor: '#EF4444', color: '#FFFFFF' } :
                        { backgroundColor: '#10B981', color: '#FFFFFF' }
                      }
                      onClick={() => handleToggleVendor(vendor.id, vendor.is_active, vendor.business_name)}
                    >
                      {vendor.is_active ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Deactivate Vendor
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Activate Vendor
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
