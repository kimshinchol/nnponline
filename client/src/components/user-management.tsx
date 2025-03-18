import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function UserManagement() {
  const { toast } = useToast();

  // Fetch pending users
  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/pending"],
  });

  // Fetch approved users
  const { data: approvedUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users/approved"],
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/approved"] });
      toast({
        title: "User approved",
        description: "The user can now log in to the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/approved"] });
      toast({
        title: "User deleted",
        description: "The user has been removed from the system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (userId: number) => {
    approveMutation.mutate(userId);
  };

  const handleDelete = (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Users Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending User Approvals</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge>{user.team}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleApprove(user.id)}
                    disabled={approveMutation.isPending}
                  >
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pendingUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No pending approvals
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approved Users Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Approved Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge>{user.team}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isAdmin ? "destructive" : "default"}>
                    {user.isAdmin ? "Admin" : "User"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(user.id)}
                    disabled={deleteMutation.isPending || user.isAdmin}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {approvedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No approved users
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}