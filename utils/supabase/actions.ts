"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { cookies } from "next/headers";

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
    
    // Check if a user with this email already exists
    // First, try to sign in with the provided credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If sign in succeeds, the user already exists with email/password
    if (signInData?.user) {
      console.log(`[signUpAction] User already exists with email/password: ${email}`);
      return redirect(redirectTo); // Redirect to dashboard
    }
    
    // If sign in fails, check if the user exists with a different password
    if (signInError) {
      console.log(`[signUpAction] Sign in failed, checking if user exists: ${email}`);
      
      // Check if the user exists by using the check_user_exists function
      try {
        const { data, error: rpcError } = await supabase.rpc('check_user_exists', { 
          email_to_check: email 
        });
        
        if (!rpcError && data && data.length > 0 && data[0].user_exists === true) {
          // User exists - redirect back to signup page with parameters to show dialog
          console.log(`[signUpAction] User exists (via RPC): ${email}, name: ${data[0].user_name}`);
          
          // Store user info in query params for the dialog
          const searchParams = new URLSearchParams();
          searchParams.set('userExists', 'true');
          searchParams.set('email', email);
          searchParams.set('name', data[0].user_name || email.split('@')[0]);
          
          // Redirect back to signup page with dialog parameters
          return redirect(`/auth/signup?${searchParams.toString()}`);
        }
      } catch (checkError) {
        // Only log the error if it's not a NEXT_REDIRECT error
        if (!(checkError instanceof Error && checkError.message === 'NEXT_REDIRECT')) {
          console.error(`[signUpAction] Error checking user existence via RPC:`, checkError);
        } else {
          // If it's a NEXT_REDIRECT error, just rethrow it to allow the redirect to happen
          throw checkError;
        }
      }
      
      // Second approach: Try to sign up with the email to see if it's already registered
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: 'TemporaryPassword123!', // Temporary password just to check if user exists
        options: {
          emailRedirectTo: `${origin}/auth/callback?returnTo=${redirectTo}`,
        },
      });
      
      if (signUpError) {
        console.log(`[signUpAction] Sign up check error: ${signUpError.message}`);
        
        if (signUpError.message.includes('already registered')) {
          // User exists - redirect back to signup page with parameters to show dialog
          console.log(`[signUpAction] User exists with email: ${email}`);
          
          // Store user info in query params for the dialog
          const searchParams = new URLSearchParams();
          searchParams.set('userExists', 'true');
          searchParams.set('email', email);
          searchParams.set('name', name || email.split('@')[0]); // Use name if provided, otherwise email prefix
          
          // Redirect back to signup page with dialog parameters
          return redirect(`/auth/signup?${searchParams.toString()}`);
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
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        // User exists - redirect back to signup page with parameters to show dialog
        console.log(`[signUpAction] User exists with email (from error): ${email}`);
        
        // Store user info in query params for the dialog
        const searchParams = new URLSearchParams();
        searchParams.set('userExists', 'true');
        searchParams.set('email', email);
        searchParams.set('name', name || email.split('@')[0]); // Use name if provided, otherwise email prefix
        
        // Redirect back to signup page with dialog parameters
        return redirect(`/auth/signup?${searchParams.toString()}`);
      }
      
      return redirectWithMessage("/auth/signup", "error", error.message);
    }

    console.log(`[signUpAction] Sign up successful for: ${email}`);
    
    // User is immediately signed in (email confirmation disabled)
    if (data?.user && data?.session) {
      console.log(`[signUpAction] User immediately signed in: ${email}`);
      return redirect(redirectTo);
    } else {
      // Redirect to dashboard even if session is not immediately available
      // This removes the email confirmation message
      console.log(`[signUpAction] Redirecting to dashboard without waiting for session`);
      return redirect(redirectTo);
    }
  } catch (err) {
    // Only handle non-redirect errors
    if (!(err instanceof Error && err.message === 'NEXT_REDIRECT')) {
      console.error(`[signUpAction] Unexpected error during sign up:`, err);
      return redirectWithMessage(
        "/auth/signup",
        "error",
        "An unexpected error occurred. Please try again."
      );
    }
    
    // If it's a redirect error, rethrow it to allow the redirect to happen
    throw err;
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
    return redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Email is required"
    );
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
    });

    if (error) {
      console.error('Reset password error:', error);
      
      // Handle different error types
      switch (error.status) {
        case 429:
          return redirectWithMessage(
            "/auth/forgot-password",
            "error",
            "Too many reset attempts. Please wait a few minutes before trying again."
          );
        case 500:
          return redirectWithMessage(
            "/auth/forgot-password",
            "error",
            "Unable to send reset email. Please try again later or contact support if the problem persists."
          );
        case 400:
          return redirectWithMessage(
            "/auth/forgot-password",
            "error",
            "Invalid email address. Please check and try again."
          );
        default:
          if (error.message.includes('rate limit')) {
            return redirectWithMessage(
              "/auth/forgot-password",
              "error",
              "Too many reset attempts. Please wait a few minutes before trying again."
            );
          }
          return redirectWithMessage(
            "/auth/forgot-password",
            "error",
            `Could not reset password: ${error.message}`
          );
      }
    }

    return redirectWithMessage(
      "/auth/forgot-password",
      "success",
      "Check your email for a password reset link. Could take a few minutes to receive."
    );
  } catch (err) {
    console.error('Reset password error:', err);
    return redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "An unexpected error occurred. Please try again later."
    );
  }
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

export const updateExistingUserPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || '/auth/login';
  const supabase = await createClient();

  if (!email || !password) {
    return redirectWithMessage(
      "/auth/user-exists",
      "error",
      "Email and password are required"
    );
  }

  try {
    console.log(`[updateExistingUserPasswordAction] Attempting to update password for: ${email}`);
    
    // Send a password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${(await headers()).get("origin") || ''}/auth/callback?next=${redirectTo}&type=recovery`,
    });
    
    if (error) {
      console.error(`[updateExistingUserPasswordAction] Error sending reset email: ${error.message}`);
      return redirectWithMessage(
        "/auth/user-exists",
        "error",
        `Failed to send password reset email: ${error.message}`
      );
    }
    
    // Store the new password in a secure cookie or session to be used when the user clicks the reset link
    // This is a simplified approach - in a production app, you might want to use a more secure method
    const cookieStore = await cookies();
    cookieStore.set('pending_password', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });
    
    return redirectWithMessage(
      "/auth/login",
      "success",
      "Check your email for a password reset link. Could take a few minutes to receive."
    );
  } catch (err) {
    console.error(`[updateExistingUserPasswordAction] Unexpected error:`, err);
    return redirectWithMessage(
      "/auth/user-exists",
      "error",
      "An unexpected error occurred. Please try again."
    );
  }
};

 