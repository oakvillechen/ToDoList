"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if we have a valid session from the email link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError("Invalid or expired reset link. Please request a new one.");
            }
        });
    }, []);

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setMessage("Password updated successfully! Redirecting...");
            setTimeout(() => {
                router.push("/");
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-violet-100 to-pink-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl bg-white/80 backdrop-blur border border-white/70 shadow-lg px-6 py-8">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                        Reset Password
                    </h1>
                    <p className="text-sm text-slate-600 mb-6 text-center">
                        Enter your new password below
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
                            {message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                placeholder="Enter new password"
                                className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading || !!message}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none ring-2 ring-transparent focus:border-sky-400 focus:ring-sky-100"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUpdatePassword()}
                                disabled={loading || !!message}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleUpdatePassword}
                            disabled={
                                loading ||
                                !newPassword.trim() ||
                                !confirmPassword.trim() ||
                                !!message
                            }
                            className="w-full rounded-full bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/")}
                            className="w-full text-sm text-slate-600 hover:text-slate-700 text-center"
                        >
                            Back to home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
