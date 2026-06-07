import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
        <article className="overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-950/20">
            <div className="relative h-[160px] max-h-[160px] overflow-hidden bg-slate-900/60 w-full">
                <div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
            <div className="p-3">
                <Shine className="h-5 w-4/5 mb-2" />
                <Shine className="h-3 w-full mb-1.5" />
                <Shine className="h-3 w-5/6 mb-3" />
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                        <Shine className="h-6 w-6 rounded-full" />
                        <div className="space-y-1">
                            <Shine className="h-2.5 w-14" />
                            <Shine className="h-2 w-10" />
                        </div>
                    </div>
                    <Shine className="h-3.5 w-10" />
                </div>
                <Shine className="h-7 w-full rounded-lg mt-3" />
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-purple-500/20 bg-purple-500/5 px-5 py-3 text-xs font-bold text-slate-350 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-[fadeIn_250ms_ease-out]">
            {children}
        </div>
    );
});

/**
 * Sub-component: BlogCard Card item
 */
const BlogCard = React.memo(function BlogCard({ blog }) {
    const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
    const readTime = Math.ceil(wordCount / 200) || 1;
    const blogUrl = `/blog/${blog.slug}`;

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-955/30 hover:shadow-2xl hover:shadow-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:scale-105">
            {/* Cover Image with gradient overlay */}
            <div className="relative h-[160px] max-h-[160px] w-full overflow-hidden bg-gradient-to-b from-transparent to-gray-900 select-none">
                <Link to={blogUrl} className="block h-full w-full">
                    {blog.coverImage ? (
                        <img
                            loading="lazy"
                            src={blog.coverImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900 p-3 text-center text-xs font-semibold text-white">
                            {blog.title}
                        </div>
                    )}
                </Link>
                <div className="absolute top-2 left-2 z-10">
                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {blog.category}
                    </span>
                </div>
                <div className="absolute top-2 right-2 z-10">
                    <span className="bg-purple-950/80 border border-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md">
                        {readTime} min
                    </span>
                </div>
                {/* Overlay gradient */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-gray-900 via-gray-900/35 to-transparent" />
            </div>

            {/* Content info wrapper */}
            <div className="p-3 flex flex-col justify-between flex-1">
                <div className="text-left">
                    <h3 className="text-base font-bold text-white mb-1.5 line-clamp-2 hover:text-purple-400 transition-colors leading-snug">
                        <Link to={blogUrl}>{blog.title}</Link>
                    </h3>
                    <p className="text-slate-400 text-xs mb-3 line-clamp-2 leading-relaxed">
                        {truncateExcerpt(blog.excerpt || 'No description available.')}
                    </p>
                </div>

                <div className="mt-auto">
                    <div className="flex items-center justify-between border-t border-purple-500/10 pt-3">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded-full bg-purple-500/20 ring-1 ring-purple-500/20 flex items-center justify-center text-[9px] font-bold text-purple-300 shrink-0">
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
                                <p className="text-slate-400 text-[10px] font-semibold leading-none">{blog.author?.username || 'Admin'}</p>
                                <p className="text-slate-400 text-[10px] mt-0.5">{formatDate(blog.publishedAt || blog.createdAt)}</p>
                            </div>
                        </div>
                        <div className="text-purple-400 text-xs font-semibold flex items-center gap-1 shrink-0 select-none">
                            <span>👁️</span>
                            <span>{blog.viewCount || 0}</span>
                        </div>
                    </div>

                    <Link
                        to={blogUrl}
                        className="mt-3 block w-full text-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 shadow-md hover:shadow-purple-500/20"
                    >
                        Read More &rarr;
                    </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, idx) => (
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
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-350 hover:border-purple-500/50 hover:bg-slate-900'
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
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-350 hover:border-purple-500/50 hover:bg-slate-900'
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
                                : 'border-purple-500/20 bg-slate-900/40 text-slate-350 hover:border-purple-500/50 hover:bg-slate-900'
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
                    newParams.set('search', searchInput.trim());
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
    const fetchBlogs = async () => {
        setLoading(true);
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
        fetchBlogs();
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

    const hasActiveFilters = useMemo(() => {
        return !!(category || search || sort !== 'latest');
    }, [category, search, sort]);

    return (
        <React.Fragment>
            {/* 1. SEO Helmet Wrapper */}
            <SEO
                title="Blog - Readify AI | Book Reviews & Reading Tips"
                description="Discover reading guides, book reviews, and tips from our blog"
                path="/blog"
            />

            {/* 2. MainLayout Wrapper */}
            <MainLayout>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 backdrop-blur-xl">

                    {/* 3. Hero Section (Title & Subtitle) */}
                    <Hero />

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
            </MainLayout>
        </React.Fragment>
    );
}
