import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import type { BlogPost } from '@/types/blog';

interface BlogCardProps {
  blog: BlogPost;
  featured?: boolean;
}

export const BlogCard: React.FC<BlogCardProps> = ({ blog, featured = false }) => {
  if (featured) {
    return (
      <div className="group relative bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Image column */}
        <div className="lg:col-span-7 relative overflow-hidden h-64 lg:h-full min-h-[300px]">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFCF8]/90 dark:bg-[#1C1A17]/90 text-[#C7377A] backdrop-blur-md shadow-xs border border-[#E3DBD1]/50">
              {blog.category}
            </span>
          </div>
        </div>

        {/* Content column */}
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="hidden lg:flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDE4ED] text-[#C7377A]">
                {blog.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-[#5E574F] dark:text-[#B7AFA3]">
                <Clock className="w-3.5 h-3.5" />
                <span>{blog.readTime}</span>
              </div>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1916] dark:text-[#F3EEE6] leading-tight mb-3 group-hover:text-[#C7377A] transition-colors">
              <Link to={`/blogs/${blog.slug}`}>
                {blog.title}
              </Link>
            </h3>

            <p className="text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed line-clamp-3 mb-6">
              {blog.excerpt}
            </p>
          </div>

          <div className="pt-6 border-t border-[#E3DBD1]/70 dark:border-[#3A342E]/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="w-10 h-10 rounded-full object-cover border border-[#E3DBD1] dark:border-[#3A342E]"
              />
              <div>
                <h5 className="text-xs font-bold text-[#1C1916] dark:text-[#F3EEE6]">
                  {blog.author.name}
                </h5>
                <span className="text-[11px] text-[#5E574F] dark:text-[#B7AFA3]">
                  {blog.publishedAt}
                </span>
              </div>
            </div>

            <Link
              to={`/blogs/${blog.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C7377A] group-hover:translate-x-1 transition-transform"
            >
              <span>Read Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col justify-between bg-[#FFFCF8] dark:bg-[#1C1A17] rounded-3xl border border-[#E3DBD1] dark:border-[#3A342E] overflow-hidden shadow-xs hover:shadow-xl hover:border-[#C7377A]/40 dark:hover:border-[#C7377A]/50 transition-all duration-300">
      <div>
        {/* Cover image */}
        <div className="relative h-48 sm:h-52 overflow-hidden">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FFFCF8]/90 dark:bg-[#1C1A17]/90 text-[#C7377A] backdrop-blur-md shadow-xs border border-[#E3DBD1]/50">
              {blog.category}
            </span>
          </div>
        </div>

        {/* Text body */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs text-[#5E574F] dark:text-[#B7AFA3] mb-2.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{blog.readTime}</span>
            <span>•</span>
            <span>{blog.publishedAt}</span>
          </div>

          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1C1916] dark:text-[#F3EEE6] leading-snug mb-2.5 group-hover:text-[#C7377A] transition-colors line-clamp-2">
            <Link to={`/blogs/${blog.slug}`}>
              {blog.title}
            </Link>
          </h3>

          <p className="text-xs sm:text-sm text-[#5E574F] dark:text-[#B7AFA3] leading-relaxed line-clamp-2 mb-4">
            {blog.excerpt}
          </p>
        </div>
      </div>

      {/* Footer Author & Link */}
      <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-[#E3DBD1]/60 dark:border-[#3A342E]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={blog.author.avatar}
            alt={blog.author.name}
            className="w-7 h-7 rounded-full object-cover border border-[#E3DBD1] dark:border-[#3A342E]"
          />
          <span className="text-xs font-semibold text-[#1C1916] dark:text-[#F3EEE6]">
            {blog.author.name}
          </span>
        </div>

        <Link
          to={`/blogs/${blog.slug}`}
          className="text-xs font-semibold text-[#C7377A] inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
        >
          <span>Read</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
