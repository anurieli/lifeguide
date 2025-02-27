export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 mt-16">
      <h1 className="text-3xl font-bold mb-8 text-white">Terms of Service</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
          <p className="text-white/90">
            By accessing and using Lifegaid, you accept and agree to be bound by the terms and 
            provisions of this agreement. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Description of Service</h2>
          <p className="text-white/90">
            Lifegaid provides a personal development guide and tools to help users organize their life, 
            sharpen their mindset, and achieve their goals. The service includes interactive content, 
            downloadable materials, and progress tracking features.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">3. User Responsibilities</h2>
          <ul className="list-disc pl-6 text-white/90 space-y-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Not misuse or abuse the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">4. Intellectual Property</h2>
          <p className="text-white/90">
            All content, features, and functionality of Lifegaid, including but not limited to text, 
            graphics, logos, and software, are the exclusive property of Lifegaid and are protected 
            by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">5. Limitation of Liability</h2>
          <p className="text-white/90">
            Lifegaid and its affiliates shall not be liable for any indirect, incidental, special, 
            consequential, or punitive damages, including without limitation, loss of profits, data, 
            use, goodwill, or other intangible losses.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">6. Modifications to Service</h2>
          <p className="text-white/90">
            We reserve the right to modify or discontinue, temporarily or permanently, the service 
            with or without notice. We shall not be liable to you or any third party for any 
            modification, suspension, or discontinuance of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">7. Termination</h2>
          <p className="text-white/90">
            We may terminate or suspend your access to the service immediately, without prior notice 
            or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">8. Contact Information</h2>
          <p className="text-white/90">
            If you have any questions about these Terms, please{' '}
            <a href="/contact" className="text-blue-400 hover:underline">
              contact us
            </a>.
          </p>
        </section>

        <p className="text-sm text-white/70 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
} 