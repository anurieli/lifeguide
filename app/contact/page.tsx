import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact Us | LifeGuide',
  description: 'Get in touch with the LifeGuide team. We\'d love to hear from you!',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white pt-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mb-6">
            Contact Us
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            We&apos;d love to hear from you! Whether you have a question about features, pricing, or just want to share feedback.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 md:p-8">
          <ContactForm />
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            Your privacy is important to us. We&apos;ll never share your information with third parties.
          </p>
        </div>

        <p className="text-gray-400 text-center mt-10">
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    </div>
  );
} 