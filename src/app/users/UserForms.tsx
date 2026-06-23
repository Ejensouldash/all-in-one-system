"use client"

import { useState } from "react"
import { createUser, deleteUser, updateUser, resetUserPassword } from "@/app/actions/user"
import { AlertCircle, Trash2, UserPlus, X, Edit3, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddUserForm({ branches, units }: { branches: any[], units: any[] }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const res = await createUser(formData)
    
    if (!res.success) setError(res.error || "Failed to create user")
    else {
      setIsOpen(false)
      router.refresh()
    }
  }

  const filteredUnits = units.filter(u => u.branchId === selectedBranch)

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
        <UserPlus className="h-4 w-4 mr-2" />
        Add New User
      </button>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 animate-in slide-in-from-top-4 duration-300 relative">
      <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
        <X className="h-5 w-5" />
      </button>
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
        <UserPlus className="h-5 w-5 mr-2 text-blue-500" /> Register New Employee
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center border border-red-100"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select name="role" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="STAFF">Staff (Standard)</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="SUPERADMIN">SuperAdmin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
            <input type="text" name="password" defaultValue="P@ssword123" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
            <select name="branchId" onChange={(e) => setSelectedBranch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="">-- No Branch --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department / Unit</label>
            <select name="unitId" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" disabled={!selectedBranch}>
              <option value="">-- No Unit --</option>
              {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Create User
          </button>
        </div>
      </form>
    </div>
  )
}

export function DeleteUserButton({ id, currentUserId }: { id: string, currentUserId: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (id === currentUserId) return alert("You cannot delete yourself.")
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return
    
    const res = await deleteUser(id)
    if (!res.success) alert(`Error: ${res.error}`)
    else router.refresh()
  }

  return (
    <button 
      onClick={handleDelete} 
      disabled={id === currentUserId}
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      title={id === currentUserId ? "Cannot delete active session" : "Delete user"}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export function EditUserButton({ user, branches, units }: { user: any, branches: any[], units: any[] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors mr-2"
        title="Edit User"
      >
        <Edit3 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg flex items-center">
                <Edit3 className="h-5 w-5 mr-2 text-blue-500" /> Edit Employee: {user.name}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors border border-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              <EditProfileForm user={user} branches={branches} units={units} onClose={() => setIsOpen(false)} />
              
              <hr className="border-gray-100" />
              
              <ResetPasswordForm userId={user.id} onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EditProfileForm({ user, branches, units, onClose }: { user: any, branches: any[], units: any[], onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState(user.branchId || "")

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    const res = await updateUser(user.id, formData)
    
    setIsPending(false)
    if (!res.success) setError(res.error || "Failed to update user")
    else {
      onClose()
      router.refresh()
    }
  }

  const filteredUnits = units.filter(u => u.branchId === selectedBranch)

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      <h4 className="font-semibold text-gray-800">Profile Information</h4>
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center border border-red-100"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" name="name" defaultValue={user.name} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" name="email" defaultValue={user.email} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <select name="role" defaultValue={user.role} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="STAFF">Staff (Standard)</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="SUPERADMIN">SuperAdmin</option>
          </select>
        </div>
        <div className="hidden md:block"></div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
          <select name="branchId" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            <option value="">-- No Branch --</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Department / Unit</label>
          <select name="unitId" defaultValue={user.unitId || ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white" disabled={!selectedBranch}>
            <option value="">-- No Unit --</option>
            {filteredUnits.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button disabled={isPending} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-70">
          {isPending ? "Updating..." : "Update Profile"}
        </button>
      </div>
    </form>
  )
}

function ResetPasswordForm({ userId, onClose }: { userId: string, onClose: () => void }) {
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    const res = await resetUserPassword(userId, formData)
    
    setIsPending(false)
    if (!res.success) setError(res.error || "Failed to reset password")
    else {
      alert("Password reset successfully!")
      onClose()
    }
  }

  return (
    <form onSubmit={handlePasswordReset} className="space-y-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
      <h4 className="font-semibold text-red-800 flex items-center">
        <KeyRound className="h-4 w-4 mr-2" /> Security: Reset Password
      </h4>
      {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center border border-red-100"><AlertCircle className="h-3 w-3 mr-2" />{error}</div>}
      
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-red-700 mb-1">New Password (Min 6 chars)</label>
          <input type="text" name="newPassword" required minLength={6} placeholder="Enter new password" className="w-full px-3 py-2 border border-red-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-red-500" />
        </div>
        <button disabled={isPending} type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-70 whitespace-nowrap">
          {isPending ? "Resetting..." : "Reset Password"}
        </button>
      </div>
      <p className="text-xs text-red-600/80">This will immediately overwrite the user's current password. They will be required to log in with this new password.</p>
    </form>
  )
}
