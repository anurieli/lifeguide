export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 mt-16">
      <h1 className="text-3xl font-bold mb-8 text-white">Privacy Policy</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
          <p className="text-white/90">
            At Lifegaid, we take your privacy seriously. This Privacy Policy explains how we collect, 
            use, and protect your personal information when you use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Information We Collect</h2>
          <ul className="list-disc pl-6 text-white/90 space-y-2">
            <li>Account information (email, name)</li>
            <li>Guide responses and personal development data</li>
            <li>Usage data and analytics</li>
            <li>Device and browser information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-white/90 space-y-2">
            <li>To provide and improve our services</li>
            <li>To personalize your experience</li>
            <li>To communicate with you about updates and changes</li>
            <li>To ensure the security of our platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Data Security</h2>
          <p className="text-white/90">
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the internet is 100% secure, and we cannot 
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Your Rights</h2>
          <ul className="list-disc pl-6 text-white/90 space-y-2">
            <li>Access your personal data</li>
            <li>Request corrections to your data</li>
            <li>Request deletion of your data</li>
            <li>Opt-out of marketing communications</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
          <p className="text-white/90">
            If you have any questions about this Privacy Policy, please{' '}
            <a href="/contact" className="text-blue-400 hover:underline">
              contact us
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Changes to This Policy</h2>
          <p className="text-white/90">
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by posting the new Privacy Policy on this page and updating the &ldquo;last updated&rdquo; date.
          </p>
        </section>

        <p className="text-sm text-white/70 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
} 