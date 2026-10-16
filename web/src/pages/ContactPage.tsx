import React, { useState } from 'react';
import {
  Mail,
  Clock,
  ShieldCheck,
  Send,
  CheckCircle2,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { SEO } from '@/components/common/SEO';
import { buildBreadcrumbSchema } from '@/lib/seo-schemas';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'support',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setSubmitting(true);
    // Simulate instantaneous smooth submission
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="py-10 md:py-16">
      <SEO
        title="Contact Us & Listener Opportunities — Accompany"
        description="Get in touch with Accompany for 24/7 support, account help, safety concerns, or apply to become a verified companion listener and earn by helping others."
        canonicalUrl="/contact"
        ogType="website"
        keywords={[
          'contact accompany',
          'listener jobs',
          'become a companion',
          'emotional support helpdesk',
          'grievance officer accompany',
        ]}
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Contact', url: '/contact' },
          ]),
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDE4ED] text-[#C7377A] text-xs font-semibold mb-4">
            <Mail className="w-3.5 h-3.5" />
            <span>We are always here for you</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] mb-4">
            Get in Touch with Accompany
          </h1>
          <p className="text-base text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
            Whether you have a question about our platform, need help with your account, or wish to apply as a verified companion, we would love to hear from you.
          </p>
        </div>

        {/* 2-Column Grid: Form + Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Form (7 cols) */}
          <div className="lg:col-span-7 bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] p-6 sm:p-10 shadow-xs">
            {submitted ? (
              <div className="text-center py-12 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                  Message Sent Successfully
                </h3>
                <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] max-w-md mx-auto mb-6">
                  Thank you for reaching out, {formData.name}. Our team has received your inquiry and will reply to <span className="font-semibold text-[#1C1916] dark:text-[#F3EEE6]">{formData.email}</span> within 2 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({ name: '', email: '', topic: 'support', message: '' });
                  }}
                  className="px-5 py-2.5 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] text-xs font-semibold hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-colors cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">
                    Send Us a Message
                  </h3>
                  <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                    Fill out the details below and we will get back to you promptly.
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                    Your Name / Pseudonym
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-sm text-[#1C1916] dark:text-[#F3EEE6] placeholder-[#5E574F]/60 focus:outline-none focus:ring-2 focus:ring-[#C7377A]/40 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-sm text-[#1C1916] dark:text-[#F3EEE6] placeholder-[#5E574F]/60 focus:outline-none focus:ring-2 focus:ring-[#C7377A]/40 transition-all"
                  />
                </div>

                {/* Subject Topic */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                    Inquiry Topic
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-sm text-[#1C1916] dark:text-[#F3EEE6] focus:outline-none focus:ring-2 focus:ring-[#C7377A]/40 transition-all cursor-pointer"
                  >
                    <option value="support">App Support & Help</option>
                    <option value="companion">Apply to Become a Companion / Listener</option>
                    <option value="coins">Account, Wallet & Coins Query</option>
                    <option value="safety">Safety, Confidentiality or Grievance</option>
                    <option value="partnership">Partnerships & Media</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                    Your Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us what's on your mind..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-sm text-[#1C1916] dark:text-[#F3EEE6] placeholder-[#5E574F]/60 focus:outline-none focus:ring-2 focus:ring-[#C7377A]/40 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#C7377A] hover:bg-[#A62965] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Info Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Contact Info */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] p-6 sm:p-8 shadow-xs">
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-5">
                Direct Contact
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3] block">
                      Email Support
                    </span>
                    <a
                      href="mailto:support@accompanyapp.in"
                      className="text-sm font-semibold text-[#1C1916] dark:text-[#F3EEE6] hover:text-[#C7377A] transition-colors"
                    >
                      support@accompanyapp.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3] block">
                      Response SLA
                    </span>
                    <span className="text-sm font-semibold text-[#1C1916] dark:text-[#F3EEE6]">
                      Under 2 Hours (24/7 Monitoring)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3] block">
                      Grievance & Privacy Officer
                    </span>
                    <span className="text-sm font-semibold text-[#1C1916] dark:text-[#F3EEE6]">
                      grievance@accompanyapp.in
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listener Recruitment Highlight Card */}
            <div className="bg-gradient-to-br from-[#FDE4ED]/80 via-[#FFFCF8] to-[#F7F4EF] dark:from-[#26131E] dark:via-[#1C1A17] dark:to-[#12110F] rounded-3xl border border-[#C7377A]/30 p-6 sm:p-8 shadow-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C7377A]/15 text-[#C7377A] text-[11px] font-bold mb-3">
                <Headphones className="w-3.5 h-3.5" />
                <span>Listener Opportunities</span>
              </div>

              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                Want to Become a Verified Companion?
              </h3>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed mb-4">
                We are constantly welcoming kind, patient, and empathetic individuals to join our companion community:
              </p>

              <ul className="space-y-2 text-xs text-[#1C1916] dark:text-[#F3EEE6] mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7377A]" />
                  <span>Work flexible hours from home at your convenience</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7377A]" />
                  <span>Competitive per-minute payouts straight to your bank</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7377A]" />
                  <span>Make a real, tangible impact on someone's lonely night</span>
                </li>
              </ul>

              <button
                onClick={() => {
                  setFormData({ ...formData, topic: 'companion' });
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C7377A] text-white text-xs font-semibold hover:bg-[#A62965] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Apply via Form Above</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
