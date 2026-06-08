import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaLinkedin, FaWhatsapp, FaCopy, FaCheck, FaBookOpen, FaRegBookmark, FaRegHeart, FaBookmark, FaHeart } from 'react-icons/fa';
import SEO from '../components/SEO';
import MainLayout from '../layout/MainLayout';
import SaveBookHeart from '../components/SaveBookHeart';
import { buildApiUrl } from '../lib/apiConfig';
import { getBookThumbnailUrl } from '../lib/mediaUrls';

// Helper to resolve colored category badges matching I-CARD design
const getCategoryBadgeStyles = (cat) => {
    const cleanCat = (cat || '').toLowerCase().trim();
    if (cleanCat.includes('classic')) {
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
    if (cleanCat.includes('study')) {
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    }
    if (cleanCat.includes('literary') || cleanCat.includes('analysis')) {
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/20';
    }
    if (cleanCat.includes('guide')) {
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    }
    if (cleanCat.includes('author') || cleanCat.includes('profile')) {
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
    if (cleanCat.includes('tips') || cleanCat.includes('tricks')) {
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
};

// Helper to format date
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return '';
    }
};

// Excerpt truncation helper
const truncateExcerpt = (text) => {
    if (!text) return '';
    return text.length > 150 ? `${text.slice(0, 150)}...` : text;
};

/**
 * Custom Shimmer block for skeleton loaders
 */
const Shine = React.memo(function Shine({ className = '' }) {
    return (
        <div className={`relative overflow-hidden rounded border border-white/5 bg-slate-900/60 h-full w-full ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    );
});

/**
 * Loading Skeleton Screen matching page layout
 */
const LoadingSkeleton = React.memo(function LoadingSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6">
            {/* Hero skeleton */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/20 h-[280px] w-full p-6 flex flex-col justify-end">
                <div className="h-4 w-40 mb-3"><Shine /></div>
                <div className="h-8 w-2/3 mb-2"><Shine /></div>
                <div className="h-4 w-1/3"><Shine /></div>
            </div>

            {/* Split layout skeleton */}
            <div className="flex flex-col lg:flex-row gap-8 mt-4">
                {/* Main Content */}
                <div className="w-full lg:w-[70%] rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7 flex flex-col gap-4">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                        <div className="h-10 w-10 rounded-full overflow-hidden"><Shine /></div>
                        <div className="space-y-2">
                            <div className="h-3.5 w-24"><Shine /></div>
                            <div className="h-3 w-36"><Shine /></div>
                        </div>
                    </div>
                    <div className="h-4 w-full"><Shine /></div>
                    <div className="h-4 w-full"><Shine /></div>
                    <div className="h-4 w-5/6"><Shine /></div>
                    <div className="h-4 w-4/5"><Shine /></div>
                    <div className="h-[200px] w-full rounded-xl my-4"><Shine /></div>
                    <div className="h-4 w-full"><Shine /></div>
                    <div className="h-4 w-11/12"><Shine /></div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-[30%] flex flex-col gap-6">
                    {/* Books */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <div className="h-5 w-48 mb-4"><Shine /></div>
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-20 w-14 rounded-lg overflow-hidden"><Shine /></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-3.5 w-24"><Shine /></div>
                                        <div className="h-3 w-16"><Shine /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

/**
 * Sub-component: Breadcrumb navigation
 */
const Breadcrumb = React.memo(function Breadcrumb({ blogTitle }) {
    return (
        <nav className="flex items-center gap-2 text-xs font-bold text-slate-350 select-none">
            <Link to="/" className="hover:text-purple-400 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-purple-400 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-white line-clamp-1 max-w-[200px] sm:max-w-[300px]">
                {blogTitle}
            </span>
        </nav>
    );
});

/**
 * Sub-component: Hero Section (with overlay & breadcrumb)
 */
const HeroSection = React.memo(function HeroSection({ blog, readTime, formattedDate }) {
    return (
        <div className="relative rounded-3xl overflow-hidden border border-purple-500/20 bg-gradient-to-b from-[#0a0f24] via-[#1a0f30] to-black h-[400px] w-full shadow-2xl flex items-center">
            {/* Blurred background cover image overlay */}
            {blog.coverImage && (
                <div
                    className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-15 scale-105 pointer-events-none"
                    style={{ backgroundImage: `url(${blog.coverImage})` }}
                />
            )}

            {/* Ambient glow blobs */}
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-pink-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 sm:px-10 w-full text-left relative z-10">
                <div className="mb-4">
                    <Breadcrumb blogTitle={blog.title} />
                </div>
                <div className="mb-4">
                    <span className="inline-block bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wider shadow-lg shadow-purple-600/25">
                        {blog.category}
                    </span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                    {blog.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wider">
                    <span>BY {blog.author?.username?.toUpperCase() || 'ADMIN'}</span>
                    <span>•</span>
                    <span>{formattedDate.toUpperCase()}</span>
                    <span>•</span>
                    <span>{readTime.toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
});

/**
 * Sub-component: Render HTML blog content
 */
const BlogContent = React.memo(function BlogContent({ blog, readTime, formattedDate, headings, contentHtml }) {
    return (
        <article className="rounded-2xl border border-purple-500/20 bg-slate-950/20 p-6 sm:p-8 backdrop-blur-xl transition-colors duration-300">
            {/* Author Avatar & Header row in clean horizontal layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-purple-500/10 pb-5 mb-8 text-left">
                <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex items-center justify-center text-base font-bold text-purple-300 shrink-0">
                        {blog.author?.avatar ? (
                            <img
                                src={blog.author.avatar}
                                alt={blog.author?.username || 'Author'}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            (blog.author?.username || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">{blog.author?.username || 'Admin'}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Published on {formattedDate}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {blog.category}
                    </span>
                    <span className="bg-slate-900 border border-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md">
                        {readTime}
                    </span>
                </div>
            </div>

            {/* Blog Cover Image */}
            {blog.coverImage && (
                <div className="mb-8 overflow-hidden rounded-2xl border border-purple-500/20 shadow-lg max-h-[400px] w-full relative">
                    <img
                        src={blog.coverImage}
                        alt={blog.title}
                        className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-500"
                    />
                </div>
            )}

            {/* Mobile Table of Contents */}
            {headings && headings.length > 0 && (
                <div className="mb-6 rounded-xl border border-purple-500/10 bg-slate-950/40 p-4 lg:hidden text-left transition-colors">
                    <details className="group">
                        <summary className="flex items-center justify-between text-xs font-bold text-slate-200 cursor-pointer select-none">
                            <span>Table of Contents</span>
                            <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
                        </summary>
                        <ul className="mt-3 space-y-2.5 text-xs font-semibold text-slate-400 border-t border-purple-500/10 pt-3">
                            {headings.map((item) => (
                                <li
                                    key={item.id}
                                    style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
                                >
                                    <a
                                        href={`#${item.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="hover:text-purple-400 transition-colors"
                                    >
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </details>
                </div>
            )}

            {/* Render HTML content with premium styling rules */}
            <div
                className="blog-content-html blog-content prose-blog text-slate-300 text-base leading-relaxed space-y-6 text-left 
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-8
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-purple-300 [&_h2]:mb-3 [&_h2]:mt-8
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-205 [&_h3]:mb-2 [&_h3]:mt-6
                [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-4
                [&_a]:text-purple-400 [&_a]:underline hover:text-purple-300 [&_a]:transition-colors
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:text-slate-300
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:text-slate-300
                [&_li]:pl-1
                [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-6 [&_img]:h-auto [&_img]:shadow-lg
                [&_blockquote]:border-l-4 [&_blockquote]:border-purple-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:my-6
                [&_pre]:bg-slate-900 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6
                [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-purple-300 [&_code]:text-sm
                prose prose-invert max-w-none transition-colors duration-300 clearfix"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Tags wrapper */}
            {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-purple-500/10">
                    {blog.tags.map(tag => (
                        <span key={tag} className="text-xs font-semibold text-slate-300 bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-lg transition-colors hover:border-purple-500/30">
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* About the Author Bio Card */}
            <div className="mt-8 rounded-2xl border border-purple-500/20 bg-slate-900/85 p-6 flex flex-col sm:flex-row gap-5 items-center text-left transition-all duration-300 hover:border-purple-500/30">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex items-center justify-center text-xl font-bold text-purple-300 shrink-0">
                    {blog.author?.avatar ? (
                        <img src={blog.author.avatar} alt={blog.author?.username} className="h-full w-full object-cover" />
                    ) : (
                        (blog.author?.username || 'A').charAt(0).toUpperCase()
                    )}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">About the Author: {blog.author?.username || 'Admin'}</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {blog.author?.bio || 'Passionate writer, literary analyst, and curator of the Readify AI journal. Sharing the best reading recommendations, studying insights, and classic book deep dives.'}
                    </p>
                </div>
            </div>
        </article>
    );
});

/**
 * Sub-component: Share Dialog and Copy Link Options (Redesigned)
 */
const ShareButtons = React.memo(function ShareButtons({ title, slug }) {
    const [copied, setCopied] = useState(false);

    const shareUrl = useMemo(() => {
        return `${window.location.origin}/blog/${slug}`;
    }, [slug]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [shareUrl]);

    // Social share links
    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
        linkedin: `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`,
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' - ' + shareUrl)}`
    };

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-colors">
            <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Share This Post</h4>
                <p className="text-xs text-slate-405 mt-1">Share this article with your reading circle.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
                {/* Twitter */}
                <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-600/10 px-4 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-600 hover:text-white"
                >
                    <FaTwitter className="text-sky-400" />
                    <span>Twitter</span>
                </a>

                {/* Linkedin */}
                <a
                    href={shareLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-600/20 bg-blue-750/10 px-4 py-2 text-xs font-bold text-blue-200 transition hover:bg-blue-600 hover:text-white"
                >
                    <FaLinkedin className="text-blue-400" />
                    <span>LinkedIn</span>
                </a>

                {/* Whatsapp */}
                <a
                    href={shareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-600/10 px-4 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-600 hover:text-white"
                >
                    <FaWhatsapp className="text-emerald-400" />
                    <span>WhatsApp</span>
                </a>

                {/* Copy Link */}
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-purple-600 hover:text-white cursor-pointer"
                    title="Copy Article Link"
                >
                    {copied ? (
                        <>
                            <FaCheck className="text-emerald-500 animate-[fadeIn_200ms_ease-out]" />
                            <span className="text-emerald-500">Copied!</span>
                        </>
                    ) : (
                        <>
                            <FaCopy className="text-purple-400" />
                            <span>Copy Link</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

/**
 * Sub-component: Table of Contents (Desktop Sticky TOC)
 */
const TableOfContents = React.memo(function TableOfContents({ headings }) {
    if (!headings || headings.length === 0) return null;

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 text-left transition-all duration-300 hover:border-purple-500/30">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4">Table of Contents</h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-350 border-t border-purple-500/10 pt-3">
                {headings.map((item) => (
                    <li
                        key={item.id}
                        style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
                    >
                        <a
                            href={`#${item.id}`}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="hover:text-purple-400 transition-colors block py-0.5"
                        >
                            {item.text}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
});

/**
 * Sub-component: Premium CTA Box after blog content
 */
const BlogCTA = React.memo(function BlogCTA() {
    return (
        <div className="relative rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0c1033] via-[#3c1e78] to-[#090514] p-6 sm:p-8 text-center overflow-hidden transition-all duration-300 shadow-md hover:shadow-lg">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent" />

            <span className="text-3.5xl">📚</span>
            <h3 className="mt-4 text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Ready to Start Reading?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                Dive into our curated selection of digital books, track your streaks, and read interactively with AI assistance.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3 relative z-10">
                <Link
                    to="/books"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-6 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/20"
                >
                    Explore All Books
                </Link>
                <Link
                    to="/blog"
                    className="inline-flex items-center justify-center rounded-xl border border-purple-500/30 bg-purple-550/5 px-6 py-2.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/10 hover:text-white"
                >
                    Browse More Articles
                </Link>
            </div>
        </div>
    );
});

/**
 * Sub-component: Sidebar -> Related Books
 */
const RelatedBooks = React.memo(function RelatedBooks({ relatedBooks }) {
    if (!relatedBooks || relatedBooks.length === 0) return null;

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 text-left transition-colors">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FaBookOpen className="text-purple-450" />
                Mentioned in This Post
            </h4>
            <div className="space-y-4 border-t border-purple-500/10 pt-4">
                {relatedBooks.map((book) => {
                    const readLink = book.slug ? `/read/${book.slug}` : `/book/${book._id}`;
                    return (
                        <div key={book._id} className="group relative flex gap-3 p-2 rounded-xl hover:bg-slate-950/45 border border-transparent hover:border-purple-500/10 transition-all">
                            {/* Thumbnail area with save heart */}
                            <div className="relative aspect-[3/4] w-14 overflow-hidden rounded-xl bg-slate-900/60 ring-1 ring-purple-500/10 shrink-0 shadow-md">
                                <img
                                    loading="lazy"
                                    src={getBookThumbnailUrl(book)}
                                    alt={book.title}
                                    className="h-full w-full object-cover"
                                />
                                <SaveBookHeart bookId={book._id} book={book} className="scale-75 right-1.5 top-1.5" />
                            </div>

                            {/* Details & link */}
                            <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 text-left">
                                <div>
                                    <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                                        <Link to={`/book/${book._id}`}>{book.title}</Link>
                                    </h5>
                                    <p className="text-[10px] text-gray-400 font-medium line-clamp-1 mt-0.5">
                                        {book.author}
                                    </p>
                                </div>

                                <Link
                                    to={readLink}
                                    className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-705 hover:to-purple-805 text-white py-1.5 text-[10px] font-bold transition-all shadow-md shadow-purple-500/10"
                                >
                                    Read Now
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/**
 * Sub-component: Sidebar -> Related Blog Posts
 */
const RelatedBlogs = React.memo(function RelatedBlogs({ relatedBlogs }) {
    if (!relatedBlogs || relatedBlogs.length === 0) return null;

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 text-left transition-colors">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4">You Might Also Like</h4>
            <div className="space-y-4 border-t border-purple-500/10 pt-4">
                {relatedBlogs.map((blog) => (
                    <article key={blog.slug} className="group flex flex-col gap-2 p-2 rounded-xl hover:bg-slate-950/40 border border-transparent hover:border-purple-500/10 transition-all">
                        {/* Cover thumbnail */}
                        <Link to={`/blog/${blog.slug}`} className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-slate-950/60 border border-purple-500/10 relative block">
                            {blog.coverImage ? (
                                <img
                                    loading="lazy"
                                    src={blog.coverImage}
                                    alt={blog.title}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-2 text-center text-[10px] font-semibold text-white">
                                      {blog.title}
                                  </div>
                              )}
                          </Link>

                          <div className="text-left">
                              <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                                  <Link to={`/blog/${blog.slug}`}>{blog.title}</Link>
                              </h5>
                              <p className="text-[10px] leading-relaxed text-slate-405 line-clamp-2 mt-1">
                                  {truncateExcerpt(blog.excerpt)}
                              </p>
                              <Link
                                  to={`/blog/${blog.slug}`}
                                  className="inline-flex items-center justify-center rounded-lg bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 hover:text-white text-purple-300 px-3 py-1.5 text-[10px] font-bold transition-all duration-300 mt-2"
                              >
                                  Read
                              </Link>
                          </div>
                      </article>
                  ))}
              </div>
          </div>
      );
  });

/**
 * Sub-component: Sidebar -> Subscribe Form
 */
const Subscribe = React.memo(function Subscribe() {
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (email.trim()) {
            setSuccess(true);
            setEmail('');
        }
    }, [email]);

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-5 text-left relative overflow-hidden transition-colors">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-500/0" />

            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider relative">Stay Updated</h4>
            <p className="text-xs text-slate-400 mt-1 relative">
                Get new blog posts delivered directly to your inbox.
            </p>

            {success ? (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3.5 text-center text-xs text-emerald-300 font-bold animate-[fadeIn_200ms_ease-out]">
                    Subscription success! ✓
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 relative">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-purple-500/20 bg-slate-950/40 px-3 py-2.5 text-xs font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-purple-500"
                    />
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/10 cursor-pointer"
                    >
                        Subscribe
                    </button>
                </form>
            )}
        </div>
    );
});

// Static Data Source containing all 10 classic books featured in the post
const FEATURED_BOOKS_DATA = [
    {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        coverImage: "https://covers.openlibrary.org/b/id/14312547-L.jpg",
        slug: "pride-and-prejudice"
    },
    {
        title: "Wuthering Heights",
        author: "Emily Brontë",
        coverImage: "https://covers.openlibrary.org/b/id/12711666-L.jpg",
        slug: "wuthering-heights"
    },
    {
        title: "Jane Eyre",
        author: "Charlotte Brontë",
        coverImage: "https://covers.openlibrary.org/b/id/14349603-L.jpg",
        slug: "jane-eyre"
    },
    {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        coverImage: "https://covers.openlibrary.org/b/id/12690987-L.jpg",
        slug: "the-great-gatsby"
    },
    {
        title: "Frankenstein",
        author: "Mary Shelley",
        coverImage: "https://covers.openlibrary.org/b/id/14352601-L.jpg",
        slug: "frankenstein"
    },
    {
        title: "1984",
        author: "George Orwell",
        coverImage: "https://covers.openlibrary.org/b/id/12716075-L.jpg",
        slug: "1984"
    },
    {
        title: "Treasure Island",
        author: "Robert Louis Stevenson",
        coverImage: "https://covers.openlibrary.org/b/id/14353046-L.jpg",
        slug: "treasure-island"
    },
    {
        title: "Adventures of Huckleberry Finn",
        author: "Mark Twain",
        coverImage: "https://covers.openlibrary.org/b/id/12723659-L.jpg",
        slug: "adventures-of-huckleberry-finn"
    },
    {
        title: "Dracula",
        author: "Bram Stoker",
        coverImage: "https://covers.openlibrary.org/b/id/14328574-L.jpg",
        slug: "dracula"
    },
    {
        title: "Progress and Poverty",
        author: "Henry George",
        coverImage: "https://covers.openlibrary.org/b/id/8302325-L.jpg",
        slug: "progress-and-poverty"
    }
];

/**
 * Sub-component: Gallery of featured books in this post
 */
const BookCoversGallery = React.memo(function BookCoversGallery({ relatedBooks, slug }) {
    // Determine the source of books (fallback to the static 10 books for this specific post)
    const books = slug === 'top-10-best-free-books-to-read-online-2026' || !relatedBooks || relatedBooks.length === 0
        ? FEATURED_BOOKS_DATA
        : relatedBooks;

    return (
        <div className="rounded-3xl border border-purple-500/20 bg-slate-900/80 px-6 py-10 shadow-2xl animate-[fadeIn_300ms_ease-out] text-left">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Featured Books in This Post
            </h2>
            <p className="text-slate-400 mb-8 text-xs font-semibold uppercase tracking-wider">
                All {books.length} classic books mentioned in this article
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {books.map((book) => {
                    const readLink = book.slug ? `/read/${book.slug}` : `/book/${book._id}`;
                    const coverUrl = book.coverImage || getBookThumbnailUrl(book);

                    return (
                        <div key={book.slug || book._id} className="group cursor-pointer flex flex-col justify-between">
                            <div>
                                <div className="relative mb-3 overflow-hidden rounded-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-305">
                                    <img
                                        src={coverUrl}
                                        alt={book.title}
                                        className="w-full aspect-[3/4] object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <Link to={readLink} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 shadow-lg shadow-purple-600/30 text-xs transition-all hover:scale-105 active:scale-95">
                                            Read Now
                                        </Link>
                                    </div>
                                </div>
                                <h4 className="text-white font-bold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors leading-snug">
                                    <Link to={readLink}>{book.title}</Link>
                                </h4>
                            </div>
                            <p className="text-slate-400 text-xs font-semibold mt-1.5">{book.author}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

/**
 * Main BlogDetailPage Component
 */
export default function BlogDetailPage() {
    const { slug } = useParams();
    const navigate = useNavigate();

    // State
    const [blog, setBlog] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [relatedBooks, setRelatedBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [scrollPercent, setScrollPercent] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Reading Progress Listener
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const pct = (window.pageYOffset / totalHeight) * 100;
                setScrollPercent(pct);
            }
            setShowBackToTop(window.pageYOffset > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch single blog post by slug
    const fetchBlogDetail = async () => {
        setLoading(true);
        setError('');

        try {
            const url = buildApiUrl(`/blogs/${encodeURIComponent(slug)}`);
            console.log(`[BlogDetailPage] API call: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Blog not found');
                }
                throw new Error(data.message || 'Failed to fetch article details');
            }

            setBlog(data.blog || null);
            setRelatedPosts(data.relatedPosts || []);
            setRelatedBooks(data.relatedBooks || []);
        } catch (err) {
            console.error('[BlogDetailPage] Fetch error:', err);
            setError(err.message || 'An error occurred while loading this article.');
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch on mount and slug change
    useEffect(() => {
        fetchBlogDetail();
    }, [slug]);

    // Computed values
    const wordCount = blog?.content ? blog.content.split(/\s+/).length : 0;
    const readTime = `${Math.ceil(wordCount / 200) || 1} min read`;
    const formattedDate = blog ? formatDate(blog.publishedAt || blog.createdAt) : '';
    const content = blog?.content || '';

    // Parsed headings for dynamic Table of Contents
    const headings = useMemo(() => {
        if (!content) return [];
        const regex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi;
        const items = [];
        let match;
        let index = 0;
        while ((match = regex.exec(content)) !== null) {
            const level = parseInt(match[1], 10);
            const rawText = match[2].replace(/<[^>]*>/g, '');
            const id = `heading-${index++}-${rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            items.push({ level, text: rawText, id });
        }
        return items;
    }, [content]);

    // HTML Content with injected anchor IDs and styled book cover summaries on the right
    const processedContent = useMemo(() => {
        if (!content) return '';
        let html = content;

        // 1. Generate IDs for headings for smooth scroll table of contents
        let index = 0;
        html = html.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
            const rawText = text.replace(/<[^>]*>/g, '');
            const id = `heading-${index++}-${rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            if (attrs.includes('id=')) return match;
            return `<h${level} id="${id}" ${attrs}>${text}</h${level}>`;
        });

        // 2. Parse and inject book cover layout on the right (Option B)
        if (typeof window === 'undefined' || !window.DOMParser) {
            return html;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const docHeadings = doc.querySelectorAll('h2, h3');

            docHeadings.forEach((heading) => {
                const headingText = heading.textContent || '';
                const headingClean = headingText.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!headingClean) return;

                // Try to find the book in the database relatedBooks array first
                const matchedDbBook = relatedBooks?.find(book => {
                    const bookClean = book.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return headingClean.includes(bookClean) || bookClean.includes(headingClean);
                });

                // Try to find the book in our static fallback array
                const matchedStaticBook = FEATURED_BOOKS_DATA.find(book => {
                    const bookClean = book.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return headingClean.includes(bookClean) || bookClean.includes(headingClean);
                });

                const matchedBook = matchedDbBook || matchedStaticBook;

                if (matchedBook) {
                    // Collect subsequent siblings until the next heading tag
                    const siblings = [];
                    let next = heading.nextElementSibling;
                    while (next && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(next.tagName)) {
                        siblings.push(next);
                        next = next.nextElementSibling;
                    }

                    // Create layout container: Image on RIGHT on desktop (md:flex-row-reverse)
                    const container = doc.createElement('div');
                    container.className = "flex gap-6 md:gap-8 mb-12 flex-col md:flex-row-reverse items-start";

                    // Book Cover Column
                    const coverCol = doc.createElement('div');
                    coverCol.className = "w-full md:w-40 flex-shrink-0";

                    // Prioritize database book's coverImage/thumbnail, fallback to static coverImage
                    const dbCover = matchedDbBook ? (matchedDbBook.coverImage || matchedDbBook.thumbnail) : '';
                    const resolvedCoverUrl = dbCover
                        ? getBookThumbnailUrl(matchedDbBook)
                        : (matchedStaticBook ? matchedStaticBook.coverImage : getBookThumbnailUrl(matchedBook));

                    const img = doc.createElement('img');
                    img.src = resolvedCoverUrl;
                    img.alt = matchedBook.title;
                    img.className = "w-full h-auto rounded-lg shadow-lg border border-purple-500/10 hover:scale-[1.02] transition-transform duration-300";
                    coverCol.appendChild(img);

                    // Book Details Column
                    const detailsCol = doc.createElement('div');
                    detailsCol.className = "flex-1 w-full overflow-hidden";

                    // Add heading to details
                    const clonedHeading = heading.cloneNode(true);
                    clonedHeading.className = "text-2xl font-bold text-white mb-2";
                    clonedHeading.removeAttribute('style');
                    detailsCol.appendChild(clonedHeading);

                    // Add details and style links
                    let hasReadLink = false;
                    siblings.forEach(sib => {
                        const clonedSib = sib.cloneNode(true);

                        const links = clonedSib.querySelectorAll('a');
                        links.forEach(link => {
                            if (link.getAttribute('href')?.includes('/read/') || link.getAttribute('href')?.includes('/book/')) {
                                hasReadLink = true;
                                link.className = "text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 transition-colors";
                            }
                        });

                        detailsCol.appendChild(clonedSib);
                    });

                    // Add fallback read link if not found in sibling content
                    if (!hasReadLink) {
                        const readLink = `/read/${matchedBook.slug}`;
                        const linkPara = doc.createElement('p');
                        linkPara.className = "mt-4";
                        const a = doc.createElement('a');
                        a.href = readLink;
                        a.className = "text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 transition-colors";
                        a.textContent = `Read ${matchedBook.title} Free on Readify AI`;
                        linkPara.appendChild(a);
                        detailsCol.appendChild(linkPara);
                    }

                    container.appendChild(coverCol);
                    container.appendChild(detailsCol);

                    // Replace original nodes in the document
                    heading.parentNode.replaceChild(container, heading);
                    siblings.forEach(sib => {
                        sib.parentNode.removeChild(sib);
                    });
                } else {
                    // Style links even if heading did not match a featured book
                    const links = heading.parentNode.querySelectorAll('a');
                    links.forEach(link => {
                        const href = link.getAttribute('href') || '';
                        if (href.includes('/read/') || href.includes('/book/') || link.textContent.toLowerCase().includes('read')) {
                            link.className = "text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1 transition-colors";
                        }
                    });
                }
            });

            return doc.body.innerHTML;
        } catch (e) {
            console.error('[BlogDetailPage] Error parsing blog HTML:', e);
            return html;
        }
    }, [content, relatedBooks]);

    // Article schema JSON-LD for rich snippets
    const schemaOrgMarkup = useMemo(() => {
        if (!blog) return null;
        return {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": blog.title,
            "image": [blog.coverImage || ''],
            "datePublished": blog.publishedAt || blog.createdAt,
            "dateModified": blog.updatedAt || blog.createdAt,
            "author": [{
                "@type": "Person",
                "name": blog.author?.username || 'Admin'
            }],
            "description": blog.excerpt || ''
        };
    }, [blog]);

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        const shareUrl = `${window.location.origin}/blog/${slug}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [slug]);

    return (
        <React.Fragment>
            {/* 1. SEO Helmet Wrapper */}
            {blog && (
                <SEO
                    title={`${blog.title} | Readify AI`}
                    description={blog.excerpt ? blog.excerpt.slice(0, 160) : ''}
                    image={blog.coverImage}
                    path={`/blog/${blog.slug}`}
                    schema={schemaOrgMarkup}
                />
            )}

            {/* 2. Reading Progress Indicator */}
            {!loading && blog && (
                <div
                    className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 z-[100] transition-all duration-100 ease-out"
                    style={{ width: `${scrollPercent}%` }}
                />
            )}

            {/* 3. MainLayout Wrapper */}
            <MainLayout>
                <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
                    {loading ? (
                        <LoadingSkeleton />
                    ) : error ? (
                        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-8 text-center max-w-md mx-auto my-12 animate-[fadeIn_200ms_ease-out]">
                            <span className="text-3xl">⚠️</span>
                            <h3 className="mt-3 text-base font-bold text-white">Could not load article</h3>
                            <p className="mt-2 text-xs text-rose-300/80 leading-relaxed">{error}</p>

                            <div className="mt-6 flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={fetchBlogDetail}
                                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/10 cursor-pointer"
                                >
                                    Retry
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/blog')}
                                    className="inline-flex items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/5 px-5 py-2.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/10 hover:text-white"
                                >
                                    Back to Blog
                                </button>
                            </div>
                        </div>
                    ) : !blog ? (
                        <div className="rounded-2xl border border-purple-500/20 bg-slate-950/20 py-16 text-center max-w-md mx-auto">
                            <span className="text-3xl">📭</span>
                            <h3 className="mt-3 text-sm font-bold text-white">Article not found</h3>
                            <Link
                                to="/blog"
                                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/10"
                            >
                                Back to Blog
                            </Link>
                        </div>
                    ) : (
                        <div className="animate-[fadeIn_250ms_ease-out] flex flex-col">
                            
                            {/* 4. Header Navigation */}
                            <div className="flex items-center justify-between mb-6 sm:mb-8 select-none">
                                <Link
                                    to="/blog"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/20 bg-slate-900/60 text-slate-300 hover:text-white hover:border-purple-500/40 transition duration-300"
                                    title="Back to Blog"
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7 7-7" />
                                    </svg>
                                </Link>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest ${getCategoryBadgeStyles(blog.category)}`}>
                                    • {blog.category}
                                </span>
                            </div>

                            {/* 5. Cover Image Illustration box */}
                            {blog.coverImage && (
                                <div className="rounded-3xl border border-purple-500/20 bg-slate-900/30 p-4 sm:p-5 mb-6 shadow-2xl relative select-none">
                                    <img
                                        src={blog.coverImage}
                                        alt={blog.title}
                                        className="w-full aspect-[16/10] sm:aspect-[16/9] object-cover rounded-2xl shadow-lg border border-purple-500/10"
                                    />
                                </div>
                            )}

                            {/* 6. Meta Row */}
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-4">
                                <span>{formattedDate}</span>
                                <span>{readTime}</span>
                            </div>

                            {/* 7. Title */}
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight text-left mb-6">
                                {blog.title}
                            </h1>

                            {/* 8. Author Block Header */}
                            <div className="flex items-center gap-3 border-b border-purple-500/10 pb-5 mb-8 text-left">
                                <div className="h-10 w-10 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/20 flex items-center justify-center font-bold text-purple-300 shrink-0">
                                    {blog.author?.avatar ? (
                                        <img src={blog.author.avatar} alt={blog.author?.username} className="h-full w-full object-cover" />
                                    ) : (
                                        (blog.author?.username || 'A').charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="text-white text-xs font-bold">{blog.author?.username || 'Admin'}</p>
                                    <p className="text-slate-500 text-[10px] mt-0.5">Chief Editor & Curator</p>
                                </div>
                            </div>

                            {/* 9. HTML Content Rendering */}
                            <div
                                className="blog-content-html blog-content prose-blog text-slate-300 text-base leading-relaxed space-y-6 text-left 
                                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-8
                                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-purple-300 [&_h2]:mb-3 [&_h2]:mt-8
                                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-205 [&_h3]:mb-2 [&_h3]:mt-6
                                [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-4
                                [&_a]:text-purple-400 [&_a]:underline hover:text-purple-300 [&_a]:transition-colors
                                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:text-slate-300
                                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:text-slate-300
                                [&_li]:pl-1
                                [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-6 [&_img]:h-auto [&_img]:shadow-lg
                                [&_blockquote]:border-l-4 [&_blockquote]:border-purple-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400 [&_blockquote]:my-6
                                [&_pre]:bg-slate-900 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-6
                                [&_code]:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-purple-300 [&_code]:text-sm
                                prose prose-invert max-w-none transition-colors duration-300 clearfix"
                                dangerouslySetInnerHTML={{ __html: processedContent }}
                            />

                            {/* 10. Tags Row */}
                            {blog.tags && blog.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-purple-500/10">
                                    {blog.tags.map(tag => (
                                        <span key={tag} className="text-xs font-semibold text-slate-300 bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-lg">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* 11. Bottom Recommendations & widgets */}
                            <div className="mt-12 space-y-12 border-t border-purple-500/10 pt-10">
                                {/* About the Author */}
                                <div className="rounded-2xl border border-purple-500/20 bg-slate-900/85 p-6 flex flex-col sm:flex-row gap-5 items-center text-left hover:border-purple-500/30 transition-all duration-300 animate-[fadeIn_200ms_ease-out]">
                                    <div className="h-14 w-14 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex items-center justify-center text-xl font-bold text-purple-300 shrink-0">
                                        {blog.author?.avatar ? (
                                            <img src={blog.author.avatar} alt={blog.author?.username} className="h-full w-full object-cover" />
                                        ) : (
                                            (blog.author?.username || 'A').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">About the Author: {blog.author?.username || 'Admin'}</h4>
                                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                                            {blog.author?.bio || 'Passionate writer, literary analyst, and curator of the Readify AI journal. Sharing the best reading recommendations, studying insights, and classic book deep dives.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Mentioned Books Gallery */}
                                <BookCoversGallery relatedBooks={relatedBooks} slug={slug} />

                                {/* Related Books detail list */}
                                <RelatedBooks relatedBooks={relatedBooks} />

                                {/* Related Blog Posts */}
                                <RelatedBlogs relatedBlogs={relatedPosts} />

                                {/* Reading CTA banner */}
                                <BlogCTA />

                                {/* Subscribe Form */}
                                <Subscribe />
                            </div>

                        </div>
                    )}
                </div>
            </MainLayout>

            {/* 12. Centered Floating Actions Bar */}
            {!loading && blog && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-6 rounded-2xl border border-purple-500/30 bg-slate-950/80 backdrop-blur-md px-6 py-3 shadow-2xl transition-all duration-300 animate-[fadeIn_200ms_ease-out]">
                    <button
                        type="button"
                        onClick={() => setIsBookmarked(prev => !prev)}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer transform active:scale-75"
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark Article"}
                    >
                        {isBookmarked ? <FaBookmark className="text-purple-400 text-sm" /> : <FaRegBookmark className="text-sm" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsLiked(prev => !prev)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer transform active:scale-75"
                        title={isLiked ? "Unlike Article" : "Like Article"}
                    >
                        {isLiked ? <FaHeart className="text-rose-500 text-sm" /> : <FaRegHeart className="text-sm" />}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="text-slate-400 hover:text-purple-400 transition-colors cursor-pointer transform active:scale-75"
                        title="Copy Article Link"
                    >
                        {copied ? <FaCheck className="text-emerald-500 text-sm" /> : <FaCopy className="text-sm" />}
                    </button>
                </div>
            )}

            {/* 13. Floating Back to Top Button */}
            {showBackToTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-[60] flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-750 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition duration-305 animate-[fadeIn_200ms_ease-out] cursor-pointer"
                    aria-label="Back to top"
                >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                    </svg>
                </button>
            )}
        </React.Fragment>
    );
}
