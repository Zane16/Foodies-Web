"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Mail, Calendar, CheckCircle2, XCircle, MapPin, Phone, UserCheck } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"
import { supabase } from "@/lib/supabase"
import DeactivateUserModal from "@/components/DeactivateUserModal"

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  delivery_address: string | null
  status: 'approved' | 'declined'
  organization: string
  created_at: string
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchCustomers()
  }, [])

  useEffect(() => {
    // Filter customers based on search query
    let filtered = customers

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(customer =>
        customer.full_name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.delivery_address?.toLowerCase().includes(query)
      )
    }

    setFilteredCustomers(filtered)
  }, [searchQuery, customers])

  async function fetchCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error)
    }
  }

  async function fetchCustomers() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/admin/customers", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const customersData = await response.json()
        setCustomers(Array.isArray(customersData) ? customersData : [])
      } else {
        console.error("Failed to fetch customers:", await response.text())
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsModalOpen(true)
  }

  const confirmDeactivate = async () => {
    if (!selectedCustomer) return

    setActionLoading(selectedCustomer.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'deactivate' })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setSelectedCustomer(null)
        await fetchCustomers()
      } else {
        const error = await response.json()
        alert(`Failed to deactivate customer: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to deactivate customer:", error)
      alert("Failed to deactivate customer. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (customer: Customer) => {
    const confirmed = confirm(
      `Are you sure you want to reactivate ${customer.full_name}?\n\nThis customer will regain access to the system.`
    )
    if (!confirmed) return

    setActionLoading(customer.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${customer.id}`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reactivate' })
      })

      if (response.ok) {
        await fetchCustomers()
      } else {
        const error = await response.json()
        alert(`Failed to reactivate customer: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to reactivate customer:", error)
      alert("Failed to reactivate customer. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#5B5FDE' }} />
            <p className="text-lg" style={{ color: '#6B7280' }}>Loading customers...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const activeCustomers = customers.filter(c => c.status === 'approved').length
  const customersWithAddress = customers.filter(c => c.delivery_address).length
  const customersWithPhone = customers.filter(c => c.phone).length

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
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Total Customers</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{customers.length}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                    <Users className="h-6 w-6" style={{ color: '#6B7280' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Active Customers</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#10B981' }}>{activeCustomers}</div>
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
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>With Address</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{customersWithAddress}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                    <MapPin className="h-6 w-6" style={{ color: '#3B82F6' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>With Phone</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{customersWithPhone}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <Phone className="h-6 w-6" style={{ color: '#5B5FDE' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="bg-white shadow-lg border-0">
            {/* Header */}
            <div className="p-6" style={{ backgroundColor: '#5B5FDE' }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">Customer Management</h1>
                    <p className="text-sm text-white/80 mt-1">Manage customers in your organization</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-sm px-4 py-2">
                  {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
                </Badge>
              </div>

              {/* Search */}
              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, phone, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <CardContent className="p-0">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                  <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                    No customers found
                  </p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'No customers in your organization yet'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Customer</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Phone</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Delivery Address</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Status</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Joined</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer, index) => (
                        <tr
                          key={customer.id}
                          className="border-b transition-colors hover:bg-gray-50"
                          style={{
                            borderColor: '#E5E7EB',
                            animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                style={{ backgroundColor: '#6B7280' }}
                              >
                                {customer.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: '#1A202C' }}>{customer.full_name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Mail className="h-3 w-3" style={{ color: '#9CA3AF' }} />
                                  <p className="text-sm" style={{ color: '#6B7280' }}>{customer.email}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {customer.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                                <span className="text-sm" style={{ color: '#6B7280' }}>{customer.phone}</span>
                              </div>
                            ) : (
                              <span className="text-sm" style={{ color: '#D1D5DB' }}>No phone</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {customer.delivery_address ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                                <span className="text-sm truncate max-w-xs" style={{ color: '#6B7280' }}>{customer.delivery_address}</span>
                              </div>
                            ) : (
                              <span className="text-sm" style={{ color: '#D1D5DB' }}>No address</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {customer.status === 'approved' ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs font-medium">
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200 border text-xs font-medium">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#6B7280' }}>{formatDate(customer.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {customer.id !== currentUserId && (
                              customer.status === 'approved' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeactivate(customer)}
                                  disabled={actionLoading === customer.id}
                                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                >
                                  {actionLoading === customer.id ? 'Processing...' : 'Deactivate'}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivate(customer)}
                                  disabled={actionLoading === customer.id}
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  {actionLoading === customer.id ? 'Processing...' : 'Reactivate'}
                                </Button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deactivation Confirmation Modal */}
      {selectedCustomer && (
        <DeactivateUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedCustomer(null)
          }}
          onConfirm={confirmDeactivate}
          userName={selectedCustomer.full_name}
          userRole="customer"
          isLoading={actionLoading === selectedCustomer.id}
        />
      )}
    </AdminLayout>
  )
}
