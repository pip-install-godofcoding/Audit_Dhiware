import React, { useState } from "react";
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";


export default function AdminUsersPage() {

  const [users, setUsers] = useState([
    {
      id: "1",
      name: "Ganavi MC",
      email: "ganavi@example.com",
      role: "admin",
      status: "active",
      lastActive: "2 mins ago",
    },
    {
      id: "2",
      name: "Madhura Hegde",
      email: "madhura@example.com",
      role: "auditor",
      status: "active",
      lastActive: "10 mins ago",
    },
    {
      id: "3",
      name: "Rahul Kumar",
      email: "rahul@example.com",
      role: "user",
      status: "inactive",
      lastActive: "2 days ago",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "user",
  });

  const getRoleBadge = (role: string) => {

    if (role === "admin") {
      return (
        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
          Admin
        </span>
      );
    }

    if (role === "auditor") {
      return (
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
          Auditor
        </span>
      );
    }

    return (
      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
        User
      </span>
    );
  };

  const getStatusBadge = (status: string) => {

    if (status === "active") {
      return (
        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
          Active
        </span>
      );
    }

    return (
      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">
        Inactive
      </span>
    );
  };

  const handleAddUser = () => {

    const user = {
      id: Date.now().toString(),
      ...newUser,
      status: "active",
      lastActive: "Just now",
    };

    setUsers((prev) => [...prev, user]);

    setNewUser({
      name: "",
      email: "",
      role: "user",
    });

    setIsModalOpen(false);
  };

  const toggleUserStatus = (id: string) => {

    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "active"
                  ? "inactive"
                  : "active",
            }
          : user
      )
    );
  };

  return (
    
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              User Management
            </h1>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Manage users, roles, and platform access.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>

        </div>

        {/* USERS TABLE */}
        <Card className="bg-white rounded-2xl overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr className="text-left">

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    User
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Role
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Last Active
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {users.map((user) => (

                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >

                    <td className="px-6 py-4">

                      <div className="flex items-center gap-3">

                        <div className="bg-indigo-100 p-2 rounded-full">
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>

                        <div>

                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            {user.email}
                          </div>

                        </div>

                      </div>

                    </td>

                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.lastActive}
                    </td>

                    <td className="px-6 py-4">

                      <Button
                        variant="outline"
                        size="sm"
                        className={
                          user.status === "active"
                            ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                            : "bg-white text-green-600 border border-green-200 hover:bg-green-50"
                        }
                        onClick={() => toggleUserStatus(user.id)}
                      >
                        {user.status === "active" ? (
                          <>
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </Card>

        {/* PLATFORM INFO */}
        <Card className="mt-6 p-5 bg-white rounded-2xl">

          <div className="flex items-start gap-4">

            <div className="bg-indigo-100 p-3 rounded-full">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>

            <div>

              <h3 className="font-semibold text-gray-900">
                Role-Based Access Control
              </h3>

              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Platform access is controlled using RBAC policies.
                Admins manage users and settings, auditors conduct
                audit workflows, and users upload/manage evidence.
              </p>

            </div>

          </div>

        </Card>

        {/* ADD USER MODAL */}
        {isModalOpen && (

          <Modal
            isOpen={isModalOpen}
            title="Add New User"
            onClose={() => setIsModalOpen(false)}
          >

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Name
                </label>

                <Input
                  value={newUser.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser({
                      ...newUser,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter full name"
                  className="bg-white"
                />

              </div>

              <div>

                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Email
                </label>

                <Input
                  value={newUser.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser({
                      ...newUser,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter email"
                  className="bg-white"
                />

              </div>

              <div>

                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Role
                </label>

                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
                >
                  <option value="user">User</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Admin</option>
                </select>

              </div>

              <Button
                onClick={handleAddUser}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add User
              </Button>

            </div>

          </Modal>

        )}

      </div>
    </div>
    
  );
}