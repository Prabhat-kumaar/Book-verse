import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import AdminSidebar from '../../components/AdminSidebar';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

/**
 * Custom Shimmer block for skeleton rows
 */
const ShineRow = React.memo(function ShineRow() {
    return (
        <tr className="animate-pulse border-b border-white/5">
            <td className="p-4"><div className="h-4 w-4 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-4 w-48 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-4 w-20 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-4 w-24 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-5 w-16 bg-slate-900/60 rounded-full border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-4 w-12 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-4 w-24 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
            <td className="p-4"><div className="h-6 w-28 bg-slate-900/60 rounded border border-white/5 relative overflow-hidden"><div className="absolute inset-0 -translate-x-full animate-[skeletonShimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" /></div></td>
        </tr>
    );
});

/**
 * Sub-component: Header
 * Displays title,Stats, and CTA to create a new blog
 */
const Header = React.memo(function Header({ stats, onCreateNew }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Content Operations</p>
                <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Blog Management</h2>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-400">
                    <span>Total blogs: <strong className="text-white">{stats.totalCount || 0}</strong></span>
                    <span className="text-slate-700">|</span>
                    <span>Published: <strong className="text-emerald-400">{stats.publishedCount || 0}</strong></span>
                    <span className="text-slate-700">|</span>
                    <span>Drafts: <strong className="text-amber-400">{stats.draftCount || 0}</strong></span>
                    <span className="text-slate-700">|</span>
                    <span>Archived: <strong className="text-rose-400">{stats.archivedCount || 0}</strong></span>
                </div>
            </div>
            
            <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-5 text-sm font-bold text-white transition duration-200 hover:brightness-110 shadow-lg shadow-indigo-500/10 shrink-0"
            >
                + Create New Blog
            </button>
        </div>
    );
});

/**
 * Sub-component: Toolbar
 * Handles filters, search, sorting, and bulk action triggers
 */
const Toolbar = React.memo(function Toolbar({
    search,
    setSearch,
    status,
    setStatus,
    sortBy,
    setSortBy,
    hasActiveFilters,
    onClearFilters,
    selectedCount,
    onBulkAction
}) {
    const inputClass =
        'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-2.5 text-sm text-white outline-none transition duration-300 placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70';

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="grid gap-3.5 sm:grid-cols-[1fr_180px_150px_auto]">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search blogs by title..."
                    className={inputClass}
                />
                
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={inputClass}
                >
                    <option value="all" className="bg-slate-950">All Statuses</option>
                    <option value="published" className="bg-slate-950">Published</option>
                    <option value="draft" className="bg-slate-950">Draft</option>
                    <option value="archived" className="bg-slate-950">Archived</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={inputClass}
                >
                    <option value="latest" className="bg-slate-950">Latest</option>
                    <option value="oldest" className="bg-slate-950">Oldest</option>
                </select>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="rounded-xl border border-white/20 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Bulk Actions Panel */}
            {selectedCount > 0 && (
                <div className="flex items-center gap-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-left animate-[fadeIn_180ms_ease-out]">
                    <span className="text-xs font-bold text-indigo-300">
                        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected:
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onBulkAction('published')}
                            className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                            Publish Selected
                        </button>
                        <button
                            type="button"
                            onClick={() => onBulkAction('archived')}
                            className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                            Archive Selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * Sub-component: BlogRow Row item
 */
const BlogRow = React.memo(function BlogRow({
    blog,
    isSelected,
    onSelect,
    onEdit,
    onDelete
}) {
    const formattedDate = blog.publishedAt
        ? formatDate(blog.publishedAt)
        : formatDate(blog.createdAt);

    // Dynamic badge status color mapping
    const badgeColor = {
        published: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        draft: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        archived: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    }[blog.status] || 'border-slate-500/30 bg-slate-500/10 text-slate-300';

    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.02] transition duration-200">
            <td className="p-4 w-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(blog._id)}
                    className="h-4 w-4 cursor-pointer rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0"
                />
            </td>
            <td className="p-4 font-bold text-white text-left max-w-xs sm:max-w-sm truncate">
                <Link to={`/admin/blogs/${blog._id}/edit`} className="hover:text-indigo-400 transition-colors">
                    {blog.title}
                </Link>
            </td>
            <td className="p-4 text-xs font-semibold text-slate-300 text-left truncate">
                {blog.author?.username || 'Admin'}
            </td>
            <td className="p-4 text-xs text-slate-400 text-left">
                {blog.category}
            </td>
            <td className="p-4 text-left">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                    {blog.status}
                </span>
            </td>
            <td className="p-4 text-xs font-mono font-bold text-slate-300 text-left">
                {blog.viewCount || 0}
            </td>
            <td className="p-4 text-xs text-slate-400 text-left">
                {formattedDate}
            </td>
            <td className="p-4 text-left">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(blog._id)}
                        className="rounded bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/10"
                    >
                        Edit
                    </button>
                    <a
                        href={`/blog/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20"
                    >
                        View
                    </a>
                    <button
                        type="button"
                        onClick={() => onDelete(blog)}
                        className="rounded bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
});

/**
 * Sub-component: Pagination
 */
const Pagination = React.memo(function Pagination({
    currentPage,
    totalPages,
    totalCount,
    limit,
    onPageChange
}) {
    if (totalPages <= 1) return null;

    const startIdx = (currentPage - 1) * limit + 1;
    const endIdx = Math.min(currentPage * limit, totalCount);

    return (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5 text-left">
            <span className="text-xs text-slate-400">
                Showing <strong className="text-slate-200">{startIdx}-{endIdx}</strong> of <strong className="text-slate-200">{totalCount}</strong> blogs
            </span>

            <div className="flex items-center gap-1.5 select-none">
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/40 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-transparent"
                >
                    &lt;
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                        <button
                            key={pageNum}
                            type="button"
                            onClick={() => onPageChange(pageNum)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-bold transition ${
                                currentPage === pageNum
                                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg'
                                    : 'border-white/10 bg-slate-900/40 text-slate-300 hover:bg-slate-900'
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}
                <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/40 text-sm font-bold text-white transition hover:bg-slate-900 disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:bg-transparent"
                >
                    &gt;
                </button>
            </div>
        </div>
    );
});

/**
 * Sub-component: EmptyState
 */
const EmptyState = React.memo(function EmptyState({ hasActiveFilters, onCreateFirst }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-12 text-center max-w-md mx-auto my-8 animate-[fadeIn_200ms_ease-out]">
            <span className="text-3xl">📝</span>
            <h3 className="mt-3 text-sm font-bold text-white">No blogs found</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                {hasActiveFilters ? "No blogs match your filter query. Try clearing filters." : "Create your first blog post to share guides and tips."}
            </p>
            {!hasActiveFilters && (
                <button
                    type="button"
                    onClick={onCreateFirst}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-5 py-2.5 text-xs font-bold text-white transition duration-200 hover:brightness-110 shadow-lg shadow-indigo-500/10"
                >
                    Create First Blog
                </button>
            )}
        </div>
    );
});

/**
 * Sub-component: ErrorState
 */
const ErrorState = React.memo(function ErrorState({ error, onRetry }) {
    return (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-center max-w-md mx-auto my-8 animate-[fadeIn_200ms_ease-out]">
            <span className="text-2xl">⚠️</span>
            <h3 className="mt-2 text-sm font-bold text-white">Failed to load blogs</h3>
            <p className="mt-1.5 text-xs text-rose-300/80 leading-relaxed">{error}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-2 text-xs font-bold text-white transition hover:brightness-110 shadow-md shadow-indigo-500/10"
            >
                Retry
            </button>
        </div>
    );
});

/**
 * Main AdminBlogPage Dashboard component
 */
export default function AdminBlogPage() {
    const navigate = useNavigate();

    // Filters and pagination state
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [sortBy, setSortBy] = useState('latest');
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 20;

    // Fetch lists states
    const [blogs, setBlogs] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    // Bulk selection state
    const [selectedBlogs, setSelectedBlogs] = useState([]);

    // Stats counts state
    const [stats, setStats] = useState({
        totalCount: 0,
        publishedCount: 0,
        draftCount: 0,
        archivedCount: 0
    });

    // Delete dialog targets
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Debounce search input (300ms)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset page to 1 on new search
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    // Fetch analytics summary counts
    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/api/blogs/admin/analytics/overview?excludeTopBlogs=true');
            const data = response.data?.analytics || {};
            setStats({
                totalCount: data.totalCount || 0,
                publishedCount: data.publishedCount || 0,
                draftCount: data.draftCount || 0,
                archivedCount: data.archivedCount || 0
            });
        } catch (err) {
            console.error('[AdminBlogPage] Error fetching stats:', err);
        }
    };

    // Fetch lists according to parameters
    const fetchBlogs = async () => {
        setLoading(true);
        setError('');
        try {
            const queryParams = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
                status: status !== 'all' ? status : '',
                search: debouncedSearch
            });
            const response = await apiClient.get(`/api/blogs/admin/all?${queryParams.toString()}`);
            const data = response.data || {};
            
            setBlogs(data.blogs || []);
            setTotalCount(data.totalCount || 0);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('[AdminBlogPage] Fetch error:', err);
            setError(err.response?.data?.message || err.message || 'Unable to retrieve blog posts.');
        } finally {
            setLoading(false);
        }
    };

    // Reload list and stats
    useEffect(() => {
        fetchBlogs();
        fetchStats();
    }, [currentPage, status, debouncedSearch]);

    // Client-side sort based on sortBy
    const sortedBlogs = useMemo(() => {
        let result = [...blogs];
        if (sortBy === 'oldest') {
            result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else {
            result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return result;
    }, [blogs, sortBy]);

    // Reset filters
    const handleClearFilters = useCallback(() => {
        setSearch('');
        setStatus('all');
        setSortBy('latest');
        setCurrentPage(1);
    }, []);

    // Checkbox toggles
    const handleSelectRow = useCallback((blogId) => {
        setSelectedBlogs((prev) =>
            prev.includes(blogId) ? prev.filter((id) => id !== blogId) : [...prev, blogId]
        );
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedBlogs.length === sortedBlogs.length) {
            setSelectedBlogs([]);
        } else {
            setSelectedBlogs(sortedBlogs.map((b) => b._id));
        }
    }, [selectedBlogs, sortedBlogs]);

    // Navigations
    const handleCreateNew = useCallback(() => {
        navigate('/admin/blogs/create');
    }, [navigate]);

    const handleEditRow = useCallback((id) => {
        navigate(`/admin/blogs/${id}/edit`);
    }, [navigate]);

    // Single item delete flow
    const handleDeleteRow = useCallback((blog) => {
        setDeleteTarget(blog);
    }, []);

    const handleConfirmDelete = async () => {
        if (!deleteTarget?._id) return;
        try {
            setDeleting(true);
            await apiClient.delete(`/api/blogs/${deleteTarget._id}`);
            
            setToast('Blog post archived successfully.');
            setTimeout(() => setToast(''), 2200);

            // Refetch current list and status stats
            fetchBlogs();
            fetchStats();
            setSelectedBlogs((prev) => prev.filter((id) => id !== deleteTarget._id));
        } catch (err) {
            console.error('[AdminBlogPage] Delete error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to delete blog.');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleConfirmPermanentDelete = async () => {
        if (!deleteTarget?._id) return;
        try {
            setDeleting(true);
            await apiClient.delete(`/api/blogs/${deleteTarget._id}/permanent`);
            
            setToast('Blog post permanently deleted.');
            setTimeout(() => setToast(''), 2200);

            // Refetch current list and status stats
            fetchBlogs();
            fetchStats();
            setSelectedBlogs((prev) => prev.filter((id) => id !== deleteTarget._id));
        } catch (err) {
            console.error('[AdminBlogPage] Permanent delete error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to permanently delete blog.');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // Bulk status update flow
    const handleBulkAction = async (newStatus) => {
        if (selectedBlogs.length === 0) return;
        try {
            const response = await apiClient.put('/api/blogs/admin/bulk-status', {
                ids: selectedBlogs,
                status: newStatus
            });
            
            setToast(response.data?.message || 'Bulk update successful.');
            setTimeout(() => setToast(''), 2200);
            
            setSelectedBlogs([]);
            fetchBlogs();
            fetchStats();
        } catch (err) {
            console.error('[AdminBlogPage] Bulk update error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update selected blogs.');
        }
    };

    const hasActiveFilters = useMemo(() => {
        return !!(search || status !== 'all' || sortBy !== 'latest');
    }, [search, status, sortBy]);

    return (
        <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
            {/* Ambient background glow dots */}
            <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-purple-500/10 blur-[130px]" />

            {/* Notification Toast */}
            {toast && (
                <div className="fixed right-4 top-4 z-[130] rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-xl backdrop-blur-xl animate-[fadeIn_200ms_ease-out]">
                    {toast}
                </div>
            )}

            {/* Main structural layout grid wrapper */}
            <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
                
                {/* Admin Navigation Sidebar */}
                <AdminSidebar />

                {/* Dashboard Operations Panel */}
                <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
                    
                    {/* Header */}
                    <Header stats={stats} onCreateNew={handleCreateNew} />

                    {/* Filters & Actions toolbar */}
                    <Toolbar
                        search={search}
                        setSearch={setSearch}
                        status={status}
                        setStatus={setStatus}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                        selectedCount={selectedBlogs.length}
                        onBulkAction={handleBulkAction}
                    />

                    {/* Error block */}
                    {error && <ErrorState error={error} onRetry={fetchBlogs} />}

                    {/* Content display table */}
                    {!error && (
                        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20 backdrop-blur-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/[0.03] text-xs font-extrabold uppercase tracking-wider text-slate-400">
                                            <th className="p-4 w-10 text-left select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={sortedBlogs.length > 0 && selectedBlogs.length === sortedBlogs.length}
                                                    onChange={handleSelectAll}
                                                    className="h-4 w-4 cursor-pointer rounded border-white/10 bg-slate-950 text-indigo-600 focus:ring-0"
                                                />
                                            </th>
                                            <th className="p-4 text-left">Title</th>
                                            <th className="p-4 text-left">Author</th>
                                            <th className="p-4 text-left">Category</th>
                                            <th className="p-4 text-left">Status</th>
                                            <th className="p-4 text-left">Views</th>
                                            <th className="p-4 text-left">Date</th>
                                            <th className="p-4 text-left">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            Array.from({ length: 10 }).map((_, idx) => (
                                                <ShineRow key={idx} />
                                            ))
                                        ) : sortedBlogs.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="p-0">
                                                    <EmptyState
                                                        hasActiveFilters={hasActiveFilters}
                                                        onCreateFirst={handleCreateNew}
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedBlogs.map((blog) => (
                                                <BlogRow
                                                    key={blog._id}
                                                    blog={blog}
                                                    isSelected={selectedBlogs.includes(blog._id)}
                                                    onSelect={handleSelectRow}
                                                    onEdit={handleEditRow}
                                                    onDelete={handleDeleteRow}
                                                />
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!loading && sortedBlogs.length > 0 && (
                                <div className="p-4 bg-white/[0.01]">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalCount={totalCount}
                                        limit={limit}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Delete Confirmation Modal overlay */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[120] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/90 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.65)] text-left">
                        <h4 className="text-lg font-bold text-white">
                            {deleteTarget.status === 'archived' ? 'Permanently Delete Blog' : 'Delete / Archive Blog'}
                        </h4>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            {deleteTarget.status === 'archived' ? (
                                <>
                                    Are you sure you want to permanently delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>? This action cannot be undone.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to archive or permanently delete <span className="font-semibold text-white">"{deleteTarget.title}"</span>? Archiving hides it from readers, and it can be recovered later.
                                </>
                            )}
                        </p>
                        <div className="mt-5 flex justify-end gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-lg border border-white/20 bg-white/[0.08] px-4 py-2 font-bold text-slate-100 transition hover:bg-white/[0.14]"
                            >
                                Cancel
                            </button>
                            {deleteTarget.status !== 'archived' && (
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={deleting}
                                    className="rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 font-bold text-indigo-100 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-65"
                                >
                                    {deleting ? 'Archiving...' : 'Archive Blog'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleConfirmPermanentDelete}
                                disabled={deleting}
                                className="rounded-lg border border-rose-500 bg-rose-600 px-4 py-2 font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-65"
                            >
                                {deleting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
