import type { BlogPost } from '@/types/blog';

const SITE_URL = 'https://accompanyapp.in';

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Accompany',
    alternateName: 'Accompany App',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo/icon.png`,
      caption: 'Accompany Logo',
    },
    description:
      'Accompany is India’s premier emotional support and companionship platform connecting users anonymously with empathetic listeners for private audio, video, and chat support 24/7.',
    email: 'support@accompanyapp.in',
    sameAs: [
      'https://twitter.com/accompanyapp',
      'https://instagram.com/accompanyapp',
      'https://play.google.com/store/apps/details?id=com.datingmarketplace.app',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@accompanyapp.in',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi'],
    },
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Accompany',
    description: 'Confidential Emotional Support & Companionship 24/7',
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blogs?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-IN',
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function buildArticleSchema(blog: BlogPost, canonicalUrl: string) {
  // Aggregate full text body for AI search engine indexing
  const fullBodyText = blog.content
    .map((sec) => `${sec.sectionTitle ? sec.sectionTitle + '. ' : ''}${sec.paragraphs.join(' ')}`)
    .join('\n\n');

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    headline: blog.title,
    description: blog.metaDescription || blog.excerpt,
    image: [blog.coverImage],
    datePublished: blog.datePublishedISO,
    dateModified: blog.dateModifiedISO || blog.datePublishedISO,
    author: {
      '@type': 'Person',
      name: blog.author.name,
      jobTitle: blog.author.role,
      url: blog.author.url || `${SITE_URL}/blogs`,
      image: blog.author.avatar,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Accompany',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo/icon.png`,
      },
    },
    articleSection: blog.category,
    keywords: (blog.focusKeywords || blog.tags).join(', '),
    wordCount: blog.wordCount || 900,
    inLanguage: blog.inLanguage || 'en-IN',
    articleBody: fullBodyText,
  };
}

export function buildFAQSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}
