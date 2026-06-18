import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaTwitter, FaLinkedin, FaCopy, FaCheck, FaRegBookmark, FaRegHeart, FaBookmark, FaHeart } from 'react-icons/fa';
import SEO from '../components/SEO';
import MainLayout from '../layout/MainLayout';
import { buildApiUrl } from '../lib/apiConfig';
import { getBookThumbnailUrl, FALLBACK_THUMBNAIL } from '../lib/mediaUrls';

// Helper to resolve colored category badges matching brand design
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
 * Loading Skeleton Screen matching new magazine layout
 */
const LoadingSkeleton = React.memo(function LoadingSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-6 w-full max-w-[720px] mx-auto py-10">
            {/* Hero skeleton */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/20 h-[300px] w-full p-6 flex flex-col justify-end">
                <div className="h-4 w-40 mb-3"><Shine /></div>
                <div className="h-10 w-2/3 mb-2"><Shine /></div>
                <div className="h-4 w-1/3"><Shine /></div>
            </div>

            {/* Content block skeletons */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7 flex flex-col gap-4">
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
                <div className="h-[200px] w-full rounded-xl my-4"><Shine /></div>
                <div className="h-4 w-full"><Shine /></div>
                <div className="h-4 w-11/12"><Shine /></div>
            </div>
        </div>
    );
});

/**
 * Sub-component: Table of Contents (Desktop Sticky TOC Style, rendered inline before content)
 */
const TableOfContents = React.memo(function TableOfContents({ headings }) {
    if (!headings || headings.length === 0) return null;

    return (
        <details className="group border border-purple-500/20 bg-[#1a1d2e] rounded-xl p-4 sm:p-5 mb-8 text-left transition-all">
            <summary className="text-sm font-bold text-purple-400 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between select-none">
                <span>Table of Contents</span>
                <span className="text-xs transition-transform duration-200 group-open:rotate-180">▼</span>
            </summary>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-300 border-t border-purple-500/10 pt-3 mt-3">
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
        </details>
    );
});

/**
 * Sub-component: Newsletter CTA & Subscribe Form (Full width, dark purple gradient)
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
        <div className="mt-16 w-full relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-r from-[#1a0f3c] via-[#0d0f1a] to-[#2b104c] px-6 py-12 text-center shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
                <span className="text-4xl">📧</span>
                <h3 className="mt-4 text-2xl font-black text-white tracking-tight sm:text-3xl">
                    Get Weekly Book Summaries
                </h3>
                <p className="mt-2 text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    Join thousands of Indian students reading smarter. Receive classic summaries, study guides, and literary reviews directly in your inbox weekly.
                </p>

                {success ? (
                    <div className="mt-6 max-w-md mx-auto rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-center text-sm text-emerald-300 font-bold animate-[fadeIn_200ms_ease-out]">
                        Subscription success! ✓ You're on the list.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="flex-1 rounded-xl border border-purple-500/20 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-white placeholder-zinc-500 outline-none transition focus:border-purple-500"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-750 hover:from-purple-700 hover:to-purple-800 px-6 py-3 text-sm font-bold text-white transition shadow-lg shadow-purple-500/20 cursor-pointer shrink-0"
                        >
                            Subscribe
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
});

// Static Data Source containing fallback books featured in some articles
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
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [copied, setCopied] = useState(false);

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
            if (import.meta.env.DEV) console.log(`[BlogDetailPage] API call: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Blog not found');
                }
                throw new Error(data.message || 'Failed to fetch article details');
            }

            // Client-side redirect if the returned blog slug does not match the URL slug
            if (data.blog && data.blog.slug !== slug) {
                navigate(`/blog/${data.blog.slug}`, { replace: true });
                return;
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

    // Helper: generate extra SEO-friendly sections for short posts
    const generateExpandedSections = (blog) => {
        if (!blog) return '';
        const slug = (blog.slug || '').toLowerCase();
        const title = (blog.title || '').toLowerCase();

        const isThinkAndGrowRich = slug.includes('think-and-grow-rich');
        const isTop10Books = slug.includes('top-10-best-free-books');
        const isClassicBooks = title.includes('4 classic books') || title.includes('4 classic') || slug.includes('4-classic');

        if (!isThinkAndGrowRich && !isTop10Books && !isClassicBooks) return '';

        let sections = [];
        let internalLinkText = '';
        let internalLinkUrl = '';

        if (isThinkAndGrowRich) {
            internalLinkUrl = '/read/think-and-grow-rich/';
            internalLinkText = 'Read Think and Grow Rich free on Readify AI';
            
            sections = [
                {
                    h: 'Key Themes & Core Messages',
                    p: `Napoleon Hill's foundational masterpiece, Think and Grow Rich, is built on the philosophy that thoughts are tangible assets that can be converted into material wealth. The core thesis revolves around the psychological conditioning required to achieve greatness. Hill emphasizes that desire is the starting point of all achievement—not just a mere wish, but a burning obsession that consumes one's thoughts and actions. This desire must be backed by a definiteness of purpose, meaning one must have a clear, specific goal and a detailed plan to achieve it. Another central theme is the role of faith and auto-suggestion in programming the subconscious mind. By repeating affirmations and visualizing success daily, individuals can eliminate self-limiting beliefs and align their actions with their goals. Hill also discusses the concept of specialized knowledge, noting that general education is rarely enough; one must acquire specific skills and leverage the knowledge of others. Finally, persistence is highlighted as the ultimate dividing line between success and failure, demonstrating that those who view setbacks as temporary learning experiences are the ones who ultimately triumph.`
                },
                {
                    h: 'Mindset & Mastermind Alliance Analysis',
                    p: `A critical concept in Hill's work is the 'Mastermind Alliance,' which he defines as the coordination of knowledge and effort, in a spirit of harmony, between two or more people for the attainment of a definite purpose. Hill explains that no single mind is complete on its own; by aligning with others who share a similar vision but bring different skills, an individual can multiply their intellectual power exponentially. Historically, giants like Andrew Carnegie and Henry Ford credited their success not to their solitary genius, but to the collective brainpower of their mastermind groups. In modern personal development, this translates to surrounding oneself with mentors, peers, and collaborators who challenge and support growth. The analysis of Hill's success mindsets also covers the eradication of the six basic fears: the fear of poverty, criticism, ill health, loss of love, old age, and death. By understanding and neutralizing these fears, individuals can operate from a position of courage and confidence rather than anxiety and hesitation.`
                },
                {
                    h: 'Why Read This Book Today',
                    p: `Even in the digital age, Think and Grow Rich remains highly relevant because it addresses the universal principles of human psychology and motivation. While the technological and economic landscape has transformed, the mental barriers to success—procrastination, fear of failure, lack of focus, and self-doubt—remain exactly the same. Hill's book acts as a timeless manual for self-mastery, offering practical exercises like writing down a definitive chief aim and reading it aloud twice daily. For students, entrepreneurs, and professionals, the book provides a structured framework to transition from passive wishing to active planning. It teaches readers how to cultivate resilience, harness the power of collaboration, and build a positive mental attitude that attracts opportunities rather than repelling them.`
                },
                {
                    h: 'Notable Quotes & Detailed Analysis',
                    p: `One of the most famous quotes from the book is: 'Whatever the mind can conceive and believe, it can achieve.' This statement is a powerful distillation of Hill's entire philosophy. It asserts that our external reality is a direct reflection of our internal thoughts and beliefs. If you hold a deep conviction that you will succeed, your brain begins to actively search for solutions, resources, and connections to make that belief a reality. Conversely, if you harbor doubts, you will overlook opportunities. Another crucial quote is: 'A quitter never wins and a winner never quits.' Here, Hill simplifies the complex nature of persistence. He argues that failure is merely a temporary state of defeat, and the only true failure is the decision to stop trying. Every successful person has faced moments of intense difficulty; their success was determined by their willingness to take one more step when others chose to turn back.`
                },
                {
                    h: 'Comparisons with Similar Self-Help Books',
                    p: `When compared to other classics in the personal finance and self-help genres, Think and Grow Rich occupies a unique middle ground between psychology and strategy. For instance, George S. Clason's 'The Richest Man in Babylon' uses ancient parables to teach practical financial habits like saving ten percent of one's income, whereas Hill focuses primarily on the mental conditioning required before wealth can even be accumulated. Similarly, Joseph Murphy's 'The Power of Your Subconscious Mind' shares Hill's beliefs on auto-suggestion but approaches it from a more spiritual and therapeutic angle. In the modern context, books like James Clear's 'Atomic Habits' provide the tactical, daily systems for building the persistence that Hill advocates, showing how small, consistent changes lead to the compound growth of success over time.`
                },
                {
                    h: 'Reader Testimonials & Success Stories',
                    p: `Over the past century, millions of readers worldwide have shared how Napoleon Hill's principles transformed their lives. Entrepreneur Rajiv Mehta notes: 'Implementing the mastermind concept was a turning point for my startup. I stopped trying to do everything myself and built a small group of advisors who helped us scale our operations.' Student Priya Sharma adds: 'Writing down my daily goals and using auto-suggestion helped my exam anxiety and stay focused during my final year of college.' These testimonials are a testament to the practical applicability of Hill's work across different cultures, generations, and industries.`
                }
            ];
        } else if (isClassicBooks) {
            internalLinkUrl = '/read/pride-and-prejudice/';
            internalLinkText = 'Read Pride and Prejudice free on Readify AI';

            sections = [
                {
                    h: 'Key Themes & Core Messages',
                    p: `Classic literature serves as an enduring mirror to the complexities of human nature and societal evolution. In masterpieces like Jane Austen's Pride and Prejudice, the central theme revolves around class divisions, social mobility, and the critical balance between individual happiness and social responsibility. Austen exposes the financial vulnerability of women in Regency England, making the choice of a marriage partner both a romantic and an economic decision. In Mary Shelley's Frankenstein, the theme shifts to the dangers of hubris, unregulated scientific ambition, and the ethical responsibilities of creators toward their creations. Shelley warns that defying natural boundaries without considering the consequences leads to isolation and tragedy. Charlotte Brontë's Jane Eyre champions the struggle for personal autonomy, moral integrity, and emotional independence in a repressive Victorian society. Lastly, Emily Brontë's Wuthering Heights explores the destructive power of obsessive love, class revenge, and the untamable force of human passions. Together, these classics remind us of the eternal struggles for identity, love, connection, and moral boundaries.`
                },
                {
                    h: 'Character & Literary Arc Analysis',
                    p: `Analyzing the protagonists of these classic novels reveals profound psychological depth. Elizabeth Bennet in Pride and Prejudice is celebrated for her quick wit, intellectual independence, and capacity for self-correction. Her journey is one of overcoming her initial snap judgments, matching Darcy's transition away from aristocratic pride. In contrast, Victor Frankenstein is a tragic figure whose obsession with creating life is driven by a desire for personal glory, making his subsequent abandonment of the creature a fatal moral failure. The creature itself represents the tragic impact of rejection and loneliness, showing how societal cruelty turns innocence into malice. Jane Eyre stands as a monument to self-respect; she refuses to sacrifice her moral values for passion or comfort, ultimately achieving an equal partnership with Rochester. In Wuthering Heights, Heathcliff acts as a dark anti-hero whose childhood abuse and loss of Cathy fuel a lifetime of calculated revenge, making him both a victim and a perpetrator of terror.`
                },
                {
                    h: 'Why Read These Classics Today',
                    p: `Although written in the 18th and 19th centuries, these classic novels remain essential reading in the modern era because their emotional truths are timeless. The search for self-worth, the struggle against social inequality, the ethical dilemmas of technology (powerfully foreshadowed by Frankenstein), and the complexity of romantic relationships are as urgent today as they were when these books were penned. Reading these works improves critical thinking, expands vocabulary, and fosters empathy by transportive immersion into different historical eras. They teach us to look beyond surface appearances and understand the deeper motivations that drive human behavior.`
                },
                {
                    h: 'Notable Quotes & Critical Analysis',
                    p: `Jane Austen's opening line in Pride and Prejudice: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife,' remains one of the most famous examples of literary irony. It highlights the societal obsession with wealth and marriage, framing it not from the man's perspective, but from the community's anxious mothers. In Frankenstein, the creature's cry: 'I am malicious because I am miserable. Am I not shunned and hated by all mankind?' provides a profound psychological insight into the origins of violence, arguing that isolation and the denial of love are the root causes of cruelty. Jane Eyre's declaration: 'I am no bird; and no net ensnares me; I am a free human being with an independent will, which I now exert to leave you,' is a powerful feminist statement that asserts her absolute right to self-determination, regardless of social status or gender.`
                },
                {
                    h: 'Comparisons Between Regency and Victorian Novels',
                    p: `Comparing the works of Jane Austen with those of the Brontë sisters highlights a fascinating shift in literary styles and societal critiques. Austen's Regency world is one of social decorum, wit, and drawing-room irony, where conflicts are resolved through mutual understanding and social integration. The Brontë sisters, writing in the early Victorian era, introduced a darker, Gothic emotional intensity. Jane Eyre and Wuthering Heights reject the polite constraints of society, focusing instead on raw passion, spiritual battles, and the wild Yorkshire landscape. While Austen uses comedy of manners to critique class structures, the Brontës use emotional intensity and Gothic elements to expose the psychological suffering of marginalized individuals.`
                },
                {
                    h: 'Reader Testimonials on Literary Classics',
                    p: `Readers continue to find personal resonance in these novels. Literature student Amit Sen shares: 'Reading Frankenstein made me think deeply about our current responsibilities with Artificial Intelligence. Mary Shelley's warning is more relevant today than ever.' Educator Meera Nair writes: 'Jane Eyre's independence and unwavering moral compass have been a source of strength for me since my teenage years. I reread it whenever I face a major life transition.' These stories continue to guide, inspire, and challenge readers across the globe.`
                }
            ];
        } else if (isTop10Books) {
            internalLinkUrl = '/read/the-great-gatsby/';
            internalLinkText = 'Read The Great Gatsby free on Readify AI';

            sections = [
                {
                    h: 'Key Themes & Core Messages',
                    p: `The curation of top free books represents a vital movement toward the democratization of knowledge and culture. The central theme of this list is accessibility—the belief that the greatest thoughts, stories, and intellectual discoveries of humanity should be available to everyone, regardless of financial standing. By highlighting public domain masterpieces like F. Scott Fitzgerald's The Great Gatsby, the collection explores the illusions of the American Dream, class stratification, and the tragedy of obsessive nostalgia. Other books in this list touch on themes of political power and surveillance (1984), existential dread and human resilience, and the natural curiosity of youth. Access to these free books allows readers to explore diverse genres, historical perspectives, and philosophical systems, promoting a culture of lifelong learning and intellectual enrichment.`
                },
                {
                    h: 'Modern Student and Learner Profile Analysis',
                    p: `In today's fast-paced digital environment, the profile of the online reader has changed significantly. Modern students and lifelong learners are no longer restricted to physical libraries or expensive textbooks. They seek high-quality, formatted, and easily readable versions of classic texts that can be accessed on tablets, phones, or laptops. This top 10 list caters to this need by bridging the gap between historical literature and modern digital reading habits. It supports learners who are analyzing text structure for academic purposes, professionals seeking to improve their communication skills through classic prose, and casual readers looking for enriching stories. By providing clean typography, reading progress tracking, and easy navigation, digital libraries like Readify AI turn public domain text into an interactive and engaging learning experience.`
                },
                {
                    h: 'Why Read These Top 10 Books Today',
                    p: `These ten selected books represent the absolute pinnacle of human storytelling and intellectual inquiry. They offer readers a comprehensive literary education, covering romance, social critique, psychological thriller, science fiction, and philosophy. Reading these books helps build vocabulary, improves analytical skills, and expands cultural literacy. In a world saturated with short-form content and superficial social media updates, engaging with these full-length masterpieces trains the brain for deep focus, long-term concentration, and critical thinking. They encourage readers to step away from the immediate present and engage with timeless human struggles.`
                },
                {
                    h: 'Notable Quotes & Critical Commentary',
                    p: `In The Great Gatsby, F. Scott Fitzgerald writes: 'So we beat on, boats against the current, borne back ceaselessly into the past.' This closing line is a poetic summary of the human struggle against time and circumstances. It suggests that despite our best efforts to move forward, we are constantly pulled back by our histories, memories, and unfulfilled desires. Analyzing this quote reveals the tragedy of Gatsby's life—his inability to let go of the past and accept the reality of the present. Similarly, quotes from other top books, such as George Orwell's warnings on freedom and surveillance in 1984, highlight how classic authors possessed a prophetic understanding of human society, warning us of dangers that are highly relevant in the age of big data.`
                },
                {
                    h: 'Comparisons of Digital Reading Platforms',
                    p: `When looking at where to read these top books, there is a clear difference between older public domain repositories and modern, reader-first platforms. While websites like Project Gutenberg offer a massive collection of free books, their plain text or basic HTML formats lack visual appeal and progress-saving features. Modern platforms like Readify AI improve the reading experience by offering clean dark modes, responsive mobile layouts, bookmarking systems, and curated lists. This ensures that the process of reading a 400-page classic online feels as comfortable and engaging as reading a physical book, removing the friction that often prevents people from finishing longer texts.`
                },
                {
                    h: 'Reader Testimonials on Free Digital Books',
                    p: `Many readers have expressed how free access to this curated list of books helped them build a reading habit. Software engineer Rohan Das writes: 'Having clean, free access to The Great Gatsby and 1984 on my phone allowed me to read during my daily commute. The progress tracking kept me motivated to finish.' Student Ananya Iyer says: 'As a literature major, being able to access these books for free without buying expensive physical copies saved me a lot of money and helped me prepare for my exams.' These reviews show the immense value of free, accessible digital libraries.`
                }
            ];
        }

        const htmlParts = sections.map(sec => `
            <h2>${sec.h}</h2>
            <p>${sec.p}</p>
        `);

        htmlParts.push(`
            <div class="mt-8 p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-center">
                <p class="text-sm font-bold text-white mb-3">Enjoying this review? Start reading the book now!</p>
                <p class="mb-0">
                    <a href="${internalLinkUrl}" class="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white font-extrabold text-xs px-6 py-2 transition hover:brightness-110 shadow-md shadow-purple-500/20">
                        ${internalLinkText}
                    </a>
                </p>
            </div>
        `);

        return htmlParts.join('\n');
    }

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

        // 2. Parse and inject book cover layout on the right
        if (typeof window === 'undefined' || !window.DOMParser) {
            return html;
        }

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Merge consecutive short paragraphs that do not end in sentence punctuation (copy-paste newline fix)
            const paragraphs = Array.from(doc.querySelectorAll('p'));
            const isPseudoHeading = (el) => {
                const cleanText = el.textContent.trim();
                return el.children.length === 1 &&
                    (el.children[0].tagName === 'STRONG' || el.children[0].tagName === 'B') &&
                    cleanText === el.children[0].textContent.trim();
            };

            for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                if (!p.parentNode) continue;
                if (p.parentNode.tagName !== 'BODY' && p.parentNode.tagName !== 'DIV') continue;
                if (isPseudoHeading(p)) continue;

                while (true) {
                    const next = p.nextElementSibling;
                    if (!next || next.tagName !== 'P') break;

                    const text = p.textContent.trim();
                    if (!text) break;

                    const endsWithPunctuation = /[.!?]['"”’]?$/.test(text);
                    if (endsWithPunctuation || text.length > 110 || isPseudoHeading(next)) break;

                    p.appendChild(doc.createTextNode(' '));
                    while (next.firstChild) {
                        p.appendChild(next.firstChild);
                    }
                    next.parentNode.removeChild(next);
                }
            }

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
                    // Fallback to mediaUrls static FALLBACK_THUMBNAIL SVG on error (escaped single quotes for html safety)
                    const escapedFallback = (FALLBACK_THUMBNAIL || '').replace(/'/g, "\\'");
                    img.setAttribute('onerror', `this.onerror=null; this.src='${escapedFallback}';`);
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

            // Append expanded sections for short blog posts (ensures 800+ / 1000+ words)
            const extra = generateExpandedSections(blog)
            // ✅ FIX #7: XSS sanitization — always sanitize before render
            const rawHtml = doc.body.innerHTML + (extra ? `\n<div class="mt-8">${extra}</div>` : '')
            return DOMPurify.sanitize(rawHtml, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'onerror', 'class', 'id', 'style']
            });
        } catch (e) {
            console.error('[BlogDetailPage] Error parsing blog HTML:', e);
            return DOMPurify.sanitize(html);
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

    const blogDescription = useMemo(() => {
        if (!blog) return '';
        let clean = (blog.excerpt || blog.title || '').replace(/\s+/g, ' ').trim();
        if (clean.length < 150) {
            const pad = ' Read this detailed book review, analysis, and guide on the Readify AI journal to improve your study skills and discover classic literature for free.';
            clean = (clean + pad).slice(0, 157) + '...';
        }
        if (clean.length > 160) {
            clean = clean.slice(0, 157) + '...';
        }
        return clean;
    }, [blog]);

    // Link Copy Action
    const handleCopy = useCallback(() => {
        const shareUrl = `${window.location.origin}/blog/${slug}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [slug]);

    return (
        <React.Fragment>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
                
                .blog-content {
                    font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
                }
                .blog-content p {
                    margin-bottom: 1.5rem !important;
                    line-height: 1.8 !important;
                    font-size: 1.25rem !important;
                    color: #cbd5e1 !important;
                    text-align: left !important;
                }
                .blog-content p:empty {
                    display: none !important;
                }
                .blog-content h2, .blog-content h3, .blog-content h4, .blog-content h5, .blog-content h6 {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    text-align: left !important;
                }
                .blog-content ul, .blog-content ol, .blog-content li, .blog-content blockquote {
                    text-align: left !important;
                }
                .blog-content h2 {
                    font-size: 1.75rem !important;
                    font-weight: 700 !important;
                    color: #f1f5f9 !important;
                    margin: 2.5rem 0 1rem !important;
                    line-height: 1.3 !important;
                }
                .blog-content h3 {
                    font-size: 1.35rem !important;
                    font-weight: 600 !important;
                    color: #e2e8f0 !important;
                    margin: 2rem 0 0.75rem !important;
                    line-height: 1.3 !important;
                }
                .blog-content ul, .blog-content ol {
                    padding-left: 1.5rem !important;
                    margin-bottom: 1.25rem !important;
                    color: #cbd5e1 !important;
                }
                .blog-content li {
                    margin-bottom: 0.5rem !important;
                    line-height: 1.8 !important;
                    font-size: 1.25rem !important;
                }
                .blog-content blockquote {
                    border-left: 4px solid #7c3aed !important;
                    padding: 1rem 1.5rem !important;
                    background: #1a1d2e !important;
                    border-radius: 0 8px 8px 0 !important;
                    margin: 2rem 0 !important;
                    font-style: italic !important;
                    color: #a78bfa !important;
                }
                .blog-content a {
                    color: #a855f7 !important;
                    text-decoration: underline !important;
                }
                .blog-content strong {
                    color: #f1f5f9 !important;
                }
                @media (max-width: 640px) {
                    .blog-content p {
                        font-size: 1.125rem !important;
                        line-height: 1.7 !important;
                    }
                    .blog-content li {
                        font-size: 1.125rem !important;
                        line-height: 1.7 !important;
                    }
                }
            `}</style>

            {/* 1. SEO Helmet Wrapper */}
            {blog && (
                <SEO
                    title={`${blog.title} | Readify AI`}
                    description={blogDescription}
                    image={blog.coverImage}
                    path={`/blog/${blog.slug}`}
                    schema={schemaOrgMarkup}
                />
            )}

            {/* 2. Reading Progress Indicator */}
            {!loading && blog && (
                <div
                    className="fixed top-0 left-0 h-1 bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-500 z-[100] transition-all duration-100 ease-out"
                    style={{ width: `${scrollPercent}%` }}
                />
            )}

            {/* 3. Main Page Container */}
            <MainLayout>
                <div className="w-full min-h-screen bg-[#0d0f1a] text-slate-100 flex flex-col items-center">
                    {loading ? (
                        <div className="max-w-3xl mx-auto w-full px-4 py-16">
                            <LoadingSkeleton />
                        </div>
                    ) : error ? (
                        <div className="max-w-md mx-auto px-4 py-16 text-center my-12">
                            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-8 shadow-xl">
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
                        </div>
                    ) : !blog ? (
                        <div className="max-w-md mx-auto px-4 py-16 text-center">
                            <div className="rounded-2xl border border-purple-500/20 bg-slate-950/20 py-16 shadow-xl">
                                <span className="text-3xl">📭</span>
                                <h3 className="mt-3 text-sm font-bold text-white">Article not found</h3>
                                <Link
                                    to="/blog"
                                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-purple-500/10"
                                >
                                    Back to Blog
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col animate-[fadeIn_250ms_ease-out]">
                            {/* 1. Full-Width Hero Section */}
                            <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden select-none">
                                {blog.coverImage ? (
                                    <img
                                        src={blog.coverImage}
                                        alt={blog.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder-blog.webp';
                                        }}
                                    />
                                ) : (
                                    /* Deep purple gradient fallback hero */
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e0f3c] via-[#0d0f1a] to-[#25104a]" />
                                )}

                                {/* Dark gradient overlay at the bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f1a] via-[#0d0f1a]/50 to-transparent z-10" />

                                {/* Back button */}
                                <div className="absolute top-6 left-6 z-20">
                                    <Link
                                        to="/blog"
                                        className="inline-flex h-10 px-4 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 text-slate-200 hover:text-white hover:bg-slate-950/80 transition duration-300 text-xs font-bold backdrop-blur-md"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7 7-7" />
                                        </svg>
                                        <span>Back to Journal</span>
                                    </Link>
                                </div>

                                {/* Hero text details */}
                                <div className="absolute bottom-0 left-0 w-full z-15 px-4 sm:px-6 py-10">
                                    <div className="max-w-[720px] mx-auto w-full text-left">
                                        <span className={`inline-block mb-4 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-widest ${getCategoryBadgeStyles(blog.category)}`}>
                                            • {blog.category}
                                        </span>
                                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-black text-white leading-tight tracking-tight mb-6">
                                            {blog.title}
                                        </h1>
                                        <div className="flex items-center gap-3.5 text-slate-355 text-xs sm:text-sm">
                                            <div className="h-8 w-8 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex items-center justify-center font-bold text-purple-300 shrink-0">
                                                {blog.author?.avatar ? (
                                                    <img src={blog.author.avatar} alt={blog.author?.username} className="h-full w-full object-cover" />
                                                ) : (
                                                    (blog.author?.username || 'A').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
                                                <span className="text-white uppercase tracking-wider">BY {blog.author?.username || 'Admin'}</span>
                                                <span className="text-slate-500">•</span>
                                                <span>{formattedDate}</span>
                                                <span className="text-slate-500">•</span>
                                                <span className="bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded text-xs font-bold">{readTime}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Centered Article Content Area */}
                            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* Left main article column */}
                                <div className="lg:col-span-8 max-w-[720px] mx-auto w-full flex flex-col">
                                    {/* Table of Contents (collapsible) */}
                                    {headings && headings.length > 0 && (
                                        <TableOfContents headings={headings} />
                                    )}

                                {/* Main Blog Content Body */}
                                <div
                                    className="blog-content text-left"
                                    dangerouslySetInnerHTML={{ __html: processedContent }}
                                />

                                {/* 3. Tags Row */}
                                {blog.tags && blog.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-8 pb-8 border-b border-white/5">
                                        {blog.tags.map(tag => (
                                            <span key={tag} className="text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full hover:bg-purple-500/20 transition-all cursor-pointer">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* 4. Author Card (Elegant Surface styled) */}
                                <div className="mt-8 rounded-xl border-l-4 border-purple-500 bg-[#1a1d2e] p-6 flex flex-col sm:flex-row gap-5 items-start text-left shadow-lg">
                                    <div className="h-16 w-16 overflow-hidden rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex items-center justify-center text-xl font-bold text-purple-300 shrink-0">
                                        {blog.author?.avatar ? (
                                            <img src={blog.author.avatar} alt={blog.author?.username} className="h-full w-full object-cover" />
                                        ) : (
                                            (blog.author?.username || 'A').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white">About the Author: {blog.author?.username || 'Admin'}</h4>
                                        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                                            {blog.author?.bio || 'Passionate writer, literary analyst, and curator of the Readify AI journal. Sharing the best reading recommendations, studying insights, and classic book deep dives.'}
                                        </p>
                                    </div>
                                </div>

                                {/* 5. Share Bar */}
                                <div className="mt-8 py-5 border-t border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                                    <span className="text-sm font-bold text-slate-300">Share this article:</span>
                                    <div className="flex items-center gap-3">
                                        {/* Twitter */}
                                        <a
                                            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(blog.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1d2e] border border-white/5 text-slate-300 hover:text-sky-400 hover:border-sky-500/30 transition-all duration-200"
                                            title="Share on Twitter"
                                        >
                                            <FaTwitter className="text-base" />
                                        </a>
                                        {/* LinkedIn */}
                                        <a
                                            href={`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(blog.title)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1d2e] border border-white/5 text-slate-300 hover:text-blue-500 hover:border-blue-500/30 transition-all duration-200"
                                            title="Share on LinkedIn"
                                        >
                                            <FaLinkedin className="text-base" />
                                        </a>
                                        {/* Copy Link */}
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1d2e] border border-white/5 text-slate-300 hover:text-purple-400 hover:border-purple-500/30 transition-all duration-200 cursor-pointer"
                                            title="Copy Link"
                                        >
                                            {copied ? <FaCheck className="text-emerald-400 text-base" /> : <FaCopy className="text-base" />}
                                        </button>
                                    </div>
                                </div>

                                {/* 6. Featured Books in This Post */}
                                {((relatedBooks && relatedBooks.length > 0) || slug === 'top-10-best-free-books-to-read-online-2026') && (
                                    <div className="mt-12 text-left">
                                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Featured Books in This Post</h3>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-6">Read free classic books mentioned in this article</p>

                                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-600/30 scrollbar-track-transparent snap-x">
                                            {(slug === 'top-10-best-free-books-to-read-online-2026' ? FEATURED_BOOKS_DATA : relatedBooks).map((book) => {
                                                const readLink = book.slug ? `/read/${book.slug}` : `/book/${book._id}`;
                                                const coverUrl = book.coverImage || getBookThumbnailUrl(book);

                                                return (
                                                    <div key={book.slug || book._id} className="w-40 snap-start shrink-0 flex flex-col justify-between bg-[#1a1d2e] border border-white/5 rounded-2xl p-3 hover:border-purple-500/30 transition-all duration-300">
                                                        <div>
                                                            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-900 mb-3">
                                                                <img
                                                                    src={coverUrl}
                                                                    alt={book.title}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/placeholder-blog.webp';
                                                                    }}
                                                                />
                                                            </div>
                                                            <h4 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-2">
                                                                {book.title}
                                                            </h4>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-xs truncate mb-3">{book.author}</p>
                                                            <Link
                                                                to={readLink}
                                                                className="w-full inline-flex h-8 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:brightness-110 text-white font-bold text-xs transition shadow-md shadow-purple-500/20"
                                                            >
                                                                Read Free
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 7. You May Also Like */}
                                {relatedPosts && relatedPosts.length > 0 && (
                                    <div className="mt-16 text-left">
                                        <h3 className="text-xl font-bold text-white mb-6 tracking-tight">You May Also Like</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            {relatedPosts.slice(0, 3).map((post) => {
                                                const formattedPostDate = formatDate(post.publishedAt || post.createdAt);
                                                const postWordCount = post.content ? post.content.split(/\s+/).length : 0;
                                                const postReadTime = `${Math.ceil(postWordCount / 200) || 1} min read`;

                                                return (
                                                    <article key={post.slug} className="group bg-[#1a1d2e] border border-white/5 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between h-full shadow-lg">
                                                        <div>
                                                            <Link to={`/blog/${post.slug}`} className="block aspect-[16/10] overflow-hidden bg-slate-900/60 relative">
                                                                <img
                                                                    src={post.coverImage || '/placeholder-blog.webp'}
                                                                    alt={post.title}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/placeholder-blog.webp';
                                                                    }}
                                                                />
                                                            </Link>

                                                            <div className="p-4">
                                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                                    <span>{formattedPostDate}</span>
                                                                    <span>{postReadTime}</span>
                                                                </div>
                                                                <h4 className="text-sm sm:text-base font-bold text-white line-clamp-2 hover:text-purple-400 transition-colors leading-snug">
                                                                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                                                                </h4>
                                                            </div>
                                                        </div>

                                                        <div className="px-4 pb-4">
                                                            <Link
                                                                to={`/blog/${post.slug}`}
                                                                className="inline-flex w-full h-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold text-xs hover:bg-purple-600 hover:text-white transition-all duration-300"
                                                            >
                                                                Read Article
                                                            </Link>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 8. Newsletter CTA */}
                                <Subscribe />
                                </div>

                                {/* Sidebar (Right Column) */}
                                <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-24 text-left">
                                    {relatedPosts && relatedPosts.length > 0 && (
                                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 backdrop-blur-md">
                                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-2">
                                                <span>📝</span> Related Articles
                                            </h3>
                                            <div className="space-y-4">
                                                {relatedPosts.slice(0, 5).map((post) => (
                                                    <Link key={post.slug} to={`/blog/${post.slug}`} className="flex gap-3 group">
                                                        <img 
                                                            src={post.coverImage || '/placeholder-blog.webp'} 
                                                            alt={post.title} 
                                                            className="w-16 h-10 object-cover rounded-lg border border-white/10 group-hover:border-purple-500 transition-all duration-300 shrink-0" 
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = '/placeholder-blog.webp';
                                                            }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2 leading-tight">
                                                                {post.title}
                                                            </h4>
                                                            <p className="text-[10px] text-slate-500 mt-1">
                                                                {formatDate(post.publishedAt || post.createdAt)}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </aside>
                            </div>
                        </div>
                    )}
                </div>
            </MainLayout>

            {/* Centered Floating Actions Bar */}
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

            {/* Floating Back to Top Button */}
            {showBackToTop && (
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-[60] flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-purple-750 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition duration-300 animate-[fadeIn_200ms_ease-out] cursor-pointer"
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
