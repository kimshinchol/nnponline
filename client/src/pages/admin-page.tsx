import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserManagement } from "@/components/user-management";
import { Link } from "wouter";
import { HomeIcon } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <HomeIcon className="h-4 w-4" />
            Return to Overview
          </Button>
        </Link>
      </div>

      {/* User Management Section */}
      <UserManagement />

      {/* System Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Information about the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-lg">Application</h3>
                <p className="text-sm text-muted-foreground mt-1">작업일지 관리 시스템</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-lg">Version</h3>
                <p className="text-sm text-muted-foreground mt-1">1.0.0</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-lg">Last Updated</h3>
                <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-lg">Status</h3>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}