import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  tenantName?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => authApi.register(data),
    onSuccess: (response) => {
      const { user, tokens } = response.data.data;
      setAuth(user, tokens);
      navigate("/dashboard");
    },
    onError: (error: unknown) => {
      const msg = (
        error as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message;
      setError(msg || "Registration failed");
    },
  });

  const onSubmit = (data: RegisterForm) => {
    setError("");
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A]">
      {/* Left Panel - Architectural Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&q=80"
          alt="Modern architecture"
          className="absolute inset-0 w-full h-full object-cover grayscale-[60%]"
        />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-[#0A0A0A]/40" />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-end p-16">
          <div className="max-w-md">
            <p className="text-xs tracking-[0.3em] text-[#A68B5B] mb-4 uppercase">
              Begin Your Journey
            </p>
            <h2 className="text-4xl font-medium text-white leading-tight tracking-tight mb-6">
              Join the Elite
              <br />
              Circle of Builders
            </h2>
            <div className="w-16 h-px bg-[#A68B5B]" />
          </div>
        </div>
      </div>

      {/* Right Panel - The Vault Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 border border-[#3A3A3A] flex items-center justify-center">
                <span className="text-white font-medium text-lg tracking-tighter">
                  B
                </span>
              </div>
              <span className="text-white font-medium tracking-tight">
                BuildTrack
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-medium text-white tracking-tight mb-4">
              Request Access
            </h1>
            <p className="text-[#718096] text-sm tracking-wide">
              Register for exclusive access to our construction intelligence
              platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Name Field */}
            <div className="group">
              <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-3">
                Full Name
              </label>
              <div className="relative">
                <input
                  {...register("name", { required: "Name is required" })}
                  className="w-full bg-transparent border-0 border-b border-[#3A3A3A] text-white text-lg py-3 px-0 placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors duration-500"
                  placeholder="James Morrison"
                />
                <div className="absolute bottom-0 left-0 w-0 h-px bg-[#A68B5B] group-focus-within:w-full transition-all duration-500" />
              </div>
              {errors.name && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="group">
              <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-3">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  className="w-full bg-transparent border-0 border-b border-[#3A3A3A] text-white text-lg py-3 px-0 placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors duration-500"
                  placeholder="james@morrison-capital.com"
                />
                <div className="absolute bottom-0 left-0 w-0 h-px bg-[#A68B5B] group-focus-within:w-full transition-all duration-500" />
              </div>
              {errors.email && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="group">
              <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-3">
                Create Passphrase
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Minimum 8 characters" },
                  })}
                  className="w-full bg-transparent border-0 border-b border-[#3A3A3A] text-white text-lg py-3 px-0 placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors duration-500"
                  placeholder="••••••••••••"
                />
                <div className="absolute bottom-0 left-0 w-0 h-px bg-[#A68B5B] group-focus-within:w-full transition-all duration-500" />
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Company Field */}
            <div className="group">
              <label className="block text-xs tracking-[0.2em] text-[#718096] uppercase mb-3">
                Organization <span className="text-[#4A5568]">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  {...register("tenantName")}
                  className="w-full bg-transparent border-0 border-b border-[#3A3A3A] text-white text-lg py-3 px-0 placeholder-[#4A5568] focus:outline-none focus:border-[#A68B5B] transition-colors duration-500"
                  placeholder="Morrison Capital Partners"
                />
                <div className="absolute bottom-0 left-0 w-0 h-px bg-[#A68B5B] group-focus-within:w-full transition-all duration-500" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full mt-6 py-4 bg-transparent border border-[#A68B5B] text-[#A68B5B] text-sm font-medium tracking-[0.15em] uppercase hover:bg-[#A68B5B] hover:text-[#0A0A0A] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Request Access</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-12 pt-8 border-t border-[#1A1A1A]">
            <p className="text-sm text-[#4A5568]">
              Already a member?{" "}
              <Link
                to="/login"
                className="text-[#A68B5B] hover:text-white transition-colors duration-300"
              >
                Enter the Residence
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
