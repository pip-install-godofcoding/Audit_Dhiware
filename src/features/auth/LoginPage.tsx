import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";

import { Input } from "../../components/ui/Input";
import Checkbox from "../../components/ui/Checkbox";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

import { mockLogin } from "../../api/mock";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await mockLogin(email, password);

      login(response.user, response.token);

      if (response.user.role === "admin") {
        navigate("/admin/users");
      } else if (response.user.role === "auditor") {
        navigate("/auditor/setup");
      } else {
        navigate("/user/upload");
      }

    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      
      <Card className="w-full max-w-md p-8 shadow-lg rounded-2xl">
        
        <div className="flex flex-col items-center mb-6">
          <div className="bg-indigo-100 p-3 rounded-full mb-3">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            AI Assisted Audit System
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email
            </label>

            <Input
              type="email"
              className="bg-white text-black border-gray-300 focus:border-indigo-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Password
            </label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                className="bg-white text-black border-gray-300 focus:border-indigo-500"
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />

              <label
                htmlFor="remember"
                className="text-sm text-gray-600 cursor-pointer"
              >
                Remember me
              </label>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            isLoading={isLoading}
          >
            Sign In
          </Button>

        </form>

      </Card>
    </div>
  );
}