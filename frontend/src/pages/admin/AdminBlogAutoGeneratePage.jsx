import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import apiClient from '../../lib/apiClient';
import AdminSidebar from '../../components/AdminSidebar';
import SEO from '../../components/SEO';
import { getBookThumbnailUrl } from '../../lib/mediaUrls';

// React Select style customization for dark theme integration
const selectDarkStyles = {
    control: (base, state) => ({
        ...base,
        backgroundColor: 'rgba(2, 5, 15, 0.5)',
        borderColor: state.isFocused ? 'rgb(99, 102, 241)' : 'rgba(255, 255, 255, 0.15)',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
        borderRadius: '0.75rem',
        padding: '0.125rem',
        '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.25)',
        }
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: 'rgb(15, 23, 42)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        zIndex: 50
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'rgb(99, 102, 241)'
            : state.isFocused
                ? 'rgba(255, 255, 255, 0.05)'
                : 'transparent',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.875rem',
        '&:active': {
            backgroundColor: 'rgb(79, 70, 229)',
        }
    }),
    input: (base) => ({
        ...base,
        color: '#fff'
    }),
    singleValue: (base) => ({
        ...base,
        color: '#fff'
    })
};

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

export default function AdminBlogAutoGeneratePage() {
    const navigate = useNavigate();
    
    const [books, setBooks] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [loadingBooks, setLoadingBooks] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [payload, setPayload] = useState(null);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    useEffect(() => {
        const fetchBooksList = async () => {
            try {
                setLoadingBooks(true);
                const response = await apiClient.get('/api/books');
                const data = response.data || [];
                const resolved = Array.isArray(data) ? data : data.books || data.data || [];
                setBooks(resolved);
            } catch (err) {
                console.error('[AdminBlogAutoGeneratePage] Error fetching books:', err);
                setError('Failed to load books. Please check API connection.');
            } finally {
                setLoadingBooks(false);
            }
        };

        fetchBooksList();
    }, []);

    const bookOptions = books.map(book => ({
        value: book._id,
        label: `${book.title} by ${book.author || 'Unknown'}`,
        book
    }));

    const showToastMsg = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleGenerate = () => {
        if (!selectedOption) return;
        const { book } = selectedOption;
        
        setGenerating(true);
        setError('');

        try {
            const title = `Read ${book.title} Free Online — Full Book Review & Summary`;
            const slug = `read-${book.slug || slugify(book.title)}-free-online-review`;
            const excerpt = `${book.title} by ${book.author || 'Unknown'} — discover why this ${book.category || 'classic'} classic is a must-read. Available free on Readify AI.`;
            
            // Map to valid category enums
            const validCategories = [
                "Classic Books",
                "Study Tips",
                "Literary Analysis",
                "Reading Guides",
                "Author Profiles",
                "Tips & Tricks"
            ];
            const category = validCategories.includes(book.category) ? book.category : "Classic Books";
            
            // Cover Image
            const coverImage = book.coverImage || getBookThumbnailUrl(book) || 'https://readifyai.vercel.app/favicon.svg';
            
            // Tags
            const tags = [book.category, "free books", "read online", "classic literature", book.author].filter(
                t => typeof t === 'string' && t.trim() !== ''
            );
            
            // HTML Content
            const content = `<h2>About ${book.title}</h2>
<p>${book.description || 'No description available for this book.'}</p>
<h2>Why Read ${book.title}?</h2>
<p>${book.title} is a stellar example of ${book.category || 'classic'} literature. It features compelling characters, rich storytelling, and explores themes that continue to resonate with readers today.</p>
<h2>Read ${book.title} Free on Readify AI</h2>
<p>Start reading ${book.title} free on Readify AI now. <a href="/read/${encodeURIComponent(book.slug || '')}/">${book.title} Free Online</a></p>
<h2>Reader Reviews</h2>
<p>Join thousands of readers who have read ${book.title} and shared their thoughts. Add your review and rating to help others discover this work.</p>`;

            setPayload({
                title,
                slug,
                category,
                excerpt,
                content,
                coverImage,
                tags,
                relatedBooks: [book._id],
                status: 'draft',
                seoTitle: title,
                seoDescription: excerpt.slice(0, 160),
                seoKeywords: tags
            });

            showToastMsg('Blog post generated successfully!');
        } catch (err) {
            console.error('[AdminBlogAutoGeneratePage] Error generating blog:', err);
            setError('Failed to auto-generate content.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!payload) return;
        setSaving(true);
        setError('');
        try {
            const response = await apiClient.post('/api/blogs', payload);
            showToastMsg('Draft saved successfully!');
            setTimeout(() => {
                navigate('/admin/blogs');
            }, 1000);
        } catch (err) {
            console.error('[AdminBlogAutoGeneratePage] Error saving draft:', err);
            setError(err.response?.data?.message || err.message || 'Failed to save blog post draft.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
            {/* Ambient background glow dots */}
            <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-purple-500/10 blur-[130px]" />

            <SEO
                title="Auto-Generate Blog | Readify AI Admin"
                description="Auto-generate blog posts for books automatically using the generator tool."
                path="/admin/blog/auto-generate"
            />

            {/* Toast popup */}
            {toast && (
                <div className="fixed right-4 top-4 z-[130] rounded-xl border border-indigo-300/40 bg-indigo-950/90 px-4 py-3 text-sm font-semibold text-indigo-100 shadow-xl backdrop-blur-xl animate-[fadeIn_200ms_ease-out]">
                    {toast}
                </div>
            )}

            {/* Main Layout Grid */}
            <div className="relative mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr] lg:gap-6 lg:p-6">
                <AdminSidebar />

                <main className="rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-2xl lg:p-8">
                    {/* Back link */}
                    <Link to="/admin/blogs" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mb-6">
                        &larr; Back to Blogs
                    </Link>

                    {/* Page Title */}
                    <div className="mb-6 text-left">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/80">Content Operations</p>
                        <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">Auto-Generate Blog Post</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Select a book from the list to automatically generate an SEO-optimized blog review and summary draft.
                        </p>
                    </div>

                    {/* Error Alerts */}
                    {error && (
                        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Generator Controller Form */}
                    <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-6 mb-8 text-left">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                            Select Book
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            <div className="flex-1">
                                <Select
                                    options={bookOptions}
                                    value={selectedOption}
                                    onChange={(opt) => {
                                        setSelectedOption(opt);
                                        setPayload(null);
                                    }}
                                    placeholder={loadingBooks ? "Loading books list..." : "Search and select a book..."}
                                    isDisabled={loadingBooks}
                                    styles={selectDarkStyles}
                                    isSearchable
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={!selectedOption || generating}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-bold text-white transition duration-200 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/10 shrink-0"
                            >
                                {generating ? 'Generating...' : 'Generate Blog Post'}
                            </button>
                        </div>
                    </div>

                    {/* Live Preview Container */}
                    {payload && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-left animate-[fadeIn_300ms_ease]">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                                <h3 className="text-lg font-bold text-white">Generated Blog Post Preview</h3>
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={saving}
                                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 text-sm font-bold text-white transition duration-200 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save as Draft'}
                                </button>
                            </div>

                            {/* Metadata previews */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Title</h4>
                                    <p className="text-sm font-semibold text-white bg-slate-900/50 rounded-xl px-4 py-3 border border-white/5">
                                        {payload.title}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Slug</h4>
                                    <p className="text-sm font-mono text-slate-300 bg-slate-900/50 rounded-xl px-4 py-3 border border-white/5">
                                        {payload.slug}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Excerpt</h4>
                                <p className="text-sm text-slate-300 bg-slate-900/50 rounded-xl px-4 py-3 border border-white/5">
                                    {payload.excerpt}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Category</h4>
                                    <span className="inline-block text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30">
                                        {payload.category}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {payload.tags.map((tag, idx) => (
                                            <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Cover Image URL</h4>
                                <p className="text-xs font-mono text-slate-400 bg-slate-900/50 rounded-xl px-4 py-3 border border-white/5 truncate">
                                    {payload.coverImage}
                                </p>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Structured Blog Content (HTML Rendered)</h4>
                                <div 
                                    className="prose prose-invert max-w-none text-slate-300 bg-slate-900/20 rounded-2xl p-6 border border-white/5"
                                    dangerouslySetInnerHTML={{ __html: payload.content }}
                                />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
