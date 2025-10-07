"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bike, Upload } from "lucide-react"

export default function RiderSignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bike className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Rider Sign Up</CardTitle>
          <CardDescription>
            Join as a delivery rider to earn money while helping students get their food
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input id="idNumber" type="text" placeholder="STU123456" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input id="organization" type="text" placeholder="Springfield High School" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="rider@student.edu" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a strong password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Verification Document</Label>
              <div className="flex items-center gap-2">
                <Input id="document" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => document.getElementById("document")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload student ID or verification document (PDF, JPG, PNG)
              </p>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Create Rider Account
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/rider/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
          <div className="text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
