import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen } from 'lucide-react';
import blogsData from '@/data/blogs.json';
import type { BlogPost } from '@/types/blog';
import { BlogCard } from '@/components/common/BlogCard';
import { GooglePlayButton } from '@/components/common/GooglePlayButton';
import { useModal } from '@/context/ModalContext';
import { SEO } from '@/components/common/SEO';
import { buildBreadcrumbSchema } from '@/lib/seo-schemas';

export const BlogListPage: React.FC = () => {
  const blogs = blogsData as BlogPost[];
  const { openDownloadModal } = useModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    blogs.forEach((b) => set.add(b.category));
    return ['All', ...Array.from(set)];
  }, [blogs]);

  // Filtered blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesCategory =
        selectedCategory === 'All' || blog.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        blog.title.toLowerCase().includes(q) ||
        blog.excerpt.toLowerCase().includes(q) ||
        blog.tags.some((t) => t.toLowerCase().includes(q)) ||
        blog.author.name.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery]);

  // Featured post is the first post when no search and All is selected
  const showFeatured = selectedCategory === 'All' && !searchQuery.trim() && filteredBlogs.length > 0;
  const featuredBlog = showFeatured ? filteredBlogs[0] : null;
  const standardBlogs = showFeatured ? filteredBlogs.slice(1) : filteredBlogs;

  return (
    <div className="py-10 md:py-16">
      <SEO
        title="The Accompany Journal — Insights on Emotional Wellness, Love & Mental Peace"
        description="Thoughtful perspectives on heartbreak recovery, urban loneliness, modern dating burnout, and the power of being heard. Practical psychological frameworks and stories."
        canonicalUrl="/blogs"
        ogType="website"
        keywords={[
          'emotional wellness blog',
          'heartbreak advice',
          'overcoming loneliness',
          'dating burnout',
          'active listening',
          'mental health articles',
          'talk to listener stories',
        ]}
        jsonLd={[
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Journal', url: '/blogs' },
          ]),
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDE4ED] text-[#C7377A] text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>The Accompany Journal</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1C1916] dark:text-[#F3EEE6] mb-4">
            Words for the quiet hours & healing hearts
          </h1>
          <p className="text-base text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed">
            Explorations into human loneliness, heartbreak, the nuances of modern relationships, and the transformative power of being genuinely heard.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5E574F] dark:text-[#B7AFA3]" />
            <input
              type="text"
              placeholder="Search topics, heartbreak, loneliness..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-[#FFFCF8] dark:bg-[#1C1A17] border border-[#E3DBD1] dark:border-[#3A342E] text-sm text-[#1C1916] dark:text-[#F3EEE6] placeholder-[#5E574F]/70 focus:outline-none focus:ring-2 focus:ring-[#C7377A]/40 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5E574F] hover:text-[#1C1916] dark:hover:text-[#F3EEE6]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#C7377A] text-white shadow-xs'
                    : 'bg-[#FFFCF8] dark:bg-[#1C1A17] text-[#5E574F] dark:text-[#B7AFA3] border border-[#E3DBD1] dark:border-[#3A342E] hover:border-[#C7377A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Blog (Hero Post) */}
        {featuredBlog && (
          <div className="mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-[#C7377A] mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Editor's Pick</span>
            </div>
            <BlogCard blog={featuredBlog} featured={true} />
          </div>
        )}

        {/* Blog Grid */}
        {standardBlogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {standardBlogs.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] p-8">
            <h3 className="font-serif text-xl font-bold mb-2">No stories found</h3>
            <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] max-w-sm mx-auto mb-4">
              We couldn't find any articles matching "{searchQuery}". Try searching for another keyword like "heartbreak" or "loneliness".
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-xl bg-[#C7377A] text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bottom App Promo Banner */}
        <div className="mt-20 p-8 md:p-10 rounded-3xl bg-gradient-to-r from-[#FDE4ED]/60 to-[#F7F4EF] dark:from-[#26131E] dark:to-[#1C1A17] border border-[#C7377A]/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <h3 className="font-serif text-2xl font-bold text-[#1C1916] dark:text-[#F3EEE6] mb-2">
              Reading helps, but speaking heals faster.
            </h3>
            <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3]">
              If you are feeling weighed down right now, don't keep it inside. Connect with an empathetic listener on the Accompany mobile app in under 30 seconds.
            </p>
          </div>
          <GooglePlayButton
            size="md"
            onClick={() => openDownloadModal('blog-list-bottom')}
          />
        </div>
      </div>
    </div>
  );
};
