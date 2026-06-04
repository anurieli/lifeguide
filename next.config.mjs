/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow tunneled dev origins (e.g. ngrok) so the phone/QR handoff can reach the
  // dev server without Next blocking cross-origin dev requests. Dev-only; no prod effect.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.trycloudflare.com"],
};

export default nextConfig;
