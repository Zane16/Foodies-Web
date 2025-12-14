"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface DeactivateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
  userRole: string
  isLoading: boolean
}

export default function DeactivateUserModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userRole,
  isLoading
}: DeactivateUserModalProps) {
  const [inputValue, setInputValue] = useState("")
  const [isValid, setIsValid] = useState(false)

  // Reset input when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue("")
      setIsValid(false)
    }
  }, [isOpen])

  // Validate username match (case-sensitive)
  useEffect(() => {
    setIsValid(inputValue === userName)
  }, [inputValue, userName])

  const handleConfirm = () => {
    if (isValid && !isLoading) {
      onConfirm()
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      admin: 'bg-green-100 text-green-700 border-green-200',
      vendor: 'bg-purple-100 text-purple-700 border-purple-200',
      deliverer: 'bg-blue-100 text-blue-700 border-blue-200',
      customer: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[role.toLowerCase()] || colors.customer
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <AlertCircle className="h-6 w-6" style={{ color: '#EF4444' }} />
            </div>
            <div>
              <DialogTitle style={{ color: '#1A202C' }}>Deactivate User</DialogTitle>
              <DialogDescription style={{ color: '#6B7280' }}>
                This action requires confirmation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning message */}
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
          >
            <p className="text-sm font-semibold mb-2" style={{ color: '#991B1B' }}>
              Warning: This will deactivate the following user:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Name:</span>
                <span className="text-sm font-semibold" style={{ color: '#1A202C' }}>{userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Role:</span>
                <Badge className={`${getRoleBadgeColor(userRole)} border text-xs font-medium capitalize`}>
                  {userRole}
                </Badge>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: '#991B1B' }}>
              The user will lose access to the system and their authentication will be disabled.
            </p>
          </div>

          {/* Username confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="username-confirm" className="text-sm font-medium" style={{ color: '#1A202C' }}>
              Type <span className="font-bold">{userName}</span> to confirm
            </Label>
            <Input
              id="username-confirm"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter username exactly"
              className="w-full"
              style={{
                borderColor: inputValue && !isValid ? '#EF4444' : '#E5E7EB',
                backgroundColor: '#FFFFFF'
              }}
              disabled={isLoading}
              autoComplete="off"
            />
            {inputValue && !isValid && (
              <p className="text-xs" style={{ color: '#EF4444' }}>
                Username does not match. Please type it exactly as shown.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
            style={{
              borderColor: '#E5E7EB',
              color: '#6B7280'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="flex-1"
            style={{
              backgroundColor: isValid && !isLoading ? '#EF4444' : '#D1D5DB',
              color: '#FFFFFF',
              cursor: !isValid || isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#FFFFFF', borderTopColor: 'transparent' }}
                />
                <span>Deactivating...</span>
              </div>
            ) : (
              "Deactivate User"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
