import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { SEO } from '@/components/common/SEO';
import { buildBreadcrumbSchema } from '@/lib/seo-schemas';

export const TermsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'privacy' ? 'privacy' : 'terms';
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'privacy' || tabParam === 'terms') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'terms' | 'privacy') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="py-10 md:py-16">
      <SEO
        title={
          activeTab === 'terms'
            ? 'User Terms and Conditions — Accompany'
            : 'Privacy Policy — Accompany'
        }
        description="Read the official User Terms & Conditions and Privacy Policy for Accompany. Understand our commitment to 100% user anonymity, data security, platform rules, and dispute resolution."
        canonicalUrl="/terms"
        ogType="website"
        keywords={[
          'accompany terms and conditions',
          'accompany privacy policy',
          'terms of service accompany app',
          'anonymity and data protection',
          'user safety rules',
        ]}
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            {
              name: activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy',
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
            {activeTab === 'terms' ? 'User Terms & Conditions' : 'Privacy Policy'}
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#E3DBD1] dark:border-[#3A342E]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A] mb-2 block">
              Official Legal Policies
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6]">
              {activeTab === 'terms' ? 'User Terms & Conditions' : 'Privacy Policy'}
            </h1>
            <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] mt-2">
              Last Updated: October 2026 • Effective Immediately
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

        {/* Tab Selector */}
        <div className="flex items-center p-1.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] shadow-2xs mb-10">
          <button
            onClick={() => handleTabChange('terms')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#C7377A] text-white shadow-xs'
                : 'text-[#5E574F] dark:text-[#B7AFA3] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
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
                    <li>Accompany is a 100% private, anonymous platform connecting users with peer listeners for non-clinical experience sharing.</li>
                    <li>We do not provide emergency, medical, psychiatric, or crisis-intervention services.</li>
                    <li>Off-platform communications (sharing phone numbers, UPI, or in-person meetings) are strictly prohibited and result in immediate termination.</li>
                    <li>You must be at least 18 years of age to access or use the Accompany App.</li>
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
                We, <strong>Accompany</strong>, are an internet-based mobile application owned and operated by Accompany Technologies Private Limited (hereinafter referred to as “Us”, “We”, or “Accompany” as the context permits). The individual user shall hereinafter be referred to as “You”, “Your”, or “User(s)”. Accompany and You may together be referred to as “Parties” or individually as “Party”.
              </p>
              <p>
                These User Terms and Conditions apply to You from the moment You download the Accompany mobile application (hereinafter referred to as the “Accompany App”) available on the Google Play Store or any authorized application marketplace, or otherwise access, procure, or use any of our services.
              </p>
              <p>
                These terms are legally binding under the laws of India. Should the User choose to proceed with the Accompany App and enjoy its features, it shall be held and assumed that You have agreed to each and every term of usage, condition, and liability contained herein. This document is to be read in harmonious conjunction with our Privacy Policy.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                2. User Anonymity and Voluntary Disclosure
              </h2>
              <p>
                We position and operate the platform as a <strong>‘100% Private’</strong> space for users. ‘100% Private’ means that a User’s real-world identity and personal identifiers (such as mobile phone number, legal name, email, or exact physical location) are not disclosed to the Listener/Companion as part of the standard functioning of the platform.
              </p>
              <p>
                Accordingly, the User remains completely anonymous to the Listener unless the User voluntarily chooses to disclose identifying information during the interaction. The User acknowledges and agrees that any such voluntary disclosure is made at the User’s sole discretion and risk, and the User shall remain solely responsible for any consequences arising from identifying information voluntarily shared.
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
                  Any off-platform interaction is strictly outside the services provided by Accompany. Accompany cannot supervise or enforce safety standards off-platform. Violation of this clause results in immediate and permanent account termination without notice or coin refunds.
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
                    Accompany does NOT provide access to emergency services (police, ambulance, fire departments, or crisis intervention). If You or anyone around You is at risk of self-harm, suicide, violence, or medical emergency, You must immediately contact national emergency services (such as 112, KIRAN at 1800-599-0019, or Tele-MANAS at 14416 in India).
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
                The Accompany App is available only to persons over the age of eighteen (18) years. We reserve the absolute right to terminate access if it is brought to our attention that an individual is a minor under 18 years of age.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                8. Coin Wallet, Payments & Non-Refundability
              </h2>
              <div className="space-y-3">
                <p>
                  Users may purchase in-app Coins / Wallet credits to pay for per-minute Experience Sharing Interactions with Listeners.
                </p>
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] text-xs">
                  <Coins className="w-4 h-4 text-[#F2A82B] shrink-0 mt-0.5" />
                  <div>
                    <strong>Non-Refundable Balance:</strong> Once a User recharges their online coin wallet on the Accompany App, such recharged funds shall NOT be eligible for cash refund or withdrawal back to a bank account, except where explicitly mandated by applicable statutory law.
                  </div>
                </div>
                <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                  All payment transactions are processed through RBI-authorized payment aggregators. Accompany does not store sensitive card numbers, CVVs, or UPI PINs.
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
                Recording of any conversation, voice call, video call, or chat without mutual express authorization constitutes infringement, breach of privacy, and hacking of the services.
              </p>
            </section>

            {/* Section 10 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                10. Intermediary Status & Governing Law
              </h2>
              <p>
                Accompany acts purely as an intermediary under Section 79 of the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
              </p>
              <p>
                The governing law shall exclusively be Indian Law. Any disputes arising out of or related to Accompany shall be resolved primarily through sole arbitration under the Arbitration and Conciliation Act, 1996 in the English language, and the exclusive jurisdiction of the competent courts in India shall apply.
              </p>
            </section>

            {/* Section 11: Contact */}
            <section className="space-y-4 pt-6 border-t border-[#E3DBD1] dark:border-[#3A342E]">
              <h2 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                11. Questions & Grievance Contact
              </h2>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                For questions regarding these Terms or formal grievance requests, please contact:
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs space-y-1">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  Accompany Technologies Private Limited
                </div>
                <div className="text-[#5E574F] dark:text-[#B7AFA3]">
                  Legal & Grievance Cell
                </div>
                <div>
                  Email:{' '}
                  <a href="mailto:support@accompanyapp.in" className="text-[#C7377A] font-semibold">
                    support@accompanyapp.in
                  </a>{' '}
                  / grievance@accompanyapp.in
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
                    Accompany Privacy Charter
                  </h3>
                  <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                    We maintain strict confidentiality. Your personal identifiers are redacted and never disclosed to Listeners. We do not sell your personal data to third parties.
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
                We take data security and privacy with critical importance. We maintain strong confidentiality and do not disclose user data except as described in this Privacy Policy or as required by law. In the Accompany App, Users and Listeners are in control and can decide what they wish to share and what they prefer to keep private.
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
                Accompany stores data entered by the User in a secured, encrypted format to deter leakage or misuse. We only collect the basic minimum information required for registration and session routing (e.g. pseudonym nickname, age band, email ID).
              </p>
              <ul className="space-y-2 text-xs sm:text-sm list-disc list-inside">
                <li>
                  Any personal information on submitting a call or chat request is <strong>‘redacted’, ‘obscured’, and ‘censored’</strong> from external Listeners.
                </li>
                <li>We do not rent, sell, or trade User personal data with any third party, whatsoever.</li>
                <li>We provide promotional announcements with an immediate option to opt-out at any time.</li>
                <li>
                  We do not collect sensitive medical data or financial passwords.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                3. Sharing of Data with Third Parties & Listeners
              </h2>
              <p>
                Accompany does not share personal data with non-affiliates, except to provide the services specifically requested by the User.
              </p>
              <p>
                Accompany provides Your redacted and censored pseudonym to verified Listeners who engage under strict confidentiality and non-disclosure contracts.
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs sm:text-sm space-y-2">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#EB9E1F]" />
                  <span>Statutory Disclosures & Harm Prevention</span>
                </div>
                <p className="text-[#5E574F] dark:text-[#B7AFA3]">
                  Under Indian statutory law, Accompany is legally bound to disclose necessary information if requested by a competent law enforcement authority or court order in order to investigate or prevent illegal activities or fraud. Furthermore, if We reasonably believe that a User poses an immediate, serious threat of physical harm to themselves or others, We reserve the liberty to cooperate with competent authorities as permitted by law.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                4. Quality, Safety Monitoring & AI Moderation
              </h2>
              <p>
                To provide safe and supportive experiences, Accompany may analyze interactions (such as automated keyword safety filters) solely for:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm list-disc list-inside text-[#5E574F] dark:text-[#B7AFA3]">
                <li>Safety and community standards policy enforcement</li>
                <li>Fraud prevention and financial security</li>
                <li>Customer support dispute investigations</li>
                <li>Improvement and maintenance of automated AI safety moderation systems</li>
              </ul>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                All such moderation data is processed under strict confidentiality protocols.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                5. Sensitive Personal Information
              </h2>
              <p>
                Users and Listeners are urged not to share sensitive personal details or medical prescriptions. Accompany is not a clinical medical facilitator. Any voluntary disclosure during an Experience Sharing Interaction remains at the User's sole volition, and Accompany takes no responsibility for consensual disclosures between individuals.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-2">
                6. Payment Security (NPCI & RBI Compliance)
              </h2>
              <p>
                When purchasing coins or wallet packages, transactions are routed through certified payment gateways.
              </p>
              <p className="font-semibold text-xs sm:text-sm text-[#29995C]">
                We DO NOT RETAIN sensitive payment data (debit/credit card numbers, CVVs, expiry dates, OTPs, or UPI PINs).
              </p>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                UPI PIN authentication is handled securely through the Common Library (CL) provided by the National Payments Corporation of India (NPCI).
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
                Subject to applicable laws, Accompany’s total liability for any claim arising out of the services shall not exceed the amount actually received and retained by Accompany from the User for the specific session in dispute.
              </p>
            </section>

            {/* Section 8: Contact */}
            <section className="space-y-4 pt-6 border-t border-[#E3DBD1] dark:border-[#3A342E]">
              <h2 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                8. Privacy Officer Contact
              </h2>
              <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                If you have questions, data access inquiries, or wish to delete your account, please reach our privacy team:
              </p>
              <div className="p-5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-xs space-y-1">
                <div className="font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  Data Protection & Privacy Officer
                </div>
                <div>
                  Email:{' '}
                  <a href="mailto:privacy@accompanyapp.in" className="text-[#C7377A] font-semibold">
                    privacy@accompanyapp.in
                  </a>{' '}
                  / support@accompanyapp.in
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
