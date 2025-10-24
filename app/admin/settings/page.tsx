"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"

interface Settings {
  organization: string
  profile_picture_url: string | null
  header_image_url: string | null
  full_name: string
  email: string
}

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [headerPreview, setHeaderPreview] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/admin/signin")
          return
        }

        const accessToken = session.access_token

        const res = await fetch("/api/admin/settings", {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!res.ok) {
          throw new Error("Failed to fetch settings")
        }

        const data = await res.json()
        setSettings(data)
        setLogoPreview(data.profile_picture_url)
        setHeaderPreview(data.header_image_url)
      } catch (error) {
        console.error("Error fetching settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [router])

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    setUploadingLogo(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'logo')

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await res.json()
      setLogoPreview(data.url)

      // Update settings in database
      await updateSettings({ profile_picture_url: data.url })

    } catch (error: any) {
      alert(error.message || "Failed to upload logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  // Handle header upload
  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB")
      return
    }

    setUploadingHeader(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'header')

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await res.json()
      setHeaderPreview(data.url)

      // Update settings in database
      await updateSettings({ header_image_url: data.url })

    } catch (error: any) {
      alert(error.message || "Failed to upload header")
    } finally {
      setUploadingHeader(false)
    }
  }

  // Update settings
  const updateSettings = async (updates: Partial<Settings>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Update failed")
      }

      const data = await res.json()

      // Update local state
      setSettings(prev => prev ? { ...prev, ...data.profile } : null)

    } catch (error: any) {
      throw error
    }
  }

  // Remove logo
  const removeLogo = async () => {
    try {
      await updateSettings({ profile_picture_url: null })
      setLogoPreview(null)
    } catch (error: any) {
      alert(error.message || "Failed to remove logo")
    }
  }

  // Remove header
  const removeHeader = async () => {
    try {
      await updateSettings({ header_image_url: null })
      setHeaderPreview(null)
    } catch (error: any) {
      alert(error.message || "Failed to remove header")
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your organization's branding</p>
          </div>

        {/* Organization Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
            <CardDescription>Your school details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Organization</Label>
              <p className="text-lg font-semibold mt-1">{settings?.organization || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Admin Name</Label>
              <p className="text-lg mt-1">{settings?.full_name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <p className="text-lg mt-1">{settings?.email || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>School Logo</CardTitle>
            <CardDescription>
              This logo will be displayed to customers when they browse your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logoPreview ? (
                <div className="relative w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={logoPreview}
                    alt="School logo"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No logo uploaded</p>
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                Recommended: Square image (500x500px), max 5MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Header Upload */}
        <Card>
          <CardHeader>
            <CardTitle>School Header/Banner</CardTitle>
            <CardDescription>
              This banner will be displayed at the top of your organization's page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {headerPreview ? (
                <div className="relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={headerPreview}
                    alt="School header"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removeHeader}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No header uploaded</p>
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleHeaderUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => headerInputRef.current?.click()}
                  disabled={uploadingHeader}
                >
                  {uploadingHeader ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {headerPreview ? "Change Header" : "Upload Header"}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                Recommended: Wide image (1200x300px), max 5MB
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
