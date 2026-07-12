/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow tunneled dev origins (ngrok, and the tailnet via `tailscale serve`) so the
  // phone/QR handoff can reach the dev server without Next blocking cross-origin dev
  // requests. Dev-only; no prod effect.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.trycloudflare.com", "*.ts.net"],
};

export default nextConfig;
