"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield } from "lucide-react"
import { supabase } from "@/../../supabaseClient"

export default function AdminApplicationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [supportingFile, setSupportingFile] = useState<File | null>(null)

  const handleApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget

    const organization = (form.organization as HTMLInputElement).value
    const email = (form.email as HTMLInputElement).value

    if (!idFile) {
      setError("Please upload a valid ID")
      setLoading(false)
      return
    }

    try {
      // Upload files to Supabase Storage and get public URLs
      const idPath = `applications/${email}/valid_id_${Date.now()}_${idFile.name}`
      const { error: idUploadError } = await supabase.storage
        .from("application-docs")
        .upload(idPath, idFile, { cacheControl: "3600", upsert: true })

      if (idUploadError) throw idUploadError

      // Get public URL for the uploaded ID
      const { data: idUrlData } = supabase.storage
        .from("application-docs")
        .getPublicUrl(idPath)

      const documentUrls = [idUrlData.publicUrl]

      // Upload supporting document if provided
      if (supportingFile) {
        const supportingPath = `applications/${email}/supporting_${Date.now()}_${supportingFile.name}`
        const { error: supUploadError } = await supabase.storage
          .from("application-docs")
          .upload(supportingPath, supportingFile, { cacheControl: "3600", upsert: true })

        if (supUploadError) throw supUploadError

        // Get public URL for supporting doc
        const { data: supUrlData } = supabase.storage
          .from("application-docs")
          .getPublicUrl(supportingPath)

        documentUrls.push(supUrlData.publicUrl)
      }

      // Submit via API route with array of public URLs
      const response = await fetch('/api/submit-admin-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          email,
          full_name: organization, // Use organization name as full_name for admins
          document_urls: documentUrls
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      alert("Application submitted successfully! SuperAdmin will review it.")
      router.push("/")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Application</CardTitle>
          <CardDescription>Submit your school information for approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleApplication} className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization Name</Label>
              <Input id="organization" type="text" placeholder="Springfield High School" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@school.edu" required />
            </div>
            <div>
              <Label htmlFor="validId">Valid ID (required)</Label>
              <Input
                id="validId"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div>
              <Label htmlFor="supportingDoc">Supporting Document (Authorization Letter)</Label>
              <Input
                id="supportingDoc"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setSupportingFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}