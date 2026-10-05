import React, { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  jsonLd?: object | object[];
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage = 'https://accompanyapp.in/logo/icon.png',
  ogImageAlt = 'Accompany - Emotional Support & Companionship',
  keywords = [],
  author = 'Accompany Team',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  jsonLd,
}) => {
  const siteUrl = 'https://accompanyapp.in';
  const fullTitle = title.includes('Accompany') ? title : `${title} | Accompany`;
  const resolvedCanonical = canonicalUrl
    ? canonicalUrl.startsWith('http')
      ? canonicalUrl
      : `${siteUrl}${canonicalUrl}`
    : typeof window !== 'undefined'
    ? window.location.href.split('?')[0]
    : siteUrl;

  const resolvedOgImage = ogImage.startsWith('http')
    ? ogImage
    : `${siteUrl}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;

  useEffect(() => {
    // 1. Update Document Title
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to set or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 2. Primary Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    if (keywords.length > 0) {
      setMetaTag('meta[name="keywords"]', 'name', 'keywords', keywords.join(', '));
    }
    setMetaTag('meta[name="author"]', 'name', 'author', author);
    setMetaTag(
      'meta[name="robots"]',
      'name',
      'robots',
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    setMetaTag('meta[name="googlebot"]', 'name', 'googlebot', 'index, follow');
    setMetaTag('meta[name="bingbot"]', 'name', 'bingbot', 'index, follow');

    // Canonical Link
    setLinkTag('canonical', resolvedCanonical);

    // 3. Open Graph Meta Tags
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Accompany');
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', resolvedCanonical);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);
    setMetaTag('meta[property="og:image:alt"]', 'property', 'og:image:alt', ogImageAlt);
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'en_IN');

    if (ogType === 'article') {
      if (publishedTime) {
        setMetaTag('meta[property="article:published_time"]', 'property', 'article:published_time', publishedTime);
      }
      if (modifiedTime) {
        setMetaTag('meta[property="article:modified_time"]', 'property', 'article:modified_time', modifiedTime);
      }
      if (author) {
        setMetaTag('meta[property="article:author"]', 'property', 'article:author', author);
      }
      if (section) {
        setMetaTag('meta[property="article:section"]', 'property', 'article:section', section);
      }
      tags.forEach((tag, idx) => {
        setMetaTag(`meta[property="article:tag"][data-index="${idx}"]`, 'property', 'article:tag', tag);
      });
    }

    // 4. Twitter Cards
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', '@accompanyapp');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedOgImage);
    setMetaTag('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', ogImageAlt);

    // 5. JSON-LD Structured Data
    const SCRIPT_ID = 'seo-structured-data';
    let scriptElement = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = SCRIPT_ID;
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.text = JSON.stringify(jsonLd);
    } else if (scriptElement) {
      scriptElement.remove();
    }

    return () => {
      // Cleanup script on unmount
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, [
    fullTitle,
    description,
    resolvedCanonical,
    ogType,
    resolvedOgImage,
    ogImageAlt,
    keywords,
    author,
    publishedTime,
    modifiedTime,
    section,
    tags,
    jsonLd,
  ]);

  return null;
};
