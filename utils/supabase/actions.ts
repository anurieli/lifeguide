"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

// Helper function to handle redirects with messages
export const redirectWithMessage = async (
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return redirectWithMessage(
      "/auth/signup",
      "error",
      "Please enter a valid email address"
    );
  }

  // Validate password strength
  if (password.length < 8) {
    return redirectWithMessage(
      "/auth/signup",
      "error",
      "Password must be at least 8 characters long"
    );
  }

  try {
    console.log(`[signUpAction] Attempting to sign up user: ${email}`);
    
    // First, try to sign in with the provided credentials
    // This will help us determine if this is an existing account
    console.log(`[signUpAction] Checking if user already exists: ${email}`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If sign in succeeds, the user already exists with email/password
    if (signInData?.user) {
      console.log(`[signUpAction] User already exists with email/password: ${email}`);
      return redirect(redirectTo); // Redirect to dashboard
    }
    
    // Check if the user exists but with OAuth (no password)
    // Try to sign in with OTP to see if the email exists
    if (signInError) {
      console.log(`[signUpAction] Sign in failed, checking if user exists with OAuth: ${email}`);
      
      // Send a magic link to check if the email exists
      const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Only send OTP if user exists
        }
      });
      
      // If OTP was sent successfully, the user exists but with OAuth
      if (!otpError && otpData) {
        console.log(`[signUpAction] User exists with OAuth, attempting to log in and add password: ${email}`);
        
        // Sign in the user with OAuth
        const { data: oauthSignInData, error: oauthSignInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false, // Ensure not to create a new user
          }
        });
        
        if (!oauthSignInError && oauthSignInData) {
          // Use updateUser to set the password for the existing OAuth account
          const { error: updateError } = await supabase.auth.updateUser({
            password,
          });
          
          if (!updateError) {
            console.log(`[signUpAction] Successfully updated OAuth user with password: ${email}`);
            
            // Update user profile
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (!userError && userData.user) {
              const fullName = userData.user.user_metadata?.name || name || '';
              const firstName = fullName ? fullName.split(' ')[0] : email.split('@')[0];
              
              await supabase.from('profiles').upsert({
                id: userData.user.id,
                display_name: firstName,
                full_name: fullName,
                avatar_url: userData.user.user_metadata?.avatar_url || null,
              });
              
              return redirect(redirectTo);
            }
          } else {
            console.error(`[signUpAction] Failed to update OAuth user with password: ${updateError.message}`);
            return redirectWithMessage(
              "/auth/signup",
              "error",
              "Failed to link password to your account. Please try again."
            );
          }
        } else {
          console.error(`[signUpAction] Failed to sign in OAuth user: ${oauthSignInError.message}`);
          return redirectWithMessage(
            "/auth/signup",
            "error",
            "Failed to authenticate your account. Please try again. Try signing in with Google."
          );
        }
      }
    }
    
    // If we get here, the user doesn't exist, so create a new account
    console.log(`[signUpAction] Creating new user: ${email}`);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?returnTo=${redirectTo}`,
        data: { name },
      },
    });

    // Update profile if user was created successfully
    if (!error && data.user) {
      console.log(`[signUpAction] User created successfully, updating profile: ${email}`);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        const fullName = userData.user.user_metadata?.name || name || '';
        const firstName = fullName ? fullName.split(' ')[0] : email.split('@')[0];
        await supabase.from('profiles').upsert({
          id: userData.user.id,
          display_name: firstName,
          full_name: fullName,
          avatar_url: null,
        });
      }
    }

    if (error) {
      console.error(`[signUpAction] Sign up error: ${error.code} - ${error.message}`);
      
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return redirectWithMessage(
          "/auth/login",
          "error",
          "This email is already registered. Please sign in instead."
        );
      }
      
      return redirectWithMessage("/auth/signup", "error", error.message);
    }

    console.log(`[signUpAction] Sign up successful for: ${email}`);
    console.log(`[signUpAction] User data:`, data?.user);
    
    // Check if email confirmation is required
    if (data?.user && !data?.session) {
      console.log(`[signUpAction] Email confirmation required for: ${email}`);
      return redirectWithMessage(
        "/auth/signup",
        "success",
        "Check your email for a verification link to complete your registration."
      );
    } else if (data?.user && data?.session) {
      // User is immediately signed in (email confirmation disabled)
      console.log(`[signUpAction] User immediately signed in: ${email}`);
      return redirect(redirectTo);
    } else {
      // Fallback for unexpected cases
      console.error(`[signUpAction] Unexpected response:`, data);
      return redirectWithMessage(
        "/auth/signup",
        "success",
        "Your account has been created. Please check your email if verification is required."
      );
    }
  } catch (err) {
    console.error(`[signUpAction] Unexpected error during sign up:`, err);
    return redirectWithMessage(
      "/auth/signup",
      "error",
      "An unexpected error occurred. Please try again."
    );
  }
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

  console.log(`[signInAction] Attempting to sign in user: ${email}`);
  
  // First, try to get the current session to check if we're already logged in
  const { data: { session: existingSession } } = await supabase.auth.getSession();
  if (existingSession) {
    console.log(`[signInAction] User already has a session, clearing it first`);
    await supabase.auth.signOut({ scope: 'local' });
  }

  // Now sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`[signInAction] Sign in error: ${error.code} - ${error.message}`);
    return redirectWithMessage("/auth/login", "error", "Incorrect email or password");
  }
  
  console.log(`[signInAction] Sign in successful, session:`, data.session ? 'Session created' : 'No session');

  // Add auth_transition parameter to help middleware handle the transition
  const redirectUrl = new URL(redirectTo, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  redirectUrl.searchParams.set('auth_transition', 'true');
  redirectUrl.searchParams.set('timestamp', Date.now().toString());
  
  console.log(`[signInAction] Redirecting to: ${redirectUrl.toString()}`);
  return redirect(redirectUrl.toString());
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
  try {
    console.log('[signOutAction] Starting sign out process');
    const supabase = await createClient();
    
    // Sign out with scope: 'global' to sign out from all devices
    const { error } = await supabase.auth.signOut({ 
      scope: 'global' 
    });
    
    if (error) {
      console.error('[signOutAction] Error signing out:', error);
      throw error;
    }
    
    console.log('[signOutAction] Successfully signed out, redirecting to home');
    
    // Add a timestamp to ensure the browser doesn't cache the redirect
    const timestamp = Date.now();
    console.log('[signOutAction] Current timestamp:', timestamp);
    
    // The ?refresh=true parameter will be detected by middleware to handle special cookie clearing
    // We need to ensure the middleware sees and processes this parameter
    const redirectUrl = `/?refresh=true&timestamp=${timestamp}`;
    console.log('[signOutAction] Redirect URL:', redirectUrl);
    
    // Use redirect from next/navigation to perform a server-side redirect
    return redirect(redirectUrl);
  } catch (err) {
    console.error('[signOutAction] Unexpected error during sign out:', err);
    // Still redirect to home even if there's an error, but with an error parameter
    return redirect(`/?error=signout_failed&timestamp=${Date.now()}`);
  }
};

 