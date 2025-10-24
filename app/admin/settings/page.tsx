"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { supabase } from "@/lib/supabase"
import { Image as ImageIcon, Upload, X, Loader2, ZoomIn, ZoomOut } from "lucide-react"
import AdminLayout from "@/layouts/AdminLayout"
import Cropper from "react-easy-crop"
import { getCroppedImg } from "@/lib/cropImage"

interface Settings {
  organization: string
  profile_picture_url: string | null
  header_image_url: string | null
  full_name: string
  email: string
}

interface CropState {
  crop: { x: number; y: number }
  zoom: number
  aspect: number
  croppedAreaPixels: any
}

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [headerPreview, setHeaderPreview] = useState<string | null>(null)

  // Crop modal states
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropType, setCropType] = useState<'logo' | 'header'>('logo')
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

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

  // Handle image selection (opens crop modal)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'header') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file")
      return
    }

    // Validate file size (10MB for cropping)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB")
      return
    }

    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCropType(type)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)

    // Reset input
    e.target.value = ''
  }

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Handle save cropped image
  const handleSaveCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return

    try {
      const croppedImage = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        `${cropType}-${Date.now()}.jpg`
      )

      // Close modal
      setCropModalOpen(false)

      // Upload the cropped image
      await uploadImage(croppedImage, cropType)

    } catch (error: any) {
      alert(error.message || "Failed to crop image")
    }
  }

  // Upload image to server
  const uploadImage = async (file: File, type: 'logo' | 'header') => {
    if (type === 'logo') {
      setUploadingLogo(true)
    } else {
      setUploadingHeader(true)
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

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

      // Update preview
      if (type === 'logo') {
        setLogoPreview(data.url)
      } else {
        setHeaderPreview(data.url)
      }

      // Update settings in database
      await updateSettings(type === 'logo' ? { profile_picture_url: data.url } : { header_image_url: data.url })

    } catch (error: any) {
      alert(error.message || `Failed to upload ${type}`)
    } finally {
      if (type === 'logo') {
        setUploadingLogo(false)
      } else {
        setUploadingHeader(false)
      }
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
                  onChange={(e) => handleImageSelect(e, 'logo')}
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
                Recommended: Square image (500x500px), max 10MB
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
                  onChange={(e) => handleImageSelect(e, 'header')}
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
                Recommended: Wide image (1200x300px), max 10MB
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Adjust Image</DialogTitle>
            <DialogDescription>
              Crop and zoom your {cropType === 'logo' ? 'logo' : 'header'} to fit perfectly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Crop Area */}
            <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden">
              {imageToCrop && (
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropType === 'logo' ? 1 : 4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Zoom</Label>
                <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-gray-500" />
                <Slider
                  value={[zoom]}
                  onValueChange={(values) => setZoom(values[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCropModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCrop}>
              Save & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
