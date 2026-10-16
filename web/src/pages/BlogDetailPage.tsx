import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  ArrowLeft,
  Share2,
  Check,
  Sparkles,
  PhoneCall,
  ChevronRight,
} from 'lucide-react';
import blogsData from '@/data/blogs.json';
import type { BlogPost } from '@/types/blog';
import { BlogCard } from '@/components/common/BlogCard';
import { GooglePlayButton } from '@/components/common/GooglePlayButton';
import { useModal } from '@/context/ModalContext';
import { SEO } from '@/components/common/SEO';
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/seo-schemas';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { openDownloadModal } = useModal();
  const blogs = blogsData as BlogPost[];

  const [copied, setCopied] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Find current blog post
  const blog = useMemo(() => {
    return blogs.find((b) => b.slug === slug);
  }, [blogs, slug]);

  // Compute related blog posts
  const relatedBlogs = useMemo(() => {
    if (!blog) return [];
    if (blog.relatedSlugs && blog.relatedSlugs.length > 0) {
      return blogs.filter((b) => blog.relatedSlugs.includes(b.slug));
    }
    // Fallback: other blogs in the same category or simply others
    return blogs.filter((b) => b.id !== blog.id).slice(0, 3);
  }, [blogs, blog]);

  // Reading progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!blog) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <h2 className="font-serif text-3xl font-bold mb-4">Story not found</h2>
        <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] max-w-sm mb-6">
          The article you are looking for may have been moved or removed.
        </p>
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C7377A] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal</span>
        </Link>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`${blog.title} - Read on Accompany:\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`"${blog.title}" on Accompany Journal`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(window.location.href)}`,
      '_blank'
    );
  };

  return (
    <article
      itemScope
      itemType="https://schema.org/BlogPosting"
      className="relative pb-20"
    >
      <SEO
        title={blog.title}
        description={blog.metaDescription || blog.excerpt}
        canonicalUrl={`/blogs/${blog.slug}`}
        ogType="article"
        ogImage={blog.coverImage}
        ogImageAlt={blog.coverImageAlt || blog.title}
        keywords={blog.focusKeywords || blog.tags}
        author={blog.author.name}
        publishedTime={blog.datePublishedISO}
        modifiedTime={blog.dateModifiedISO || blog.datePublishedISO}
        section={blog.category}
        tags={blog.tags}
        jsonLd={[
          buildArticleSchema(blog, `https://accompanyapp.in/blogs/${blog.slug}`),
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Journal', url: '/blogs' },
            { name: blog.title, url: `/blogs/${blog.slug}` },
          ]),
        ]}
      />

      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-[#C7377A] to-[#F06091] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <header>
          {/* Breadcrumbs Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5E574F] dark:text-[#B7AFA3] mb-8">
            <Link to="/" className="hover:text-[#C7377A] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/blogs" className="hover:text-[#C7377A] transition-colors">
              Journal
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#1C1916] dark:text-[#F3EEE6] truncate max-w-xs font-medium">
              {blog.title}
            </span>
          </nav>

          {/* Category Pill & Reading Time */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#FDE4ED] text-[#C7377A]">
              {blog.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#5E574F] dark:text-[#B7AFA3]">
              <Clock className="w-3.5 h-3.5" />
              <span>{blog.readTime}</span>
            </div>
            <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">•</span>
            <time
              dateTime={blog.datePublishedISO}
              itemProp="datePublished"
              className="text-xs text-[#5E574F] dark:text-[#B7AFA3]"
            >
              {blog.publishedAt}
            </time>
          </div>

          {/* Title */}
          <h1
            itemProp="headline"
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] leading-[1.2] mb-6"
          >
            {blog.title}
          </h1>
        </header>

        {/* Excerpt */}
        <p className="text-lg text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed mb-8 font-serif italic border-l-2 border-[#C7377A] pl-4">
          {blog.excerpt}
        </p>

        {/* Author Card & Social Share Bar */}
        <div className="py-4 border-y border-[#E3DBD1] dark:border-[#3A342E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Author */}
          <div className="flex items-center gap-3.5">
            <img
              src={blog.author.avatar}
              alt={blog.author.name}
              className="w-12 h-12 rounded-full object-cover border border-[#E3DBD1] dark:border-[#3A342E]"
            />
            <div>
              <div className="text-sm font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                {blog.author.name}
              </div>
              <div className="text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                {blog.author.role}
              </div>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3] mr-1">Share:</span>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#29995C]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] text-xs font-semibold text-[#29995C] transition-colors cursor-pointer"
              title="Share on WhatsApp"
            >
              WhatsApp
            </button>
            <button
              onClick={handleShareTwitter}
              className="px-3 py-2 rounded-xl border border-[#E3DBD1] dark:border-[#3A342E] hover:bg-[#F7F4EF] dark:hover:bg-[#25221E] text-xs font-semibold hover:text-[#C7377A] transition-colors cursor-pointer"
              title="Share on X"
            >
              X / Twitter
            </button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="relative rounded-3xl overflow-hidden mb-12 shadow-sm border border-[#E3DBD1] dark:border-[#3A342E]">
          <img
            itemProp="image"
            src={blog.coverImage}
            alt={blog.coverImageAlt || blog.title}
            className="w-full h-80 sm:h-96 md:h-[420px] object-cover"
          />
        </div>

        {/* Key Takeaways Callout Box */}
        {blog.keyTakeaways && blog.keyTakeaways.length > 0 && (
          <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-[#FDE4ED]/60 dark:bg-[#26131E] border border-[#C7377A]/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C7377A] mb-3">
              <Sparkles className="w-4 h-4" />
              <span>Key Takeaways</span>
            </div>
            <ul className="space-y-2.5">
              {blog.keyTakeaways.map((point, idx) => (
                <li
                  key={idx}
                  className="text-sm text-[#1C1916] dark:text-[#F3EEE6] flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C7377A] mt-2 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Article Content */}
        <div
          itemProp="articleBody"
          className="space-y-10 text-[#1C1916] dark:text-[#F3EEE6] leading-relaxed font-sans text-base sm:text-lg"
        >
          {blog.content.map((sec, idx) => (
            <div key={idx} className="space-y-5">
              {sec.sectionTitle && (
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] pt-4">
                  {sec.sectionTitle}
                </h2>
              )}

              {sec.paragraphs.map((p, pIdx) => (
                <p
                  key={pIdx}
                  className="text-[#1C1916]/90 dark:text-[#F3EEE6]/90 text-sm sm:text-base leading-relaxed"
                >
                  {p}
                </p>
              ))}

              {sec.quote && (
                <blockquote className="my-6 p-6 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border-l-4 border-[#C7377A] text-[#1C1916] dark:text-[#F3EEE6] font-serif text-lg sm:text-xl italic shadow-2xs">
                  "{sec.quote}"
                </blockquote>
              )}
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-[#E3DBD1] dark:border-[#3A342E] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#5E574F] dark:text-[#B7AFA3] mr-1">Tags:</span>
          {blog.tags.map((t) => (
            <span
              key={t}
              className="text-xs font-medium px-3 py-1 rounded-full bg-[#F7F4EF] dark:bg-[#25221E] text-[#1C1916] dark:text-[#F3EEE6] border border-[#E3DBD1] dark:border-[#3A342E]"
            >
              #{t}
            </span>
          ))}
        </div>

        {/* In-Article App Download Callout Card */}
        <div className="my-16 p-8 rounded-3xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#C7377A]/30 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FDE4ED] text-[#C7377A] text-[11px] font-bold mb-2">
              <PhoneCall className="w-3 h-3" />
              <span>Talk to Someone Right Now</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-1">
              Need to talk through your feelings?
            </h3>
            <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3]">
              Accompany connects you with empathetic companions on private audio calls 24/7.
            </p>
          </div>
          <GooglePlayButton
            size="md"
            onClick={() => openDownloadModal('blog-in-article')}
          />
        </div>

        {/* Back Link */}
        <div className="mb-16">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#C7377A] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Stories</span>
          </Link>
        </div>

        {/* Related Pages / Articles Section */}
        {relatedBlogs.length > 0 && (
          <section className="pt-12 border-t border-[#E3DBD1] dark:border-[#3A342E]">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C7377A]">
                Continue Reading
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mt-1">
                Related Stories & Perspectives
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map((rel) => (
                <BlogCard key={rel.id} blog={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
};
