import React from "react"; // Removed useState
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import useAuthStore from "../stores/authStore";
import { toast } from "react-toastify";

// --- 1. IMPORT THE HOOKS AND SCHEMA ---
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

// --- 2. DEFINE THE VALIDATION SCHEMA ---
const registerSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"),
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters long")
    .required("Password is required"),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  // --- 3. INITIALIZE REACT HOOK FORM ---
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(registerSchema),
  });

  // --- 4. UPDATE THE SUBMISSION HANDLER ---
  // It now receives form 'data' directly. No need for e.preventDefault().
  const onSubmit = async (data) => {
    try {
      const response = await API.post("/auth/register", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      navigate("/");
      toast.success(`Welcome, ${response.data.user.username}!`);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Registration failed. Please try again.";
      // Use setError from the hook to display server-side errors
      setError("root.serverError", { type: "custom", message: errorMessage });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join our community of creators!
          </p>
        </div>

        {/* --- 5. CONNECT THE FORM --- */}
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {errors.root?.serverError && (
            <p className="p-3 text-sm font-semibold text-red-800 bg-red-100 rounded-md">
              {errors.root.serverError.message}
            </p>
          )}

          <div>
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              Username
            </label>
            {/* --- 6. "REGISTER" THE INPUT --- */}
            <input
              id="username"
              type="text"
              {...register("username")}
              className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.username ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Your cool username"
            />
            {/* --- 7. DISPLAY THE ERROR MESSAGE --- */}
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className={`w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Up
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
