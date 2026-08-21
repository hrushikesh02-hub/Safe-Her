import { createFileRoute } from "@tanstack/react-router";
import { Search, Ban, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { useState,useEffect } from "react";
import {
  getAllUsers,
  deleteUser,toggleUserStatus
} from "@/services/adminService";
import { toast } from "sonner";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Route = createFileRoute("/admin/users")({ component: UserMgmt });

function UserMgmt() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
  loadUsers();
}, []);

async function loadUsers() {
  try {
    const response = await getAllUsers();

    setUsers(response.data.data);
  } catch (error) {
    console.error(error);
    toast.error("Failed to load users");
  }
}

async function handleDelete(id: string) {
  const ok = window.confirm(
    "Are you sure you want to delete this user?"
  );

  if (!ok) return;

  try {
    await deleteUser(id);

    toast.success("User Deleted");

    loadUsers();
  } catch (error: any) {
    toast.error(
      error.response?.data?.message || "Delete Failed"
    );
  }
}

async function handleSuspend(user: any) {
  const ok = window.confirm(
  user.isBlocked
    ? "Activate this user?"
    : "Suspend this user?"
);

if (!ok) return;
  try {
    await toggleUserStatus(user._id);

    toast.success("User status updated");

    loadUsers();
  } catch (error: any) {
    toast.error(
      error.response?.data?.message ||
        "Failed to update user"
    );
  }
}
  const rows = users.filter(u => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <PageHeader title="User management" desc="Search, suspend or remove platform users." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

  <StatCard
    label="Total Users"
    value={users.length.toString()}
    icon={<Users className="size-4" />}
  />

  <StatCard
    label="Active Users"
    value={users.filter(u => !u.isBlocked).length.toString()}
    icon={<UserCheck className="size-4" />}
    tone="success"
  />

  <StatCard
    label="Blocked Users"
    value={users.filter(u => u.isBlocked).length.toString()}
    icon={<UserX className="size-4" />}
    tone="warning"
  />

  <StatCard
    label="New This Month"
    value={
      users.filter(u => {
        const d = new Date(u.createdAt);
        const now = new Date();
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }).length.toString()
    }
    icon={<UserPlus className="size-4" />}
  />

</div>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name or email" className="pl-9" />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-4">User ID</th><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Joined</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(u => (
              <tr key={u._id} className="hover:bg-muted/30">
                <td className="p-4 font-mono text-xs">{u._id.slice(-6)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={u.profileImage}
                      name={u.name}
                      role={u.role || "user"}
                      size="sm"
                    />
                    <div>
                      <div className="font-semibold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{u.role || "user"}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{u.email}</td>
                <td className="p-4">
  {u.isBlocked ? (
    <span className="text-red-600 font-semibold">
      Blocked
    </span>
  ) : (
    <span className="text-green-600 font-semibold">
      Active
    </span>
  )}
</td>
                <td className="p-4">
  {new Date(u.createdAt).toLocaleDateString()}
</td>
                <td className="p-4"><div className="flex gap-1">
                  <Button
  size="icon"
  variant="ghost"
  aria-label="Suspend"
  onClick={() => handleSuspend(u)}
>
  <Ban
    className={`size-4 ${
      u.isBlocked
        ? "text-green-600"
        : "text-warning"
    }`}
  />
</Button>
                  <Button
  size="icon"
  variant="ghost"
  aria-label="Delete"
  onClick={() => handleDelete(u._id)}
>
  <Trash2 className="size-4 text-emergency" />
</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between border-t p-4 text-sm text-muted-foreground">

<span>

Total Records : {rows.length}

</span>

<span>

Showing {rows.length} users

</span>

</div>
      </div>
    </div>
  );
}