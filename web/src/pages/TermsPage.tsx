import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Lock,
  AlertTriangle,
  Ban,
  PhoneOff,
  Coins,
  ChevronRight,
  Printer,
  Users,
} from 'lucide-react';
import { SEO } from '@/components/common/SEO';
import { buildBreadcrumbSchema } from '@/lib/seo-schemas';

export const TermsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'privacy' || requestedTab === 'community' ? requestedTab : 'terms';

  const handleTabChange = (tab: 'terms' | 'privacy' | 'community') => {
    setSearchParams({ tab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="py-10 md:py-16">
      <SEO
        title={`${activeTab === 'terms' ? 'User Terms and Conditions' : activeTab === 'privacy' ? 'Privacy Policy' : 'Community Rules'} — Accompany`}
        description="Review Accompany's Terms and Conditions, Privacy Policy, and Community Rules. These pages are drafts under review and are not currently effective."
        canonicalUrl="/terms"
        ogType="website"
        keywords={[
          'accompany terms and conditions',
          'accompany privacy policy',
          'terms of service accompany app',
          'community rules',
        ]}
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            {
              name: activeTab === 'terms' ? 'Terms & Conditions' : activeTab === 'privacy' ? 'Privacy Policy' : 'Community Rules',
              url: `/terms?tab=${activeTab}`,
            },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5E574F] dark:text-[#B7AFA3] mb-6">
          <Link to="/" className="hover:text-[#C7377A] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#1C1916] dark:text-[#F3EEE6] font-medium">
            Legal & Compliance
          </span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#C7377A] font-medium">
            {activeTab === 'terms' ? 'User Terms & Conditions' : activeTab === 'privacy' ? 'Privacy Policy' : 'Community Rules'}
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#E3DBD1] dark:border-[#3A342E]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A] mb-2 block">
              Legal Policies · Draft for Review
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6]">
              {activeTab === 'terms' ? 'User Terms & Conditions' : activeTab === 'privacy' ? 'Privacy Policy' : 'Community Rules'}
            </h1>
            <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] mt-2">
              Draft · Not effective
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] bg-[#FFFCF8] dark:bg-[#1C1A17] text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] transition-colors self-center sm:self-auto cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#C7377A]" />
            <span>Print Policy</span>
          </button>
        </div>

        <div className="mb-8 rounded-2xl border border-[#F2A82B]/40 bg-[#FFF8E8] px-5 py-4 text-xs leading-relaxed text-[#5E574F] dark:bg-[#241E12] dark:text-[#D5C8AC]" role="note">
          <strong className="text-[#1C1916] dark:text-[#F3EEE6]">Internal review draft — not effective.</strong>{' '}
          These pages are being aligned with the current product and operating practices. Confirm the company, privacy, payment, and support details and obtain appropriate review before publishing them as binding policies.
        </div>

        {/* Tab Selector */}
        <div className="flex items-center p-1.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] shadow-2xs mb-10">
          <button
            onClick={() => handleTabChange('terms')}
            className={`min-w-0 flex-1 py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-sm font-semibold leading-tight transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#C7377A] text-white shadow-xs'
                : 'text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>User Terms & Conditions</span>
          </button>
          <button
            onClick={() => handleTabChange('privacy')}
            className={`min-w-0 flex-1 py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-sm font-semibold leading-tight transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#C7377A] text-white shadow-xs'
                : 'text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => handleTabChange('community')}
            className={`min-w-0 flex-1 py-3 px-2 sm:px-4 rounded-xl text-[10px] sm:text-sm font-semibold leading-tight transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
              activeTab === 'community'
                ? 'bg-[#C7377A] text-white shadow-xs'
                : 'text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Community Rules</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: USER TERMS AND CONDITIONS
            ========================================================================= */}
        {activeTab === 'terms' && (
          <div className="space-y-10 text-sm sm:text-base text-[#1C1916] dark:text-[#F3EEE6] leading-relaxed">
            {/* Quick Summary Alert Box */}
            <div className="p-6 rounded-3xl bg-[#FDE4ED]/60 dark:bg-[#26131E] border border-[#C7377A]/20">
              <div className="flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-[#C7377A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">
                    Key Highlights for Accompany Users
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#5E574F] dark:text-[#B7AFA3] list-disc list-inside">
                    <li>Accompany provides on-platform conversation for adults.</li>
                    <li>Accompany is not a medical, psychiatric, or emergency service.</li>
                    <li>Keep conversations and payments on the platform; do not share another person's private information.</li>
                    <li>Accompany is intended for people aged 18 or older. The current date-of-birth entry is self-declared, not independent age verification.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                1. Introduction & Acceptance of Terms
              </h2>
              <p>
                Accompany provides the mobile application and related services. The legal entity that operates the service must be confirmed and identified in the final terms. In this draft, “Accompany”, “we”, and “us” refer to the service; “you” refers to a user.
              </p>
              <p>
                These User Terms and Conditions apply to You from the moment You download the Accompany mobile application (hereinafter referred to as the “Accompany App”) available on the Google Play Store or any authorized application marketplace, or otherwise access, procure, or use any of our services.
              </p>
              <p>
                This page is a draft for review and is not currently effective. Before publication, Accompany must confirm its legal operator, the acceptance flow used in the app, and the final terms that apply to users. This draft should be read alongside the Privacy Policy and Community Rules once approved.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                2. Profile Information and Privacy Expectations
              </h2>
              <p>
                Accompany uses account and profile information to provide the service. A companion may see profile information and conversation content made available through the app. Do not assume that use of a display name makes an account anonymous or that personal information can never be disclosed. The exact information visible to other users and the service operator must be confirmed against the current app before these terms take effect.
              </p>
              <p>
                Avoid sharing information you do not want another participant to know, including contact details, financial credentials, or precise location. Accompany cannot control information that a user chooses to disclose in a conversation.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                3. Role of Listeners / Companions & Non-Clinical Scope
              </h2>
              <p>
                Individuals available on the Accompany App to engage in discussions regarding emotional situations or personal experiences shall be referred to as <strong>“Listeners”</strong> or <strong>“Companions”</strong>.
              </p>
              <p>
                You understand and agree that these Listeners are independent peer contributors associated with Us for the limited purpose of helping You discuss Your concerns, inhibitions, or general thoughts in an associated role (hereinafter referred to as <strong>“Experience Sharing Interaction”</strong>). Listeners are <strong>not employees</strong> or agents of Accompany, and each Listener is individually liable for their own conduct, behavior, and disclosures.
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border-l-4 border-[#D6333D] text-xs sm:text-sm text-[#1C1916] dark:text-[#F3EEE6]">
                <strong>Crucial Medical Notice:</strong> We are NOT certified to give or prescribe medical, psychiatric, or psychological care. We are purely a platform that enables peer discussions with individuals who have been similarly placed in the past and can lend an empathetic ear. We actively urge You to seek professional medical assistance from government facilities or hospitals should You be at any medical, psychiatric, or physical risk.
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                4. Strict Platform-Only Communication Rule
              </h2>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#D6333D] uppercase tracking-wider">
                  <Ban className="w-4 h-4" />
                  <span>Zero-Tolerance Policy</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed">
                  You agree that all communications and interactions with any Listener must remain strictly within the Accompany App.
                </p>
                <p className="text-xs sm:text-sm leading-relaxed">
                  You shall not ask for, request, share, exchange, post, solicit, or otherwise communicate any personal contact information or identifiers that can enable any person to contact, trace, or meet outside the Accompany App. This includes but is not limited to: <strong>phone numbers, personal emails, residential addresses, social media handles (Instagram, WhatsApp, Telegram, Snapchat), UPI IDs, QR codes, or bank details</strong>. You shall not arrange to meet any Listener in person.
                </p>
                <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3]">
                  Do not use Accompany to solicit or arrange off-platform contact or payments. Reports of suspected violations may be reviewed under an enforcement process that must be defined and operated consistently before these terms take effect. Any restriction or account action should follow that process and applicable law.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                5. Assumption of Risk & Release (Self-Harm / Suicide / Death)
              </h2>
              <p>
                You understand and agree that Accompany is only an intermediary platform enabling Experience Sharing Interactions and does not control or direct the personal conduct of Users or Listeners.
              </p>
              <p>
                To the maximum extent permitted under applicable law, You accept and assume all risks arising from: (a) Your use of the Accompany App; (b) any interaction with any Listener or User; and (c) any unauthorized off-platform communication.
              </p>
              <p>
                You hereby release and forever discharge Accompany, its directors, officers, employees, agents, and successors from any and all claims, liabilities, damages, and causes of action arising out of or related to: (i) any act or omission of any User or Listener; (ii) any reliance placed upon statements made during calls or chats; and (iii) claims relating to emotional distress, depression, self-harm, suicide, or physical injury.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                6. Excluded Services & Emergency Crisis Disclaimers
              </h2>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] flex items-start gap-3">
                <PhoneOff className="w-5 h-5 text-[#D6333D] shrink-0 mt-1" />
                <div className="text-xs sm:text-sm space-y-2">
                  <p className="font-semibold text-[#1C1916] dark:text-[#F3EEE6]">
                    No Emergency Services or Crisis Hotlines
                  </p>
                  <p className="text-[#5E574F] dark:text-[#B7AFA3]">
                    Accompany does not provide emergency services or crisis intervention. If you or someone else is in immediate danger or needs urgent medical care, contact local emergency services or a qualified professional in your area.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                7. Age Requirement: Minimum 18 Years
              </h2>
              <p>
                Accompany is intended only for people aged 18 or older. The current app collects a user-entered date of birth; this is a self-declaration and does not independently verify age. Age controls and handling of existing accounts must be confirmed before publication. Accounts identified as belonging to minors should be handled under a documented process and applicable law.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                8. Coins, Payments, and Refunds
              </h2>
              <div className="space-y-3">
                <p>
                  The app currently offers coin balances for paid interactions. The amount charged, coin conversion, taxes, companion earnings, withdrawal terms, and treatment of failed or interrupted sessions require confirmation against the live payment and accounting flows.
                </p>
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-xs">
                  <Coins className="w-4 h-4 text-[#F2A82B] shrink-0 mt-0.5" />
                  <div>
                    Refund and withdrawal eligibility has not been confirmed for this draft. Do not rely on a blanket non-refundable statement until the financial model, payment partner terms, and applicable law have been reviewed.
                  </div>
                </div>
                <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                  The payment provider and the payment information handled by Accompany must be verified before this statement is finalized.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                9. Anti-Hacking & Recording Prohibitions
              </h2>
              <p>
                Users expressly agree not to use automated bots, deep-link scrapers, data mining algorithms, or security bypass methods to access or monitor Accompany infrastructure.
              </p>
              <p className="font-semibold text-[#D6333D]">
                The app's call recording, chat storage, and safety-monitoring practices have not been confirmed for this draft. Do not assume that a call or conversation is unrecorded; verify the product behavior and provide an accurate disclosure before publication.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                10. Intermediary Status & Governing Law
              </h2>
              <p>
                Accompany's legal classification and obligations depend on its actual features and operating model and must be confirmed by Indian counsel. This draft does not make a legal determination about intermediary status.
              </p>
              <p>
                The governing law, dispute process, and forum must be confirmed by counsel and stated in the approved terms.
              </p>
            </section>

            {/* Section 11: Contact */}
            <section className="space-y-4 pt-6 border-t border-[#E3DBD1] dark:border-[#3A342E]">
              <h2 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                11. Questions & Grievance Contact
              </h2>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                The support and grievance routes shown below must be verified as monitored and operational before publication.
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs space-y-1">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  Accompany (legal operator to be confirmed)
                </div>
                <div className="text-[#5E574F] dark:text-[#B7AFA3]">
                  Support and grievance contact (to be confirmed)
                </div>
                <div>
                  Email: contact details to be confirmed before publication.
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PRIVACY POLICY
            ========================================================================= */}
        {activeTab === 'privacy' && (
          <div className="space-y-10 text-sm sm:text-base text-[#1C1916] dark:text-[#F3EEE6] leading-relaxed">
            {/* Quick Summary Alert Box */}
            <div className="p-6 rounded-3xl bg-[#FDE4ED]/60 dark:bg-[#26131E] border border-[#C7377A]/20">
              <div className="flex items-start gap-3.5">
                <Lock className="w-6 h-6 text-[#C7377A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">
                    Privacy information (draft)
                  </h3>
                  <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                    This draft describes proposed privacy disclosures. Confirm the actual information collected, recipients, service providers, and retention before relying on it.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 1 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                1. Introduction
              </h2>
              <p>
                Accompany processes information to operate accounts, profiles, conversations, calls, payments, support, and safety functions. The exact information, purposes, access, vendors, and retention periods must be checked against the live app and backend before this policy takes effect.
              </p>
              <p>
                The Users’ right to privacy is of paramount importance to the Accompany community.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                2. Data Management & Minimal Retention
              </h2>
              <p>
                The app may handle account and profile details, date of birth, messages, call metadata, location, reports, and payment records. Storage safeguards, data fields, and retention periods are not specified here until verified against the production systems.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm list-disc list-inside">
                <li>
                  The information visible to a conversation partner depends on the profile and interaction features. Confirm the fields exposed in the app before publication.
                </li>
                <li>Identify the service providers and other recipients that process user information and describe their roles accurately.</li>
                <li>Describe any marketing messages and available preferences only after confirming how they work.</li>
                <li>Users may include sensitive information in profiles or conversations; do not share financial credentials.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                3. Sharing of Data with Third Parties & Listeners
              </h2>
              <p>
                Accompany may share information with service providers needed to operate the app, payment flows, hosting, analytics, support, and safety processes. The actual providers and purposes must be listed after verification.
              </p>
              <p>
                Profile details and information shared in a conversation may be visible to other users. Companion verification status and any contractual confidentiality commitments must be confirmed before making a specific representation.
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs sm:text-sm space-y-2">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#EB9E1F]" />
                  <span>Statutory Disclosures & Harm Prevention</span>
                </div>
                <p className="text-[#5E574F] dark:text-[#B7AFA3]">
                  Information may be disclosed when required by law or valid legal process. Any safety-related disclosure or escalation must follow a documented process and applicable law.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                4. Safety Monitoring and Moderation
              </h2>
              <p>
                The app's interaction monitoring and moderation practices are not confirmed in this draft. If enabled, the purposes, information processed, tools or providers involved, and retention must be described accurately here before publication.
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm list-disc list-inside text-[#5E574F] dark:text-[#B7AFA3]">
                <li>Confirm whether chat, call, or video content is reviewed or analyzed.</li>
                <li>Confirm whether any AI provider receives user content or identifiers.</li>
                <li>Document purposes, access controls, and retention before disclosing monitoring.</li>
              </ul>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                Do not publish this section as a description of current behavior until those practices and safeguards are verified.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                5. Sensitive Personal Information
              </h2>
              <p>
                Do not share sensitive details or medical prescriptions unless you are comfortable sharing them with the other participant. Accompany is not a clinical medical provider. Information shared in a conversation may be seen by the other participant; the platform's own access and handling practices must be confirmed and accurately disclosed.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                6. Payment Processing (Details to Be Confirmed)
              </h2>
              <p>
                The payment provider and the payment-related information it receives must be identified and verified before publication.
              </p>
              <p className="font-semibold text-xs sm:text-sm text-[#29995C]">
                Do not state which payment details Accompany or its providers retain until confirmed with the payment integration and provider terms.
              </p>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                Payment authentication and security responsibilities depend on the selected payment provider and must be described using its verified documentation.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                7. Disclaimers & Limitation of Liability
              </h2>
              <p>
                Our services are provided on an <strong>“AS IS”</strong> and <strong>“AS AVAILABLE”</strong> basis without warranties of merchantability, fitness for a particular purpose, or uninterrupted availability.
              </p>
              <p>
                Any limits on liability must be reviewed for compliance with applicable law and finalized in the approved terms. This draft does not establish a financial cap.
              </p>
            </section>

            {/* Section 8: Contact */}
            <section className="space-y-4 pt-6 border-t border-[#E3DBD1] dark:border-[#3A342E]">
              <h2 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                8. Privacy Officer Contact
              </h2>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                The contact route for privacy requests and account deletion must be confirmed and monitored before publication.
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs space-y-1">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  Privacy contact (to be confirmed)
                </div>
                <div>
                  Email: contact details to be confirmed before publication.
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-10 text-sm sm:text-base text-[#1C1916] dark:text-[#F3EEE6] leading-relaxed">
            <div className="p-6 rounded-3xl bg-[#FDE4ED]/60 dark:bg-[#26131E] border border-[#C7377A]/20">
              <div className="flex items-start gap-3.5">
                <Users className="w-6 h-6 text-[#C7377A] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">Keep Accompany respectful and conversation-focused</h3>
                  <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">These proposed rules apply to profiles, requests, chats, voice calls, and video calls. They remain a draft until the product controls and moderation process are confirmed.</p>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">1. Treat people respectfully</h2>
              <p>Do not harass, threaten, bully, stalk, discriminate against, or repeatedly contact someone who has declined interaction. Do not impersonate another person or misrepresent material information in a profile.</p>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">2. Keep interactions on-platform</h2>
              <p>Do not solicit or share phone numbers, personal email addresses, social handles, payment credentials, or other contact details to move an interaction off Accompany. Do not request or arrange in-person meetings or off-platform payments.</p>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">3. No sexual exploitation, explicit content, or unlawful conduct</h2>
              <p>Do not use the service to solicit sexual services, share or request non-consensual intimate content, exploit or endanger anyone, promote illegal activity, or share another person's private information without permission.</p>
              <p>Accompany is intended for adults aged 18 or older. Do not involve minors in the service or share sexualized content involving anyone under 18.</p>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">4. Use the service for conversation, not professional care</h2>
              <p>Accompany conversations are not medical care, therapy, legal or financial advice, or emergency response. Do not present yourself as a licensed professional through Accompany unless the service explicitly verifies and supports that role.</p>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">5. Reporting, blocking, and review</h2>
              <p>Use the in-app block control to stop contact where available. A dedicated report flow, who reviews reports, escalation steps, response targets, and appeal process must be confirmed before this page promises those services. This draft does not guarantee a specific review time or outcome.</p>
            </section>
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">6. Enforcement</h2>
              <p>Accompany may review suspected rule violations and take proportionate action when supported by the product and operating process, subject to applicable law. The final policy must explain available actions, urgent safety handling, and any appeal route before it takes effect.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
