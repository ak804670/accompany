import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Heart,
  Lock,
  Clock,
  Coins,
  ChevronDown,
  ArrowRight,
  Headphones,
  Mic,
  Volume2,
} from 'lucide-react';
import companionsData from '@/data/companions.json';
import blogsData from '@/data/blogs.json';
import type { Companion } from '@/types/companion';
import type { BlogPost } from '@/types/blog';
import { CompanionCard } from '@/components/common/CompanionCard';
import { BlogCard } from '@/components/common/BlogCard';
import { GooglePlayButton } from '@/components/common/GooglePlayButton';
import { useModal } from '@/context/ModalContext';
import { SEO } from '@/components/common/SEO';
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildFAQSchema,
} from '@/lib/seo-schemas';

export const LandingPage: React.FC = () => {
  const { openDownloadModal } = useModal();
  const companions: Companion[] = companionsData as Companion[];
  const blogs: BlogPost[] = (blogsData as BlogPost[]).slice(0, 3);

  // Emotional topic selector state
  const [selectedTopic, setSelectedTopic] = useState('All');
  const topics = [
    'All',
    'Breakup & Heartbreak',
    'Late Night Talks',
    'Dating Fatigue',
    'Urban Loneliness',
    'Men\'s Mental Health',
  ];

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Will the companion see my real phone number or identity?',
      a: 'Never. Accompany connects all voice and video calls through secure in-app VoIP relays. Neither the companion nor other users ever see your phone number, real name, or location. You can choose any display nickname you wish.',
    },
    {
      q: 'How does pricing work?',
      a: 'Accompany uses a transparent per-minute coin system. Rates start from as low as ₹8/minute depending on the companion. You only pay for the exact minutes you talk. There are no monthly retainers or hidden cancellation fees.',
    },
    {
      q: 'Are companions on Accompany clinical therapists?',
      a: 'Companions are vetted empathetic listeners, peer supporters, and wellness guides. They provide compassionate emotional support, a safe listening ear, and perspective. Accompany is designed for emotional wellness and is not a substitute for clinical psychiatric care.',
    },
    {
      q: 'How do you verify companions on the platform?',
      a: 'All Accompany companions undergo a rigorous multi-step screening process: government identity verification, background checks, and evaluation of active listening skills, empathy, and conversational ethics.',
    },
    {
      q: 'What languages are supported?',
      a: 'We have companions fluent in English, Hindi, Punjabi, Bengali, Marathi, Telugu, Tamil, and other regional Indian languages, so you can always express yourself in the tongue you feel most natural speaking.',
    },
    {
      q: 'How can I become an Accompany Companion / Listener?',
      a: 'If you are an empathetic listener who loves supporting people, you can apply directly through our contact page or in-app listener portal. We provide onboarding, flexible working hours, and competitive hourly payouts.',
    },
  ];

  const filteredCompanions =
    selectedTopic === 'All'
      ? companions
      : companions.filter((c) =>
          c.specialties.some(
            (s) =>
              s.toLowerCase().includes(selectedTopic.toLowerCase()) ||
              selectedTopic.toLowerCase().includes(s.toLowerCase())
          )
        );

  return (
    <div className="relative overflow-hidden">
      <SEO
        title="Accompany — Confidential Emotional Support & Anonymous Companionship 24/7"
        description="Talk freely to empathetic, verified companions over private audio, video, or chat. 100% anonymous, judgment-free emotional support for relationship doubts, loneliness, heartbreak, and everyday life."
        canonicalUrl="/"
        ogType="website"
        keywords={[
          'emotional support app',
          'talk to listener',
          'anonymous venting',
          'breakup recovery support',
          'lonely in city companion',
          'clarity app competitor',
          'mental wellness chat',
          'private audio call companion',
        ]}
        jsonLd={[
          buildOrganizationSchema(),
          buildWebSiteSchema(),
          buildFAQSchema(faqs),
        ]}
      />
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative pt-6 pb-20 md:pt-12 md:pb-28">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#C7377A]/15 to-[#F06091]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Online Counter Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#32B86B] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#32B86B]" />
                </span>
                <span className="text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6]">
                  1,480+ Empathetic Companions Online Now
                </span>
                <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">|</span>
                <span className="text-xs font-semibold text-[#C7377A]">24/7 Available</span>
              </div>

              {/* Main Headline in Editorial Serif Typography */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] leading-[1.15] mb-6">
                When life feels heavy, you never have to carry it{' '}
                <span className="relative inline-block text-[#C7377A] italic">
                  alone.
                  <svg
                    className="absolute -bottom-2 left-0 w-full h-2 text-[#C7377A]/40"
                    viewBox="0 0 100 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 10 Q 50 0 100 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-8">
                Accompany connects you with verified listeners for anonymous, confidential 1-on-1 audio, video, and chat conversations. Unburden heartbreak, loneliness, and everyday stress with zero judgment.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
                <GooglePlayButton
                  size="lg"
                  onClick={() => openDownloadModal('hero-playstore')}
                />
                <a
                  href="#companions"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#E3DBD1] dark:border-[#3A342E] bg-[#FFFCF8] dark:bg-[#1C1A17] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] text-sm font-semibold text-[#1C1916] dark:text-[#F3EEE6] shadow-xs transition-all cursor-pointer"
                >
                  <Headphones className="w-4 h-4 text-[#C7377A]" />
                  <span>Explore Companions</span>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-[#E3DBD1]/80 dark:border-[#3A342E]/80 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    100%
                  </div>
                  <div className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                    Anonymous & Secure
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    4.9 ★
                  </div>
                  <div className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                    50k+ Happy Calls
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    &lt; 30s
                  </div>
                  <div className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                    Average Connect Time
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual / Interactive App Mockup Card */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-sm">
                {/* Phone Frame Mockup */}
                <div className="relative bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-[36px] p-5 border-4 border-[#E3DBD1] dark:border-[#3A342E] shadow-2xl overflow-hidden">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#5E574F] dark:text-[#B7AFA3] mb-4 px-2">
                    <span>9:41 PM</span>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-[#29995C]" />
                      <span>Encrypted Call</span>
                    </div>
                  </div>

                  {/* Active Call UI Simulation */}
                  <div className="relative rounded-2xl bg-gradient-to-b from-[#FDE4ED]/50 via-[#FFFCF8] to-[#F7F4EF] dark:from-[#26131E] dark:via-[#1C1A17] dark:to-[#12110F] p-6 text-center border border-[#E3DBD1]/60 dark:border-[#3A342E]/60 mb-4">
                    {/* Pulsing Avatar */}
                    <div className="relative mx-auto w-24 h-24 mb-4">
                      <div className="absolute inset-0 rounded-full bg-[#C7377A]/20 animate-ping" />
                      <img
                        src="/companions/meera.jpg"
                        alt="Meera S."
                        className="relative w-full h-full rounded-full object-cover border-2 border-[#C7377A] shadow-md"
                      />
                      <span className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-[#32B86B] border-2 border-white flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                      Meera S.
                    </h3>
                    <p className="text-xs font-medium text-[#C7377A] mb-2">
                      Heartbreak & Emotional Wellness
                    </p>

                    {/* Sound Waves Animation */}
                    <div className="flex items-center justify-center gap-1 my-4 h-8">
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_infinite] h-3" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.2s_infinite] h-6" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.4s_infinite] h-8" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.1s_infinite] h-5" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.3s_infinite] h-7" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.5s_infinite] h-4" />
                      <span className="w-1 bg-[#C7377A] rounded-full animate-[wave_1.2s_ease-in-out_0.2s_infinite] h-6" />
                    </div>

                    <div className="text-xs font-medium text-[#5E574F] dark:text-[#B7AFA3]">
                      Call in progress • 14:28
                    </div>
                  </div>

                  {/* Simulated Controls */}
                  <div className="flex items-center justify-center gap-4 py-2">
                    <div className="w-11 h-11 rounded-full bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] flex items-center justify-center text-[#5E574F] dark:text-[#B7AFA3]">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="w-11 h-11 rounded-full bg-[#F7F4EF] dark:bg-[#25221E] border border-[#E3DBD1] dark:border-[#3A342E] flex items-center justify-center text-[#5E574F] dark:text-[#B7AFA3]">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <button
                      onClick={() => openDownloadModal('hero-mockup-call')}
                      className="px-5 py-2.5 rounded-full bg-[#D6333D] hover:bg-[#b5262f] text-white text-xs font-semibold shadow-md cursor-pointer transition-colors"
                    >
                      End Call
                    </button>
                  </div>
                </div>

                {/* Floating Testimonial Pill 1 */}
                <div className="absolute -bottom-6 -left-8 bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-float max-w-xs">
                  <div className="w-8 h-8 rounded-full bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center shrink-0 font-bold text-xs">
                    ★
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-[#1C1916] dark:text-[#F3EEE6] leading-tight">
                      "I couldn't sleep at 2 AM. Talking to Meera grounded me immediately."
                    </p>
                    <span className="text-[10px] text-[#5E574F] dark:text-[#B7AFA3]">
                      Verified User • Bangalore
                    </span>
                  </div>
                </div>

                {/* Floating Badge 2 */}
                <div className="absolute -top-4 -right-6 bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2 animate-float-delayed">
                  <ShieldCheck className="w-4 h-4 text-[#29995C]" />
                  <span className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    Aadhaar Verified Listeners
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          EMOTIONAL TOPIC SELECTOR
          ========================================================================= */}
      <section className="py-12 bg-[#FFFCF8] dark:bg-[#161412] border-y border-[#E3DBD1] dark:border-[#3A342E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#C7377A] mb-2">
            What is on your mind today?
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-6">
            Choose a space that speaks to your current feelings
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  selectedTopic === t
                    ? 'bg-[#C7377A] text-white shadow-sm scale-105'
                    : 'bg-[#F7F4EF] dark:bg-[#25221E] text-[#1C1916] dark:text-[#F3EEE6] border border-[#E3DBD1] dark:border-[#3A342E] hover:border-[#C7377A]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          WHY ACCOMPANY (COMPARISON & PILLARS)
          ========================================================================= */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
              The Accompany Difference
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2 mb-4">
              Designed for privacy, immediacy, and genuine human warmth
            </h2>
            <p className="text-sm sm:text-base text-[#5E574F] dark:text-[#B7AFA3]">
              Unlike expensive therapy clinics or superficial dating apps, Accompany gives you immediate access to trained, empathetic companions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl p-6 sm:p-8 border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                100% Anonymous
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                No phone number disclosure, no mandatory real names. Share what's in your heart without fear of judgment, awkwardness, or social repercussions.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl p-6 sm:p-8 border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                Instant 24/7 Access
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Breakup anguish and loneliness rarely wait for business hours. Connect in less than 30 seconds at 2 AM or mid-afternoon commute.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl p-6 sm:p-8 border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center mb-6">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                Affordable Per-Minute
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Pay only for the minutes you actually talk. Starting at ₹8/min, you don't need to commit ₹2,500+ for an hour you might not even need.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl p-6 sm:p-8 border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
                Vetted Companions
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Every listener is screened for empathy, emotional intelligence, and respect. No bots, no canned AI scripts—just sincere human hearts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          LIVE COMPANIONS SHOWCASE (#companions)
          ========================================================================= */}
      <section id="companions" className="py-20 bg-[#FFFCF8] dark:bg-[#161412] border-y border-[#E3DBD1] dark:border-[#3A342E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
                Available Companions
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2">
                Talk to someone who truly listens
              </h2>
              <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] mt-1">
                Showing companions specializing in {selectedTopic === 'All' ? 'all emotional areas' : selectedTopic}
              </p>
            </div>

            <button
              onClick={() => openDownloadModal('browse-all-companions')}
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#C7377A] hover:underline"
            >
              <span>View all 1,480+ companions in app</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Companions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCompanions.map((comp) => (
              <CompanionCard key={comp.id} companion={comp} />
            ))}
          </div>

          {/* Become a Companion Callout */}
          <div className="mt-12 p-6 rounded-3xl bg-[#F7F4EF] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-2xl bg-[#FDE4ED] text-[#C7377A] flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  Are you an empathetic listener?
                </h4>
                <p className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                  Join Accompany as a verified companion and earn while supporting others in your free time.
                </p>
              </div>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1C1916] dark:bg-[#FFFCF8] text-[#FBF7F2] dark:text-[#1C1916] text-xs font-semibold hover:bg-[#332C25] dark:hover:bg-[#EDE7DC] transition-all shrink-0"
            >
              <span>Apply to Listen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS (#how-it-works)
          ========================================================================= */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
              Simple & Effortless
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2 mb-4">
              How Accompany Works
            </h2>
            <p className="text-sm sm:text-base text-[#5E574F] dark:text-[#B7AFA3]">
              From feeling overwhelmed to feeling supported in three easy steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative bg-[#FFFCF8] dark:bg-[#1C1A17] p-8 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs">
              <span className="text-4xl font-serif font-bold text-[#C7377A]/25 mb-4 block">
                01
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-3">
                Download & Pick a Nickname
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Install the app. No intrusive identity questionnaires. Simply select a pseudonym and choose what is on your mind today.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-[#FFFCF8] dark:bg-[#1C1A17] p-8 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs">
              <span className="text-4xl font-serif font-bold text-[#C7377A]/25 mb-4 block">
                02
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-3">
                Select Your Companion
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Browse listeners online right now. Filter by language (Hindi, English, etc.), topics, rating, and transparent per-minute rate.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-[#FFFCF8] dark:bg-[#1C1A17] p-8 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs">
              <span className="text-4xl font-serif font-bold text-[#C7377A]/25 mb-4 block">
                03
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-3">
                Talk, Vent & Heal
              </h3>
              <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
                Tap to call instantly via private audio or start a confidential chat. End the call anytime you feel unburdened.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          REAL STORIES & TESTIMONIALS
          ========================================================================= */}
      <section className="py-20 bg-[#F7F4EF] dark:bg-[#161412] border-t border-[#E3DBD1] dark:border-[#3A342E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
              Real People, Genuine Relief
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2 mb-4">
              Stories from those who felt accompanied
            </h2>
            <p className="text-sm sm:text-base text-[#5E574F] dark:text-[#B7AFA3]">
              Thousands of people turn to Accompany when they need an open, compassionate ear.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Story 1 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] p-7 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex text-[#F2A82B] mb-3">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-[#1C1916] dark:text-[#F3EEE6] italic leading-relaxed mb-6">
                  "After my 4-year relationship ended out of nowhere, I was crying uncontrollably in my PG. I couldn't call my parents or tell my colleagues. Talking to Meera for 35 minutes saved my night. She just listened without trying to give me annoying clichés."
                </p>
              </div>
              <div className="pt-4 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    Arjun K.
                  </div>
                  <div className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3]">
                    Software Engineer, Pune
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-[#FDE4ED] text-[#C7377A] px-2 py-0.5 rounded-full">
                  Breakup Support
                </span>
              </div>
            </div>

            {/* Story 2 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] p-7 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex text-[#F2A82B] mb-3">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-[#1C1916] dark:text-[#F3EEE6] italic leading-relaxed mb-6">
                  "As a guy, people expect you to always have your life together. When I failed my UPSC attempt, I felt like a complete failure. Rohan was so calm and relatable. He understood the family pressure without judging me."
                </p>
              </div>
              <div className="pt-4 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    Sameer T.
                  </div>
                  <div className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3]">
                    Aspirant, Delhi
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-[#FDE4ED] text-[#C7377A] px-2 py-0.5 rounded-full">
                  Career Burnout
                </span>
              </div>
            </div>

            {/* Story 3 */}
            <div className="bg-[#FFFCF8] dark:bg-[#1C1A17] p-7 rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex text-[#F2A82B] mb-3">
                  {'★'.repeat(5)}
                </div>
                <p className="text-sm text-[#1C1916] dark:text-[#F3EEE6] italic leading-relaxed mb-6">
                  "Moved to Mumbai alone for work. For the first two months, the silence in my flat was deafening. Having Accompany meant I could talk to someone about my day, laugh a little, and not feel invisible."
                </p>
              </div>
              <div className="pt-4 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                    Priyanka M.
                  </div>
                  <div className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3]">
                    Product Designer, Mumbai
                  </div>
                </div>
                <span className="text-[10px] font-semibold bg-[#FDE4ED] text-[#C7377A] px-2 py-0.5 rounded-full">
                  Urban Loneliness
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURED JOURNAL & BLOG SECTION
          ========================================================================= */}
      <section className="py-20 md:py-28 bg-[#FFFCF8] dark:bg-[#1C1A17] border-t border-[#E3DBD1] dark:border-[#3A342E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
                The Accompany Journal
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2">
                Thoughtful Reads on Emotional Health & Love
              </h2>
            </div>
            <Link
              to="/blogs"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-xs font-bold text-[#C7377A] hover:underline"
            >
              <span>Explore All Articles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION
          ========================================================================= */}
      <section className="py-20 bg-[#F7F4EF] dark:bg-[#161412] border-t border-[#E3DBD1] dark:border-[#3A342E]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
              Frequently Asked Questions
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-2">
              Everything you need to know
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-2xl border border-[#E3DBD1] dark:border-[#3A342E] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif text-base sm:text-lg font-bold text-[#1C1916] dark:text-[#F3EEE6] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#C7377A] shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed border-t border-[#E3DBD1]/40 dark:border-[#3A342E]/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
