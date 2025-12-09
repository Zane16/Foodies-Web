"use client"

import { useEffect, useState } from "react"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import ProtectedSuperAdminRoute from "../dashboard/protectRoute"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Mail, Car, Calendar, ChevronRight, Truck, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

type Deliverer = {
  id: string
  full_name: string | null
  email: string | null
  organization: string | null
  vehicle_type: string | null
  availability: string | null
  created_at: string | null
}

type School = {
  school_name: string
  deliverer_count: number
}

export default function DeliverersManagement() {
  const [schools, setSchools] = useState<School[]>([])
  const [deliverers, setDeliverers] = useState<Deliverer[]>([])
  const [filteredDeliverers, setFilteredDeliverers] = useState<Deliverer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deliverersLoading, setDeliverersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSchools()
  }, [])

  useEffect(() => {
    // Filter deliverers based on search query
    if (searchQuery.trim() === "") {
      setFilteredDeliverers(deliverers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = deliverers.filter(deliverer =>
        deliverer.full_name?.toLowerCase().includes(query) ||
        deliverer.email?.toLowerCase().includes(query) ||
        deliverer.vehicle_type?.toLowerCase().includes(query)
      )
      setFilteredDeliverers(filtered)
    }
  }, [searchQuery, deliverers])

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

  async function fetchDeliverersBySchool(schoolName: string) {
    setDeliverersLoading(true)
    setError(null)
    setSelectedSchool(schoolName)
    try {
      // Get deliverer profiles (only approved)
      const { data: delivererProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, organization, created_at")
        .eq("role", "deliverer")
        .eq("organization", schoolName)
        .eq("status", "approved")

      if (profileError) throw profileError

      // Get deliverer application details
      const { data: applications, error: appError } = await supabase
        .from("applications")
        .select("email, vehicle_type, availability")
        .eq("role", "deliverer")
        .eq("organization", schoolName)
        .eq("status", "approved")

      if (appError) throw appError

      // Merge the data
      const mergedDeliverers = delivererProfiles?.map(profile => {
        const appData = applications?.find(a => a.email === profile.email)
        return {
          ...profile,
          vehicle_type: appData?.vehicle_type || null,
          availability: appData?.availability || null
        }
      }) || []

      setDeliverers(mergedDeliverers)
    } catch (err: any) {
      console.error("fetchDeliverers error:", err)
      setError(err.message || "Failed to load deliverers")
    } finally {
      setDeliverersLoading(false)
    }
  }

  function backToSchools() {
    setSelectedSchool(null)
    setDeliverers([])
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
                  <Users className="w-7 h-7" style={{ color: '#5B5FDE' }} />
                  Deliverer Management
                </h1>
                <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>Select a school to view and manage their deliverers</p>
              </div>

              {schools.length === 0 ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>No Schools Found</h3>
                    <p style={{ color: '#6B7280' }}>Schools will appear here once registered</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schools.map((school, idx) => (
                    <button
                      key={idx}
                      onClick={() => fetchDeliverersBySchool(school.school_name)}
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
                        <Users className="w-4 h-4" />
                        <span>{school.deliverer_count} {school.deliverer_count === 1 ? 'Deliverer' : 'Deliverers'}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-end text-sm font-medium" style={{ color: '#5B5FDE' }}>
                        View Deliverers
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Deliverers List for Selected School */
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

              {deliverersLoading ? (
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#5B5FDE' }}></div>
                    <p style={{ color: '#6B7280' }}>Loading deliverers...</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg overflow-hidden shadow-lg">
                  {/* Header with purple background */}
                  <div className="px-8 py-6" style={{ backgroundColor: '#5B5FDE' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
                          <Truck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {selectedSchool} Deliverers
                            <Badge className="bg-white/20 border-0 px-2.5 py-0.5 text-xs font-semibold text-white">
                              {deliverers.length}
                            </Badge>
                          </h2>
                          <p className="mt-1.5 text-sm text-white/90">
                            Showing {filteredDeliverers.length} of {deliverers.length} deliverers
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
                            placeholder="Search deliverers..."
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
                    {filteredDeliverers.length === 0 ? (
                      <CardContent className="text-center py-12">
                        <Truck className="w-12 h-12 mx-auto mb-4" style={{ color: '#6B7280' }} />
                        <h3 className="text-lg font-semibold mb-2" style={{ color: '#1A202C' }}>
                          {searchQuery ? "No deliverers found" : "No Deliverers"}
                        </h3>
                        <p style={{ color: '#6B7280' }}>
                          {searchQuery ? "Try adjusting your search" : "No deliverers found for this school"}
                        </p>
                      </CardContent>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead style={{ backgroundColor: '#F9FAFB' }}>
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Deliverer Name</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Contact</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Vehicle</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Availability</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Joined</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y bg-white" style={{ borderColor: '#E5E7EB' }}>
                            {filteredDeliverers.map((deliverer, index) => (
                              <tr
                                key={deliverer.id}
                                className="hover:bg-purple-50 transition-all duration-150"
                                style={{
                                  animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                                }}
                              >
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ backgroundColor: '#5B5FDE' }}>
                                      {deliverer.full_name ? deliverer.full_name.charAt(0).toUpperCase() : 'D'}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm" style={{ color: '#1A202C' }}>
                                        {deliverer.full_name || 'N/A'}
                                      </div>
                                      <div className="text-xs mt-1" style={{ color: '#6B7280' }}>
                                        {deliverer.organization || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                    <span className="text-sm" style={{ color: '#6B7280' }}>{deliverer.email || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                    <span className="text-sm capitalize font-medium" style={{ color: '#1A202C' }}>
                                      {deliverer.vehicle_type || 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="text-sm" style={{ color: '#6B7280' }}>
                                    {deliverer.availability || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                                    <span className="text-sm" style={{ color: '#6B7280' }}>
                                      {deliverer.created_at ? format(new Date(deliverer.created_at), "MMM dd, yyyy") : 'N/A'}
                                    </span>
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
      </SuperAdminLayout>
    </ProtectedSuperAdminRoute>
  )
}
