import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AddUserForm, DeleteUserButton, EditUserButton } from "./UserForms"
import { Users, ShieldAlert, KeyRound } from "lucide-react"
import Link from "next/link"
import { SearchInput } from "@/components/ui/SearchInput"
import { Pagination } from "@/components/ui/Pagination"

export default async function UsersPage(props: { searchParams?: Promise<{ query?: string; page?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ""
  const currentPage = Number(searchParams?.page) || 1
  const ITEMS_PER_PAGE = 50

  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const searchWhere = query ? {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } }
    ]
  } : {}

  const totalUsers = await prisma.user.count({ where: searchWhere as any })
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE)

  const users = await prisma.user.findMany({
    where: searchWhere as any,
    include: { branch: true, unit: true },
    orderBy: { createdAt: 'desc' },
    take: ITEMS_PER_PAGE,
    skip: (currentPage - 1) * ITEMS_PER_PAGE
  })

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } })
  const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system access, roles, and branch assignments.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchInput placeholder="Search users..." />
          </div>
          <AddUserForm branches={branches} units={units} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-800">Directory ({users.length} Users)</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch & Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center text-sm font-bold mr-3 border border-blue-200 shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200 shadow-sm' : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {user.role === 'SUPERADMIN' && <ShieldAlert className="h-3 w-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.branch?.name || <span className="text-gray-400 italic">No Branch</span>}</div>
                    <div className="text-xs text-blue-600 font-medium">{user.unit?.name || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center">
                      <Link href={`/users/${user.id}/access`} className="text-emerald-600 hover:text-emerald-900 mr-3 flex items-center bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold border border-emerald-200">
                        <KeyRound className="w-3 h-3 mr-1" /> Access
                      </Link>
                      <EditUserButton user={user} branches={branches} units={units} />
                      <DeleteUserButton id={user.id} currentUserId={session.user.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Pagination totalPages={totalPages} />
    </div>
  )
}
