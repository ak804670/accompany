export interface BlogAuthor {
  name: string;
  role: string;
  avatar: string;
  url?: string;
}

export interface BlogPostContentSection {
  sectionTitle?: string;
  paragraphs: string[];
  quote?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription?: string;
  category: string;
  readTime: string;
  publishedAt: string;
  datePublishedISO: string;
  dateModifiedISO: string;
  author: BlogAuthor;
  coverImage: string;
  coverImageAlt?: string;
  tags: string[];
  focusKeywords?: string[];
  relatedSlugs: string[];
  keyTakeaways: string[];
  wordCount?: number;
  inLanguage?: string;
  content: BlogPostContentSection[];
}
