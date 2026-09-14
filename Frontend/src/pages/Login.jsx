import React, { useState } from "react";
import { Mail, Lock, LogIn, Zap, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCurrentUser } from "../redux/slices/user/userSlice";
import { setPermissions } from "../redux/slices/permissions/permissionSlice"; // Redux Permission Action
import { loginUser } from "../lib/authAPI";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    loginId: "",
    password: "",
  });
  const redirectPath = localStorage.getItem("redirectAfterLogin");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await loginUser(formData);
      setIsLoading(false);
      // --- INSIDE Login.jsx handleSubmit ---
      if (res?.data?.success) {
        toast.success(res.data.message || "Login successful");

        dispatch(setCurrentUser(res.data.user));

        // Store session metadata in cookies
        Cookies.set("isLoggedIn", "true", { path: "/" });
        Cookies.set("name", res.data.user?.name || "", { path: "/" });
        Cookies.set("email", res.data.user?.email || "", { path: "/" });
        Cookies.set("empCode", res.data.user?.employeeCode || "", {
          path: "/",
        });

        const userRole =
          typeof res.data.role === "string"
            ? res.data.role
            : res.data.user?.role?.displayName ||
              res.data.user?.role?.name ||
              "Employee";

        Cookies.set("role", userRole, { path: "/" });
        Cookies.set("token", res.data.accessToken || "", { path: "/" });
        Cookies.set("userId", res.data.user?._id || "", { path: "/" });
        Cookies.set(
          "departmentName",
          JSON.stringify(res.data.user?.department || []),
          { path: "/" },
        );

        // Dispatches permissions directly to Redux store
        dispatch(
          setPermissions({
            permissions: res.data?.permissions || [],
            isSuper: userRole.toLowerCase().includes("super"),
          }),
        );

        if (redirectPath) {
          navigate(redirectPath);
          localStorage.removeItem("redirectAfterLogin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      setIsLoading(false);
      if (err?.response) {
        if (err.response.status === 403) {
          toast.error(
            err.response.data?.message ||
              "Your account is inactive. Please contact administrator.",
          );
        } else if (err.response.status === 401) {
          toast.error("Incorrect email/mobile or password");
        } else if (err.response.status === 400) {
          toast.error(
            err.response.data?.message ||
              "Please provide valid email/mobile and password",
          );
        } else {
          toast.error(err.response.data?.message || "Something went wrong");
        }
      } else {
        toast.error("Network error. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 font-sans">
      <div className="w-full max-w-[480px] bg-white border border-gray-200 shadow-2xl rounded-2xl p-6 transition-all duration-500 hover:shadow-indigo-500/60 hover:ring-4 hover:ring-indigo-100">
        {/* Header Section */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-sm opacity-30 -z-10"></div>
            </div>
            <h1 className="text-2xl pl-2 font-extrabold text-gray-900 tracking-tight">
              Dothis2_2.0
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Securely access your account.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email Input */}
          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Email Address or Mobile
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <input
                id="loginId"
                type="text"
                placeholder="Enter email or mobile"
                value={formData.loginId}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 focus:border-indigo-500 transition duration-200 ease-in-out shadow-inner"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Password
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-300/50 focus:border-indigo-500 transition duration-200 ease-in-out shadow-inner"
              />

              <div
                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {/* Submission Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-sm font-bold text-white shadow-xl transition duration-300 ease-in-out transform cursor-pointer
              ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed opacity-75 shadow-lg"
                  : "bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-purple-300/60"
              }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="w-5 h-5 mr-2" />
                Sign In Securely
              </span>
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="text-center mt-6">
          <Link
            to="/reset-password"
            className="group inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-600 text-sm font-semibold rounded-xl shadow-md hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-indigo-200"
          >
            <Key className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
