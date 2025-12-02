"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Truck, Search, CheckCircle2, XCircle, RefreshCw, Package } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"
import { supabase } from "@/lib/supabase"

interface Deliverer {
  id: string
  full_name: string
  email: string
  vehicle_type: string
  availability: string
  is_active: boolean
  total_deliveries: number
  active_deliveries: number
}

export default function DeliverersPage() {
  const [deliverers, setDeliverers] = useState<Deliverer[]>([])
  const [filteredDeliverers, setFilteredDeliverers] = useState<Deliverer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchDeliverers()
  }, [])

  useEffect(() => {
    // Filter deliverers based on search query
    if (searchQuery.trim() === "") {
      setFilteredDeliverers(deliverers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = deliverers.filter(deliverer =>
        deliverer.full_name.toLowerCase().includes(query) ||
        deliverer.email.toLowerCase().includes(query) ||
        deliverer.vehicle_type.toLowerCase().includes(query)
      )
      setFilteredDeliverers(filtered)
    }
  }, [searchQuery, deliverers])

  async function fetchDeliverers() {
    setLoading(true)
    try {
      // Fetch deliverers for this organization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/deliverers", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const deliverersData = await response.json()
        setDeliverers(Array.isArray(deliverersData) ? deliverersData : [])
      }
    } catch (error) {
      console.error("Failed to fetch deliverers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDeliverer = async (delivererId: string, currentStatus: boolean, delivererName: string) => {
    // If deactivating, ask for confirmation
    if (currentStatus) {
      const confirmed = confirm(
        `Are you sure you want to deactivate ${delivererName}?\n\nThis deliverer will be removed from the active list and will no longer have access to the system.`
      )
      if (!confirmed) return
    }

    try {
      console.log(`[CLIENT] Deactivating deliverer ${delivererId}, current status: ${currentStatus}, setting to: ${!currentStatus}`)

      const response = await fetch(`/api/deliverers/${delivererId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      const result = await response.json()
      console.log("[CLIENT] Deactivation response:", result)

      if (response.ok) {
        console.log("[CLIENT] Deactivation successful, refreshing list...")
        // Wait a moment for database to commit
        await new Promise(resolve => setTimeout(resolve, 500))
        // Refresh deliverers list
        await fetchDeliverers()
      } else {
        console.error("[CLIENT] Deactivation failed:", result)
        alert(`Failed to update deliverer: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("[CLIENT] Failed to toggle deliverer status:", error)
      alert("An error occurred while updating the deliverer")
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#5B5FDE' }} />
            <p className="text-lg" style={{ color: '#6B7280' }}>Loading deliverers...</p>
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
              <h2 className="text-2xl font-bold" style={{ color: '#1A202C' }}>Deliverer Management</h2>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Manage and monitor all delivery personnel</p>
            </div>
            <Button
              onClick={fetchDeliverers}
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
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Total Deliverers</CardTitle>
                <Truck className="h-4 w-4" style={{ color: '#6B7280' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#1A202C' }}>{deliverers.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Active Deliverers</CardTitle>
                <CheckCircle2 className="h-4 w-4" style={{ color: '#10B981' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#10B981' }}>
                  {deliverers.filter(d => d.is_active).length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Total Deliveries</CardTitle>
                <Package className="h-4 w-4" style={{ color: '#6B7280' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#1A202C' }}>
                  {deliverers.reduce((sum, d) => sum + d.total_deliveries, 0)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" style={{ color: '#1A202C' }}>Active Deliveries</CardTitle>
                <Package className="h-4 w-4" style={{ color: '#3B82F6' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>
                  {deliverers.reduce((sum, d) => sum + d.active_deliveries, 0)}
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
                placeholder="Search deliverers by name, email, or vehicle type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200"
                style={{ color: '#1A202C' }}
              />
            </div>
          </div>

          {/* Deliverers Grid */}
          {filteredDeliverers.length === 0 ? (
            <Card className="bg-white shadow-sm border-gray-200">
              <CardContent className="text-center py-12">
                <Truck className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                  {searchQuery ? "No deliverers found" : "No Active Deliverers"}
                </h3>
                <p style={{ color: '#6B7280' }}>
                  {searchQuery ? "Try adjusting your search" : "Approved deliverers will appear here"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDeliverers.map((deliverer) => (
                <Card key={deliverer.id} className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle style={{ color: '#1A202C' }}>{deliverer.full_name}</CardTitle>
                        <CardDescription className="space-y-1 mt-2" style={{ color: '#6B7280' }}>
                          <div className="text-xs">{deliverer.email}</div>
                        </CardDescription>
                      </div>
                      <Badge
                        className={deliverer.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {deliverer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm" style={{ color: '#6B7280' }}>
                      <p className="font-medium" style={{ color: '#1A202C' }}>Vehicle Type</p>
                      <p className="mt-1 capitalize">{deliverer.vehicle_type}</p>
                    </div>

                    {deliverer.availability && (
                      <div className="text-sm" style={{ color: '#6B7280' }}>
                        <p className="font-medium" style={{ color: '#1A202C' }}>Availability</p>
                        <p className="mt-1">{deliverer.availability}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Total Deliveries</p>
                        <p className="font-bold" style={{ color: '#1A202C' }}>
                          {deliverer.total_deliveries}
                        </p>
                      </div>
                      <div className="p-2 rounded" style={{ backgroundColor: '#F9FAFB' }}>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Active</p>
                        <p className="font-bold" style={{ color: '#3B82F6' }}>
                          {deliverer.active_deliveries}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={deliverer.is_active ? "destructive" : "default"}
                      size="sm"
                      className="w-full"
                      style={deliverer.is_active ?
                        { backgroundColor: '#EF4444', color: '#FFFFFF' } :
                        { backgroundColor: '#10B981', color: '#FFFFFF' }
                      }
                      onClick={() => handleToggleDeliverer(deliverer.id, deliverer.is_active, deliverer.full_name)}
                    >
                      {deliverer.is_active ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Deactivate Deliverer
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Activate Deliverer
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
