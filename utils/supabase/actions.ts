"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

// Helper function to handle redirects with messages
export const redirectWithMessage = (
  path: string,
  type: 'error' | 'success',
  message: string
) => {
  const searchParams = new URLSearchParams();
  searchParams.set(type, message);
  return redirect(`${path}?${searchParams.toString()}`);
};

// Sign up with email and password
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const name = formData.get("name")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || '/dashboard';
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || '';

  if (!name || !email || !password) {
    return redirectWithMessage(
      "/auth/signup",
      "error",
      "First name, email and password are required"
    );
  }

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name || email.split('@')[0]
      },
      emailRedirectTo: `${origin}/auth/callback?returnTo=${redirectTo}`,
    },
  });

  if (error) {
    console.error(`Sign up error: ${error.code} - ${error.message}`);
    return redirectWithMessage("/auth/signup", "error", error.message);
  }

  // If email confirmation is not required, redirect to dashboard
  const identities = data?.user?.identities;
  const emailVerified = identities && 
                       identities.length > 0 && 
                       identities[0].identity_data && 
                       !identities[0].identity_data.email_verified;
                       
  if (data?.user && emailVerified) {
    return redirect(redirectTo);
  }

  return redirectWithMessage(
    "/auth/signup",
    "success",
    "Check your email for a verification link."
  );
};

// Sign in with email and password
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || '/dashboard';
  const supabase = await createClient();

  if (!email || !password) {
    return redirectWithMessage(
      "/auth/login",
      "error",
      "Email and password are required"
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`Sign in error: ${error.code} - ${error.message}`);
    return redirectWithMessage("/auth/login", "error", error.message);
  }

  return redirect(redirectTo);
};

// Get OAuth URL for sign in/sign up
export const getOAuthSignInAction = async (provider: 'google', redirectTo: string = '/dashboard') => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || '';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?returnTo=${redirectTo}`,
      queryParams: {
        prompt: 'select_account', // Force Google to show account selection
        access_type: 'offline' // Request a refresh token
      }
    }
  });

  if (error) {
    console.error(`OAuth error: ${error.code} - ${error.message}`);
    throw new Error(error.message);
  }

  return data.url;
};

// Forgot password
export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin") || '';

  if (!email) {
    return redirectWithMessage("/auth/forgot-password", "error", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?returnTo=/auth/reset-password`,
  });

  if (error) {
    console.error(`Reset password error: ${error.code} - ${error.message}`);
    return redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Could not reset password"
    );
  }

  return redirectWithMessage(
    "/auth/forgot-password",
    "success",
    "Check your email for a link to reset your password."
  );
};

// Reset password
export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!password || !confirmPassword) {
    return redirectWithMessage(
      "/auth/reset-password",
      "error",
      "Password and confirm password are required"
    );
  }

  if (password !== confirmPassword) {
    return redirectWithMessage(
      "/auth/reset-password",
      "error",
      "Passwords do not match"
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error(`Password update error: ${error.code} - ${error.message}`);
    return redirectWithMessage(
      "/auth/reset-password",
      "error",
      "Password update failed"
    );
  }

  return redirectWithMessage(
    "/auth/reset-password", 
    "success", 
    "Password updated successfully"
  );
};

// Sign out
export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/");
};

 