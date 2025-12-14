"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Mail, Calendar, CheckCircle2, XCircle, UserCheck, UserX } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"
import { supabase } from "@/lib/supabase"
import DeactivateUserModal from "@/components/DeactivateUserModal"

interface User {
  id: string
  full_name: string
  email: string
  role: 'customer' | 'vendor' | 'deliverer'
  status: 'approved' | 'declined'
  organization: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filter users based on search query and role filter
    let filtered = users

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, roleFilter, users])

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

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/admin/users", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const usersData = await response.json()
        setUsers(Array.isArray(usersData) ? usersData : [])
      } else {
        console.error("Failed to fetch users:", await response.text())
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const confirmDeactivate = async () => {
    if (!selectedUser) return

    setActionLoading(selectedUser.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'deactivate' })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        const error = await response.json()
        alert(`Failed to deactivate user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to deactivate user:", error)
      alert("Failed to deactivate user. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (user: User) => {
    const confirmed = confirm(
      `Are you sure you want to reactivate ${user.full_name}?\n\nThis user will regain access to the system.`
    )
    if (!confirmed) return

    setActionLoading(user.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reactivate' })
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        alert(`Failed to reactivate user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Failed to reactivate user:", error)
      alert("Failed to reactivate user. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      vendor: 'bg-purple-100 text-purple-700 border-purple-200',
      deliverer: 'bg-blue-100 text-blue-700 border-blue-200',
      customer: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[role] || colors.customer
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
            <p className="text-lg" style={{ color: '#6B7280' }}>Loading users...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const activeUsers = users.filter(u => u.status === 'approved').length
  const customersCount = users.filter(u => u.role === 'customer').length
  const vendorsAndDeliverersCount = users.filter(u => u.role === 'vendor' || u.role === 'deliverer').length

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
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Total Users</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{users.length}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <Users className="h-6 w-6" style={{ color: '#5B5FDE' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Active Users</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#10B981' }}>{activeUsers}</div>
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
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Customers</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{customersCount}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                    <UserCheck className="h-6 w-6" style={{ color: '#6B7280' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border-0 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Vendors & Deliverers</p>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#1A202C' }}>{vendorsAndDeliverersCount}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <Users className="h-6 w-6" style={{ color: '#5B5FDE' }} />
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
                  <Users className="h-8 w-8 text-white" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">User Management</h1>
                    <p className="text-sm text-white/80 mt-1">Manage users in your organization</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-sm px-4 py-2">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
                </Badge>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="vendor">Vendors</SelectItem>
                    <SelectItem value="deliverer">Deliverers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <UserX className="h-16 w-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                  <p className="text-lg font-semibold mb-2" style={{ color: '#6B7280' }}>
                    No users found
                  </p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    {searchQuery || roleFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'No users in your organization yet'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>User</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Role</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Status</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Joined</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, index) => (
                        <tr
                          key={user.id}
                          className="border-b transition-colors hover:bg-purple-50"
                          style={{
                            borderColor: '#E5E7EB',
                            animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                                style={{ backgroundColor: '#5B5FDE' }}
                              >
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: '#1A202C' }}>{user.full_name}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Mail className="h-3 w-3" style={{ color: '#9CA3AF' }} />
                                  <p className="text-sm" style={{ color: '#6B7280' }}>{user.email}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${getRoleBadgeColor(user.role)} border text-xs font-medium capitalize`}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {user.status === 'approved' ? (
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
                              <span className="text-sm" style={{ color: '#6B7280' }}>{formatDate(user.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {user.id !== currentUserId && (
                              user.status === 'approved' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeactivate(user)}
                                  disabled={actionLoading === user.id}
                                  className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                >
                                  {actionLoading === user.id ? 'Processing...' : 'Deactivate'}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivate(user)}
                                  disabled={actionLoading === user.id}
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  {actionLoading === user.id ? 'Processing...' : 'Reactivate'}
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
      {selectedUser && (
        <DeactivateUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedUser(null)
          }}
          onConfirm={confirmDeactivate}
          userName={selectedUser.full_name}
          userRole={selectedUser.role}
          isLoading={actionLoading === selectedUser.id}
        />
      )}
    </AdminLayout>
  )
}
