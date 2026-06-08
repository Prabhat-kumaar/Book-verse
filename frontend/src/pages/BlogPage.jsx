import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaRegBookmark, FaRegHeart, FaBookmark, FaHeart } from 'react-icons/fa';
import SEO from '../components/SEO';
import MainLayout from '../layout/MainLayout';
import { buildApiUrl } from '../lib/apiConfig';

// Allowed blog categories for filtering
const CATEGORIES = [
    "All Categories",
    "Classic Books",
    "Study Tips",
    "Literary Analysis",
    "Reading Guides",
    "Author Profiles",
    "Tips & Tricks"
];

// Helper to format date
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
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
 * Component: Typing Effect for Subtitle
 */
const TypingEffect = React.memo(function TypingEffect({ texts, speed = 80, delay = 1800 }) {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fullText = texts[currentTextIndex];
        let timer;

        if (isDeleting) {
            timer = setTimeout(() => {
                setDisplayedText(prev => prev.slice(0, -1));
            }, speed / 2);
        } else {
            timer = setTimeout(() => {
                setDisplayedText(prev => fullText.slice(0, prev.length + 1));
            }, speed);
        }

        if (!isDeleting && displayedText === fullText) {
            timer = setTimeout(() => setIsDeleting(true), delay);
        } else if (isDeleting && displayedText === '') {
            setIsDeleting(false);
            setCurrentTextIndex(prev => (prev + 1) % texts.length);
        }

        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, currentTextIndex, texts, speed, delay]);

    return (
        <span className="text-purple-400 font-bold inline-block border-r-2 border-purple-400 pr-1 animate-[pulse_1.5s_infinite] min-h-[1.5em]">
            {displayedText}
        </span>
    );
});

/**
 * Custom Shimmer block for skeleton loaders
 */
const Shine = React.memo(function Shine({ className = '' }) {
    return (
        <div className={`relative overflow-hidden rounded border border-purple-500/10 bg-slate-900/60 ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    );
});

/**
 * Loading Skeleton Card component for Blog posts
 */
const BlogCardSkeleton = React.memo(function BlogCardSkeleton() {
    return (
        <article className="overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/40">
            <div className="relative h-48 overflow-hidden bg-slate-800/40 w-full">
                <div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
            <div className="p-5">
                <Shine className="h-5 w-4/5 mb-3" />
                <Shine className="h-3 w-full mb-2" />
                <Shine className="h-3 w-5/6 mb-4" />
                <div className="flex items-center justify-between border-t border-purple-500/10 pt-4">
                    <div className="flex items-center gap-2.5">
                        <Shine className="h-7 w-7 rounded-full" />
                        <div className="space-y-1">
                            <Shine className="h-2.5 w-14" />
                            <Shine className="h-2 w-10" />
                        </div>
                    </div>
                    <Shine className="h-3.5 w-12" />
                </div>
                <Shine className="h-9 w-full rounded-xl mt-4" />
            </div>
        </article>
    );
});

/**
 * Sub-component: Hero Section
 * Renders title and subtitle of the blog page with premium gradients
 */
const Hero = React.memo(function Hero() {
    const typingTexts = useMemo(() => [
        "reading guides & book reviews.",
        "study tips & learning tools.",
        "literary explorations & reviews."
    ], []);

    return (
        <div className="relative h-[300px] w-full rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#0a0f24] via-[#3b1c75] to-[#090514] p-6 sm:p-10 flex flex-col justify-center text-left shadow-2xl mb-8 animate-[fadeIn_200ms_ease-out]">
            {/* Subtle grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

            {/* Ambient blur glow blobs */}
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
                <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-purple-300 border border-purple-500/20 uppercase">
                    Literary Journal
                </span>
                <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                    Discover Our Blog
                </h1>
                <p className="mt-4 text-sm sm:text-base text-slate-350 leading-relaxed font-medium">
                    Deep dive into <TypingEffect texts={typingTexts} speed={85} delay={1800} />
                </p>
            </div>
        </div>
    );
});

/**
 * Sub-component: Search & Filter Bar
 * Renders search input, category dropdown, sort options, and clear button
 */
const SearchBar = React.memo(function SearchBar({
    searchInput,
    setSearchInput,
    category,
    handleCategoryChange,
    sort,
    handleSortChange,
    hasActiveFilters,
    handleClearFilters
}) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-purple-500/10 animate-[fadeIn_220ms_ease-out]">
            <div className="flex flex-1 flex-col sm:flex-row gap-4">
                {/* Search input field */}
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 text-lg select-none">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search articles..."
                        className="w-full rounded-2xl border border-purple-500/20 bg-slate-950/40 py-3 pl-12 pr-4 text-sm font-semibold text-white placeholder-slate-500 outline-none transition duration-300 hover:border-purple-500/40 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                </div>

                {/* Category selector */}
                <div className="w-full sm:w-52">
                    <select
                        value={category || 'All Categories'}
                        onChange={handleCategoryChange}
                        className="w-full cursor-pointer rounded-2xl border border-purple-500/20 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-white outline-none transition duration-300 hover:border-purple-500/40 focus:border-purple-500"
                    >
                        {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-slate-950 text-white font-medium py-1">
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sort dropdown */}
                <div className="w-full sm:w-44">
                    <select
                        value={sort}
                        onChange={handleSortChange}
                        className="w-full cursor-pointer rounded-2xl border border-purple-500/20 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-white outline-none transition duration-300 hover:border-purple-500/40 focus:border-purple-500"
                    >
                        <option value="latest" className="bg-slate-950 text-white font-medium py-1">Latest</option>
                        <option value="popular" className="bg-slate-950 text-white font-medium py-1">Most Popular</option>
                    </select>
                </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-purple-500/20 bg-purple-500/5 px-5 py-3 text-xs font-bold text-slate-355 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200"
                >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                </button>
            )}
        </div>
    );
});

/**
 * Sub-component: Blog Grid layout wrapper
 */
const BlogGrid = React.memo(function BlogGrid({ children }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 animate-[fadeIn_250ms_ease-out]">
            {children}
        </div>
    );
});

/**
 * Helper to resolve colored category badges matching I-CARD design
 */
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

/**
 * Sub-component: BlogCard Card item redesigned to match I-CARD spec
 */
const BlogCard = React.memo(function BlogCard({ blog }) {
    const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
    const readTime = Math.ceil(wordCount / 200) || 1;
    const blogUrl = `/blog/${blog.slug}`;

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    return (
        <article className="group relative flex flex-col p-4 sm:p-5 rounded-3xl border border-purple-500/20 bg-slate-900/50 hover:shadow-2xl hover:shadow-purple-500/25 hover:border-purple-500/35 transition-all duration-300 hover:scale-[1.01] text-left h-full justify-between">
            <div>
                {/* Rounded Cover Image container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950/60 mb-4 select-none">
                    <Link to={blogUrl} className="block h-full w-full">
                        {blog.coverImage ? (
                            <img
                                loading="lazy"
                                src={blog.coverImage}
                                alt={blog.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 p-3 text-center text-xs font-semibold text-white">
                                {blog.title}
                            </div>
                        )}
                    </Link>
                    {/* Read time badge on cover */}
                    <div className="absolute top-3 right-3 z-10">
                        <span className="bg-slate-950/80 border border-purple-500/25 text-purple-200 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wide uppercase backdrop-blur-md">
                            {readTime} min read
                        </span>
                    </div>
                </div>

                {/* Category & Icons row */}
                <div className="flex items-center justify-between mb-3.5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase border ${getCategoryBadgeStyles(blog.category)}`}>
                        {blog.category}
                    </span>
                    <div className="flex items-center gap-3 text-slate-405 select-none">
                        <button
                            type="button"
                            onClick={() => setIsBookmarked(prev => !prev)}
                            className="focus:outline-none transition-all duration-200 hover:text-white transform active:scale-75 cursor-pointer"
                            title={isBookmarked ? "Remove Bookmark" : "Bookmark Post"}
                        >
                            {isBookmarked ? (
                                <FaBookmark className="text-purple-400 animate-[pulse_0.2s_ease-out] text-xs" />
                            ) : (
                                <FaRegBookmark className="text-xs" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLiked(prev => !prev)}
                            className="focus:outline-none transition-all duration-200 hover:text-rose-400 transform active:scale-75 cursor-pointer"
                            title={isLiked ? "Unlike" : "Like Post"}
                        >
                            {isLiked ? (
                                <FaHeart className="text-rose-500 animate-[pulse_0.2s_ease-out] text-xs" />
                            ) : (
                                <FaRegHeart className="text-xs" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Blog title */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 line-clamp-2 hover:text-purple-400 transition-colors leading-snug">
                    <Link to={blogUrl}>{blog.title}</Link>
                </h3>

                {/* Blog Excerpt */}
                <p className="text-slate-405 text-xs mb-4 line-clamp-3 leading-relaxed">
                    {truncateExcerpt(blog.excerpt || 'No description available.')}
                </p>
            </div>

            <div>
                {/* Read full article button (aligned to the right) */}
                <div className="flex justify-end mb-4">
                    <Link
                        to={blogUrl}
                        className="bg-yellow-400 hover:bg-yellow-350 text-black text-[11px] font-extrabold px-5 py-2.5 rounded-full transition-all duration-300 shadow-md hover:shadow-yellow-500/10 flex items-center gap-1 select-none"
                    >
                        Read full article &rarr;
                    </Link>
                </div>

                {/* Author Block Row */}
                <div className="flex items-center justify-between border-t border-purple-500/10 pt-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-purple-500/20 ring-1 ring-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-300 shrink-0">
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
                        <div className="text-left">
                            <p className="text-slate-200 text-xs font-bold leading-none">{blog.author?.username || 'Admin'}</p>
                            <p className="text-slate-500 text-[10px] mt-1">{formatDate(blog.publishedAt || blog.createdAt)}</p>
                        </div>
                    </div>
                    <div className="text-purple-400 text-xs font-semibold flex items-center gap-1.5 shrink-0 select-none">
                        <span>👁️</span>
                        <span>{blog.viewCount || 0} views</span>
                    </div>
                </div>
            </div>
        </article>
    );
});

/**
 * Sub-component: LoadingState skeleton layout loader
 */
const LoadingState = React.memo(function LoadingState() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 animate-pulse">
            {Array.from({ length: 6 }).map((_, idx) => (
                <BlogCardSkeleton key={idx} />
            ))}
        </div>
    );
});

/**
 * Sub-component: ErrorState message panel
 */
const ErrorState = React.memo(function ErrorState({ error, onRetry }) {
    return (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-8 text-center max-w-md mx-auto my-8 animate-[fadeIn_200ms_ease-out]">
            <span className="text-3xl">⚠️</span>
            <h3 className="mt-3 text-base font-bold text-white">Failed to load articles</h3>
            <p className="mt-1.5 text-xs text-rose-300/80 leading-relaxed">{error}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-750 px-5 py-2 text-xs font-bold text-white transition hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/10 cursor-pointer"
            >
                Retry
            </button>
        </div>
    );
});

/**
 * Sub-component: EmptyState display when list is empty
 */
const EmptyState = React.memo(function EmptyState({ hasActiveFilters, onClear }) {
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-950/20 py-16 text-center max-w-md mx-auto animate-[fadeIn_200ms_ease-out] flex flex-col items-center p-6">
            <span className="text-8xl mb-4 select-none" role="img" aria-label="newsletter">📰</span>
            <h3 className="text-xl font-bold text-white">No articles found</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                {hasActiveFilters ? "Try adjusting your filters or search keywords to find what you are looking for." : "Check back later for new updates and literary guides."}
            </p>
            <div className="mt-6 flex gap-3">
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="inline-flex items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-xs font-bold text-white transition hover:border-purple-500 hover:bg-purple-500/20 cursor-pointer"
                    >
                        Reset Filters
                    </button>
                )}
                <Link
                    to="/books"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/10"
                >
                    Explore Books
                </Link>
            </div>
        </div>
    );
});

/**
 * Sub-component: Pagination controls
 */
const Pagination = React.memo(function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
        <div className="mt-12 flex justify-center items-center gap-3 select-none">
            {/* Prev button */}
            <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-slate-900/40 text-sm font-bold text-white transition hover:border-purple-500/50 hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-purple-500/20 disabled:hover:bg-transparent cursor-pointer"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {startPage > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => onPageChange(1)}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold transition duration-300 cursor-pointer ${currentPage === 1
                                ? 'border-purple-500 bg-purple-650 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-355 hover:border-purple-500/50 hover:bg-slate-900'
                            }`}
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="px-1 text-slate-550 font-bold">...</span>}
                </>
            )}

            {Array.from({ length: endPage - startPage + 1 }).map((_, idx) => {
                const pageNum = startPage + idx;
                return (
                    <button
                        key={pageNum}
                        type="button"
                        onClick={() => onPageChange(pageNum)}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold transition duration-300 cursor-pointer ${currentPage === pageNum
                                ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-355 hover:border-purple-500/50 hover:bg-slate-900'
                            }`}
                    >
                        {pageNum}
                    </button>
                );
            })}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="px-1 text-slate-550 font-bold">...</span>}
                    <button
                        type="button"
                        onClick={() => onPageChange(totalPages)}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold transition duration-300 cursor-pointer ${currentPage === totalPages
                                ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-355 hover:border-purple-500/50 hover:bg-slate-900'
                            }`}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            {/* Next button */}
            <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-slate-900/40 text-sm font-bold text-white transition hover:border-purple-500/50 hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-purple-500/20 disabled:hover:bg-transparent cursor-pointer"
            >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
});

/**
 * Sidebar Sub-component: Featured Post card
 */
const FeaturedPost = React.memo(function FeaturedPost({ blog }) {
    if (!blog) return null;
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left transition-all duration-300 hover:border-purple-500/40">
            <h4 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider">★ Featured Article</h4>
            {blog.coverImage && (
                <Link to={`/blog/${blog.slug}`} className="block overflow-hidden rounded-xl aspect-[16/9] mb-3">
                    <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 animate-[fadeIn_200ms_ease-out]" />
                </Link>
            )}
            <div className="mb-2">
                <span className="inline-block bg-purple-650 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {blog.category}
                </span>
            </div>
            <h5 className="text-xs sm:text-sm font-bold text-white mb-2 line-clamp-2 hover:text-purple-400 transition-colors leading-snug">
                <Link to={`/blog/${blog.slug}`}>{blog.title}</Link>
            </h5>
            <p className="text-slate-400 text-xs mb-3.5 line-clamp-3 leading-relaxed">
                {truncateExcerpt(blog.excerpt)}
            </p>
            <Link to={`/blog/${blog.slug}`} className="text-xs font-extrabold text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-1 transition-colors">
                Read Featured Article &rarr;
            </Link>
        </div>
    );
});

/**
 * Sidebar Sub-component: Categories List
 */
const SidebarCategories = React.memo(function SidebarCategories({ activeCategory, onSelectCategory, getCount }) {
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Categories</h4>
            <div className="flex flex-col gap-1.5 border-t border-purple-500/10 pt-3">
                {CATEGORIES.map(cat => {
                    const active = (cat === 'All Categories' && !activeCategory) || (activeCategory === cat);
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => onSelectCategory(cat)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                active
                                    ? 'bg-purple-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.25)]'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span>{cat}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                active ? 'bg-white/20 text-white' : 'bg-purple-600/10 border border-purple-500/20 text-purple-300'
                            }`}>
                                {getCount(cat)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Popular Posts List
 */
const PopularPosts = React.memo(function PopularPosts({ posts }) {
    if (!posts || posts.length === 0) return null;
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Popular Articles</h4>
            <div className="flex flex-col gap-3.5 border-t border-purple-500/10 pt-3">
                {posts.map(post => (
                    <Link key={post.slug} to={`/blog/${post.slug}`} className="group flex gap-3 items-center min-w-0">
                        {post.coverImage ? (
                            <div className="h-10 w-14 overflow-hidden rounded-lg bg-slate-950/60 border border-purple-500/10 shrink-0 shadow-md">
                                <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                        ) : (
                            <div className="h-10 w-14 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-lg shrink-0 flex items-center justify-center text-[9px] text-white font-bold px-1 text-center line-clamp-2">
                                {post.title}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-white line-clamp-2 group-hover:text-purple-400 transition-colors leading-tight">
                                {post.title}
                            </h5>
                            <p className="text-[9px] text-slate-500 mt-1">{formatDate(post.publishedAt || post.createdAt)}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Tags cloud list
 */
const SidebarTags = React.memo(function SidebarTags({ tags, onSelectTag }) {
    if (!tags || tags.length === 0) return null;
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Popular Tags</h4>
            <div className="flex flex-wrap gap-2 border-t border-purple-500/10 pt-3">
                {tags.map(tag => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => onSelectTag(tag)}
                        className="text-[10px] font-bold text-slate-300 bg-purple-500/5 border border-purple-500/10 px-2.5 py-1 rounded-lg transition-all hover:border-purple-500/40 hover:text-white cursor-pointer"
                    >
                        #{tag}
                    </button>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Blog metrics stats
 */
const BlogStats = React.memo(function BlogStats({ totalPosts, totalViews, totalReads }) {
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Stats Summary</h4>
            <div className="grid grid-cols-3 gap-2 border-t border-purple-500/10 pt-3">
                <div className="bg-slate-950/40 border border-purple-500/10 p-2.5 rounded-xl text-center shadow-inner">
                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Posts</p>
                    <p className="text-sm font-black text-white mt-1">{totalPosts}</p>
                </div>
                <div className="bg-slate-950/40 border border-purple-500/10 p-2.5 rounded-xl text-center shadow-inner">
                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Views</p>
                    <p className="text-sm font-black text-white mt-1">{totalViews}</p>
                </div>
                <div className="bg-slate-950/40 border border-purple-500/10 p-2.5 rounded-xl text-center shadow-inner">
                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-wider">Mins</p>
                    <p className="text-sm font-black text-white mt-1">{totalReads}</p>
                </div>
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Newsletter subscribe widget
 */
const SidebarSubscribe = React.memo(function SidebarSubscribe() {
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (email.trim()) {
            setSuccess(true);
            setEmail('');
        }
    };

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider relative">Stay Inspired</h4>
            <p className="text-xs text-slate-400 mt-1 relative">Get book guides and summaries weekly.</p>
            {success ? (
                <div className="mt-3.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-center text-xs text-emerald-300 font-bold animate-[fadeIn_200ms_ease-out]">
                    Subscription success! ✓
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2 relative">
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-purple-500/20 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-purple-500"
                    />
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-2 text-xs font-bold text-white transition shadow-md shadow-purple-500/10 cursor-pointer"
                    >
                        Subscribe
                    </button>
                </form>
            )}
        </div>
    );
});

/**
 * Sidebar Sub-component: Chief Editor details
 */
const SidebarAuthorInfo = React.memo(function SidebarAuthorInfo() {
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">About the Author</h4>
            <div className="flex items-center gap-3 border-t border-purple-500/10 pt-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-purple-500/20 ring-1 ring-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                    PJ
                </div>
                <div>
                    <p className="text-white text-xs font-bold">Praveen Juge</p>
                    <p className="text-slate-550 text-[10px] mt-0.5">Design Engineer & Chief Editor</p>
                </div>
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Upcoming Tech Events list
 */
const SidebarEvents = React.memo(function SidebarEvents() {
    const events = [
        { title: "React Conf 2026", date: "June 15-16, 2026", type: "Virtual" },
        { title: "Local Web Dev Meetup", date: "June 22, 2026", type: "Tech Hub" },
        { title: "JavaScript Workshop", date: "July 10, 2026", type: "Online" }
    ];
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Upcoming Events</h4>
            <div className="flex flex-col gap-3.5 border-t border-purple-500/10 pt-3">
                {events.map((e, idx) => (
                    <div key={idx} className="text-xs">
                        <p className="text-white font-bold">{e.title}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">{e.date} • {e.type}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Reading list with progress statuses
 */
const SidebarReadingList = React.memo(function SidebarReadingList() {
    const items = [
        { title: "Clean Code: A Handbook of Agile...", status: "In Progress", color: "bg-blue-500/10 text-blue-400" },
        { title: "Design Patterns: Elements of Re...", status: "Next", color: "bg-slate-800 text-slate-400" },
        { title: "The Pragmatic Programmer", status: "Next", color: "bg-slate-800 text-slate-400" }
    ];
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Reading List</h4>
            <div className="flex flex-col gap-2.5 border-t border-purple-500/10 pt-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2 text-xs">
                        <p className="text-slate-300 font-medium line-clamp-1">{item.title}</p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold shrink-0 uppercase tracking-wide ${item.color}`}>
                            {item.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Quotes and Testimonials
 */
const SidebarTestimonials = React.memo(function SidebarTestimonials() {
    const quotes = [
        { text: "This blog has been an invaluable resource in my journey as a developer. The tutorials are clean and clear.", author: "Alex Johnson" },
        { text: "I've been following this blog for years, and it never fails to keep me updated with web tech.", author: "Sarah Lee" }
    ];
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">What Our Readers Say</h4>
            <div className="flex flex-col gap-3.5 border-t border-purple-500/10 pt-3">
                {quotes.map((q, idx) => (
                    <div key={idx} className="text-[11px] leading-relaxed">
                        <p className="text-slate-400 italic">"{q.text}"</p>
                        <p className="text-slate-500 font-semibold mt-1">— {q.author}</p>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Recent comments list
 */
const SidebarRecentComments = React.memo(function SidebarRecentComments() {
    const comments = [
        { author: "John Doe", text: "Great article! Thanks for sharing." },
        { author: "Jane Smith", text: "This helped me solve a tricky problem." }
    ];
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Recent Comments</h4>
            <div className="flex flex-col gap-3 border-t border-purple-500/10 pt-3">
                {comments.map((c, idx) => (
                    <div key={idx} className="text-xs">
                        <p className="text-white font-bold">{c.author}</p>
                        <p className="text-slate-400 mt-0.5 line-clamp-1">"{c.text}"</p>
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Recent/Related posts link list
 */
const SidebarRelatedPosts = React.memo(function SidebarRelatedPosts({ blogs }) {
    if (!blogs || blogs.length === 0) return null;
    const displayPosts = blogs.slice(0, 3);
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Related Posts</h4>
            <div className="flex flex-col gap-2.5 border-t border-purple-500/10 pt-3">
                {displayPosts.map(post => (
                    <Link key={post.slug} to={`/blog/${post.slug}`} className="text-xs font-semibold text-slate-300 hover:text-purple-400 transition-colors line-clamp-1 block py-0.5">
                        {post.title}
                    </Link>
                ))}
            </div>
        </div>
    );
});

/**
 * Sidebar Sub-component: Sidebar search input box
 */
const SidebarSearch = React.memo(function SidebarSearch({ value, onChange }) {
    return (
        <div className="rounded-2xl border border-purple-500/20 bg-slate-900/80 p-4 text-left">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Search</h4>
            <div className="relative border-t border-purple-500/10 pt-3">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Search posts..."
                    className="w-full rounded-xl border border-purple-500/20 bg-slate-950/40 py-2 pl-3 pr-8 text-xs font-semibold text-white placeholder-slate-500 outline-none transition focus:border-purple-500"
                />
                <span className="absolute right-2.5 top-[23px] text-slate-400 text-xs select-none">🔍</span>
            </div>
        </div>
    );
});

/**
 * Main BlogPage Component
 * Fulfills requested layout hierarchy:
 * BlogPage -> Helmet (SEO) -> MainLayout -> Hero -> SearchBar -> BlogGrid (with BlogCards) / Loading / Error / Empty -> Pagination
 */
export default function BlogPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Query parameters parsed from URL
    const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'latest';

    // State
    const [blogs, setBlogs] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Input state for search
    const [searchInput, setSearchInput] = useState(search);

    // Track previous parameters to determine if a change is search-input-triggered
    const prevParamsRef = React.useRef({ category, page: currentPage, search });

    // Sync input field value when URL parameters change (back button / clear)
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    // Debounce search input changes (300ms delay)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchInput !== search) {
                const newParams = new URLSearchParams(searchParams);
                if (searchInput.trim()) {
                    // Navigate with raw searchInput to preserve trailing/multiple spaces while typing
                    newParams.set('search', searchInput);
                } else {
                    newParams.delete('search');
                }
                newParams.set('page', '1'); // Reset pagination on new search
                setSearchParams(newParams);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchInput, search, searchParams, setSearchParams]);

    // Fetch blogs API implementation
    const fetchBlogs = async (isSearchChange = false) => {
        // Only set loading to true (which renders the skeleton) if it is not a search keystroke update
        // or if we have no blogs loaded yet.
        if (!isSearchChange || blogs.length === 0) {
            setLoading(true);
        }
        setError('');

        try {
            const limit = 10;
            const queryParams = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
                category: category || '',
                search: search || '',
                sort: sort
            });
            const url = buildApiUrl(`/blogs?${queryParams.toString()}`);

            console.log(`[BlogPage] API call: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch blogs');
            }

            setBlogs(data.blogs || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('[BlogPage] Error fetching blogs:', err);
            setError(err.message || 'An error occurred while loading the blogs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Refetch when url queries change
    useEffect(() => {
        const isSearchChange = prevParamsRef.current.search !== search &&
                               prevParamsRef.current.category === category &&
                               prevParamsRef.current.page === currentPage;

        prevParamsRef.current = { category, page: currentPage, search };

        fetchBlogs(isSearchChange);
    }, [currentPage, category, search, sort]);

    // Filters update handlers
    const handleCategoryChange = useCallback((e) => {
        const cat = e.target.value;
        const newParams = new URLSearchParams(searchParams);
        if (cat && cat !== 'All Categories') {
            newParams.set('category', cat);
        } else {
            newParams.delete('category');
        }
        newParams.set('page', '1');
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    const handleSortChange = useCallback((e) => {
        const sortVal = e.target.value;
        const newParams = new URLSearchParams(searchParams);
        newParams.set('sort', sortVal);
        newParams.set('page', '1');
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    const handleClearFilters = useCallback(() => {
        setSearchInput('');
        setSearchParams({});
    }, [setSearchParams]);

    const handlePageChange = useCallback((pageNum) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', String(pageNum));
        setSearchParams(newParams);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [searchParams, setSearchParams]);

    // Category click handler from sidebar
    const selectCategory = useCallback((catName) => {
        const newParams = new URLSearchParams(searchParams);
        if (catName && catName !== 'All Categories') {
            newParams.set('category', catName);
        } else {
            newParams.delete('category');
        }
        newParams.set('page', '1');
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    // Tag click handler from sidebar
    const selectTag = useCallback((tag) => {
        setSearchInput(tag);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('search', tag);
        newParams.set('page', '1');
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);

    // Calculate category counts dynamically for loaded list
    const getCategoryCount = useCallback((catName) => {
        if (catName === 'All Categories') return blogs.length;
        return blogs.filter(b => b.category === catName).length;
    }, [blogs]);

    const hasActiveFilters = useMemo(() => {
        return !!(category || search || sort !== 'latest');
    }, [category, search, sort]);

    // Compute sidebar dynamic values
    const popularPosts = useMemo(() => {
        if (!blogs || !Array.isArray(blogs)) return [];
        return [...blogs]
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 3);
    }, [blogs]);

    const uniqueTags = useMemo(() => {
        if (!blogs || !Array.isArray(blogs)) return [];
        const tagsSet = new Set();
        blogs.forEach(blog => {
            if (blog.tags && Array.isArray(blog.tags)) {
                blog.tags.forEach(t => tagsSet.add(t));
            }
        });
        return Array.from(tagsSet).slice(0, 10);
    }, [blogs]);

    const totalViews = useMemo(() => {
        if (!blogs || !Array.isArray(blogs)) return 0;
        return blogs.reduce((sum, b) => sum + (b.viewCount || 0), 0);
    }, [blogs]);

    const totalReads = useMemo(() => {
        if (!blogs || !Array.isArray(blogs)) return 0;
        return blogs.reduce((sum, b) => {
            const wordCount = b.content ? b.content.split(/\s+/).length : 0;
            const readTime = Math.ceil(wordCount / 200) || 1;
            return sum + readTime;
        }, 0);
    }, [blogs]);

    return (
        <React.Fragment>
            {/* 1. SEO Helmet Wrapper */}
            <SEO
                title="Blog - Readify AI | Book Reviews & Reading Tips"
                description="Discover reading guides, book reviews, and tips from our blog"
                path="/blog"
            />

            {/* 2. MainLayout Wrapper */}
            <MainLayout wide={true}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 backdrop-blur-xl">

                    {/* 3. Hero Section (Title & Subtitle) */}
                    <Hero />

                    {/* Responsive Desktop split layout */}
                    <div className="flex flex-col lg:flex-row gap-8 mt-4">

                        {/* Left Main Content area (70%) */}
                        <div className="w-full lg:w-[70%] flex flex-col gap-6">
                            {/* 4. SearchBar (Search, Filter, Sort, Clear) */}
                            <SearchBar
                                searchInput={searchInput}
                                setSearchInput={setSearchInput}
                                category={category}
                                handleCategoryChange={handleCategoryChange}
                                sort={sort}
                                handleSortChange={handleSortChange}
                                hasActiveFilters={hasActiveFilters}
                                handleClearFilters={handleClearFilters}
                            />

                            {/* 5. Main Content conditional states */}
                            {loading ? (
                                <LoadingState />
                            ) : error ? (
                                <ErrorState error={error} onRetry={fetchBlogs} />
                            ) : blogs.length === 0 ? (
                                <EmptyState hasActiveFilters={hasActiveFilters} onClear={handleClearFilters} />
                            ) : (
                                <>
                                    {/* 6. BlogGrid of BlogCards */}
                                    <BlogGrid>
                                        {blogs.map((blog) => (
                                            <BlogCard key={blog._id || blog.slug} blog={blog} />
                                        ))}
                                    </BlogGrid>

                                    {/* 7. Pagination */}
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={handlePageChange}
                                    />
                                </>
                            )}
                        </div>

                        {/* Right Sidebar area (30%) */}
                        <aside className="w-full lg:w-[30%] flex flex-col gap-6">
                            {/* Search Widget */}
                            <SidebarSearch value={searchInput} onChange={setSearchInput} />

                            {/* About the Author (Chief Editor) */}
                            <SidebarAuthorInfo />

                            {/* Featured Post */}
                            <FeaturedPost blog={blogs[0]} />

                            {/* Categories Filter list */}
                            <SidebarCategories
                                activeCategory={category}
                                onSelectCategory={selectCategory}
                                getCount={getCategoryCount}
                            />

                            {/* Related Posts */}
                            <SidebarRelatedPosts blogs={blogs} />

                            {/* Newsletter Subscribe */}
                            <SidebarSubscribe />

                            {/* Recent Comments */}
                            <SidebarRecentComments />

                            {/* Popular Posts */}
                            <PopularPosts posts={popularPosts} />

                            {/* Tags list */}
                            <SidebarTags tags={uniqueTags} onSelectTag={selectTag} />

                            {/* Stats */}
                            <BlogStats
                                totalPosts={blogs.length}
                                totalViews={totalViews}
                                totalReads={totalReads}
                            />

                            {/* Reading List */}
                            <SidebarReadingList />

                            {/* What Our Readers Say (Testimonials) */}
                            <SidebarTestimonials />

                            {/* Upcoming Events */}
                            <SidebarEvents />
                        </aside>

                    </div>
                </div>
            </MainLayout>
        </React.Fragment>
    );
}
