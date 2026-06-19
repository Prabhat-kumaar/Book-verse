import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Mark, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Youtube from '@tiptap/extension-youtube';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import ImageResize from 'tiptap-extension-resize-image';
import SEO from '../../components/SEO';
import MainLayout from '../../layout/MainLayout';
import apiClient from '../../lib/apiClient';
import { buildApiUrl } from '../../lib/apiConfig';

// Allowed blog categories
const CATEGORIES = [
    "Classic Books",
    "Study Tips",
    "Literary Analysis",
    "Reading Guides",
    "Author Profiles",
    "Tips & Tricks"
];

// Helper to slugify text
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')       // Remove all non-word chars
        .replace(/-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};



// Suggested blog tags
const SUGGESTED_TAGS = ['book', 'free', 'online', 'classic', 'study', 'tips', 'guides', 'review', 'analysis'];

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
        border: '1px border rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        overflow: 'hidden'
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
    multiValue: (base) => ({
        ...base,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderRadius: '0.375rem',
        border: '1px solid rgba(99, 102, 241, 0.3)'
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: 'rgb(165, 180, 252)',
        fontWeight: '600',
        fontSize: '0.75rem'
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: 'rgba(255, 255, 255, 0.4)',
        '&:hover': {
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: 'rgb(239, 68, 68)'
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

// Extend ImageResize to support class attribute for left/right/center image alignment and sizing
const CustomImage = ImageResize.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: 'img-center img-large',
                parseHTML: element => {
                    const cls = element.getAttribute('class') || '';
                    let newCls = cls;
                    // Map legacy classes
                    if (cls.includes('align-left')) newCls = newCls.replace('align-left', 'img-left');
                    if (cls.includes('align-right')) newCls = newCls.replace('align-right', 'img-right');
                    if (cls.includes('align-center')) newCls = newCls.replace('align-center', 'img-center');
                    
                    // Enforce defaults if parts are missing
                    if (!newCls.includes('img-left') && !newCls.includes('img-center') && !newCls.includes('img-right')) {
                        newCls += ' img-center';
                    }
                    if (!newCls.includes('img-small') && !newCls.includes('img-medium') && !newCls.includes('img-large') && !newCls.includes('img-full-width')) {
                        newCls += ' img-large';
                    }
                    return newCls.trim();
                },
                renderHTML: attributes => {
                    return { class: attributes.class || 'img-center img-large' };
                },
            },
        };
    },
});

// Custom Subscript Mark
const Subscript = Mark.create({
    name: 'subscript',
    parseHTML() {
        return [{ tag: 'sub' }];
    },
    renderHTML() {
        return ['sub', 0];
    },
    addCommands() {
        return {
            toggleSubscript: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            }
        };
    }
});

// Custom Superscript Mark
const Superscript = Mark.create({
    name: 'superscript',
    parseHTML() {
        return [{ tag: 'sup' }];
    },
    renderHTML() {
        return ['sup', 0];
    },
    addCommands() {
        return {
            toggleSuperscript: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            }
        };
    }
});

// Custom TextStyle Extension consolidating custom typography styling attributes
const CustomTextStyle = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            fontFamily: {
                default: null,
                parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
                renderHTML: attributes => {
                    if (!attributes.fontFamily) return {};
                    return { style: `font-family: ${attributes.fontFamily}` };
                }
            },
            fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize,
                renderHTML: attributes => {
                    if (!attributes.fontSize) return {};
                    return { style: `font-size: ${attributes.fontSize}` };
                }
            },
            lineHeight: {
                default: null,
                parseHTML: element => element.style.lineHeight,
                renderHTML: attributes => {
                    if (!attributes.lineHeight) return {};
                    return { style: `line-height: ${attributes.lineHeight}` };
                }
            },
            marginLeft: {
                default: null,
                parseHTML: element => element.style.marginLeft,
                renderHTML: attributes => {
                    if (!attributes.marginLeft) return {};
                    return { style: `margin-left: ${attributes.marginLeft}` };
                }
            },
            textShadow: {
                default: null,
                parseHTML: element => element.style.textShadow,
                renderHTML: attributes => {
                    if (!attributes.textShadow) return {};
                    return { style: `text-shadow: ${attributes.textShadow}` };
                }
            }
        };
    },
    addCommands() {
        return {
            setFontFamily: fontFamily => ({ chain }) => {
                return chain().setMark('textStyle', { fontFamily }).run();
            },
            unsetFontFamily: () => ({ chain }) => {
                return chain().setMark('textStyle', { fontFamily: null }).run();
            },
            setFontSize: fontSize => ({ chain }) => {
                return chain().setMark('textStyle', { fontSize }).run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain().setMark('textStyle', { fontSize: null }).run();
            },
            setLineHeight: lineHeight => ({ chain }) => {
                return chain().setMark('textStyle', { lineHeight }).run();
            },
            unsetLineHeight: () => ({ chain }) => {
                return chain().setMark('textStyle', { lineHeight: null }).run();
            },
            indentText: () => ({ editor, chain }) => {
                const attrs = editor.getAttributes('textStyle');
                const currentMargin = attrs.marginLeft || '0px';
                const currentPx = parseInt(currentMargin, 10) || 0;
                const newPx = currentPx + 20;
                return chain().setMark('textStyle', { marginLeft: `${newPx}px` }).run();
            },
            outdentText: () => ({ editor, chain }) => {
                const attrs = editor.getAttributes('textStyle');
                const currentMargin = attrs.marginLeft || '0px';
                const currentPx = parseInt(currentMargin, 10) || 0;
                const newPx = Math.max(0, currentPx - 20);
                return chain().setMark('textStyle', { marginLeft: newPx > 0 ? `${newPx}px` : null }).run();
            },
            setTextShadow: textShadow => ({ chain }) => {
                return chain().setMark('textStyle', { textShadow }).run();
            },
            unsetTextShadow: () => ({ chain }) => {
                return chain().setMark('textStyle', { textShadow: null }).run();
            }
        };
    }
});

// Custom BlockStyles Extension to support paragraph/heading style attributes
const BlockStyles = Extension.create({
    name: 'blockStyles',
    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading'],
                attributes: {
                    style: {
                        default: null,
                        parseHTML: element => element.getAttribute('style'),
                        renderHTML: attributes => {
                            if (!attributes.style) return {};
                            return { style: attributes.style };
                        }
                    }
                }
            }
        ];
    }
});



export default function AdminBlogCreateEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const mode = id ? 'edit' : 'create';

    // Ribbon States
    const [showFormattingMarks, setShowFormattingMarks] = useState(false);
    const [formatPainterState, setFormatPainterState] = useState(null);
    const formatPainterRef = useRef(null);
    const savedSelectionRef = useRef(null);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [showFindReplacePanel, setShowFindReplacePanel] = useState(false);

    // Form fields state
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: 'Classic Books',
        excerpt: '',
        content: '<p><a href="https://readifyai.vercel.app/read/pride-and-prejudice">Read Pride and Prejudice Free on Readify AI</a></p>',
        coverImage: '',
        tags: [],
        relatedBooks: [],
        status: 'draft',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: []
    });

    // Books list for selection options
    const [booksOptions, setBooksOptions] = useState([]);

    // UI flow states
    const [loading, setLoading] = useState(mode === 'edit');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [fetchError, setFetchError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [slugError, setSlugError] = useState('');
    const [isSaved, setIsSaved] = useState(true);
    const [seoOpen, setSeoOpen] = useState(false);
    const [toast, setToast] = useState('');
    const [autosaveIndicator, setAutosaveIndicator] = useState('');
    const [showAutosaveModal, setShowAutosaveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Live Preview Panel visibility states
    // Live Preview Panel visibility states
    const [showPreview, setShowPreview] = useState(() => {
        const saved = localStorage.getItem('readify_preview_open');
        return saved === 'true';
    });
    const [previewLayout, setPreviewLayout] = useState('both'); // 'desktop', 'mobile', 'both'

    const togglePreview = () => {
        setShowPreview(prev => {
            const next = !prev;
            localStorage.setItem('readify_preview_open', String(next));
            return next;
        });
    };

    // Track manually edited slug flag
    const isManualSlug = useRef(false);
    const fileInputRef = useRef(null);

    // Quick Add Book Modal states
    const [showAddBookModal, setShowAddBookModal] = useState(false);
    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        category: 'Classic Books',
        description: '',
        thumbnailUrl: '',
        fileUrl: 'https://readify.ai/placeholder.epub',
        tags: 'classic, study',
        language: 'English',
        difficulty: 'Beginner'
    });
    const [newBookThumbnailFile, setNewBookThumbnailFile] = useState(null);
    const [newBookThumbnailPreview, setNewBookThumbnailPreview] = useState('');
    const [newBookImageMode, setNewBookImageMode] = useState('url'); // 'url' or 'file'
    const [modalSubmitting, setModalSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');

    // Editor Link Modal state
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Editor Image Modal state
    const [showImageModal, setShowImageModal] = useState(false);
    const [editorImageTab, setEditorImageTab] = useState('upload'); // 'upload' or 'url'
    const [editorImageUrl, setEditorImageUrl] = useState('');
    const [editorImageFile, setEditorImageFile] = useState(null);
    const [editorImageUploadProgress, setEditorImageUploadProgress] = useState(false);
    const [editorImageAlt, setEditorImageAlt] = useState('');
    const [editorImageAlignment, setEditorImageAlignment] = useState('align-center'); // 'align-left', 'align-center', 'align-right'
    const [editorImageError, setEditorImageError] = useState('');

    // YouTube Embed Modal state
    const [showYoutubeModal, setShowYoutubeModal] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const handleInsertYoutube = (e) => {
        e.preventDefault();
        if (!editor || !youtubeUrl.trim()) return;

        if (savedSelectionRef.current) {
            editor.chain().setTextSelection(savedSelectionRef.current).run();
        }

        editor.chain().focus().setYoutubeVideo({
            src: youtubeUrl.trim(),
            width: 640,
            height: 360,
        }).run();

        setShowYoutubeModal(false);
        setYoutubeUrl('');
    };

    const handleOpenLinkModal = () => {
        if (!editor) return;
        savedSelectionRef.current = editor.state.selection;
        const previousUrl = editor.getAttributes('link').href || '';
        setLinkUrl(previousUrl);
        setShowLinkModal(true);
    };

    const handleOpenImageModal = () => {
        if (!editor) return;
        savedSelectionRef.current = editor.state.selection;
        setShowImageModal(true);
    };

    const handleOpenYoutubeModal = () => {
        if (!editor) return;
        savedSelectionRef.current = editor.state.selection;
        setShowYoutubeModal(true);
    };

    const handleSaveLink = (e) => {
        e.preventDefault();
        if (!editor) return;

        if (savedSelectionRef.current) {
            editor.chain().setTextSelection(savedSelectionRef.current).run();
        }

        if (linkUrl.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run();
        }
        setShowLinkModal(false);
        setLinkUrl('');
    };

    const handleUnlink = () => {
        if (!editor) return;
        editor.chain().focus().unsetLink().run();
        setShowLinkModal(false);
        setLinkUrl('');
    };

    const handleInsertImage = async (e) => {
        e.preventDefault();
        if (!editor) return;
        setEditorImageError('');

        let finalUrl;

        if (editorImageTab === 'upload') {
            if (!editorImageFile) {
                setEditorImageError('Please select a file to upload.');
                return;
            }
            setEditorImageUploadProgress(true);
            try {
                const formDataUpload = new FormData();
                formDataUpload.append('thumbnail', editorImageFile);
                const response = await apiClient.post('/blogs/admin/upload-cover', formDataUpload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 0
                });
                if (response.data && response.data.url) {
                    finalUrl = response.data.url;
                } else {
                    throw new Error('No image URL returned from server.');
                }
            } catch (err) {
                console.error('[EditorImageUpload] Error:', err);
                setEditorImageError(err.response?.data?.message || err.message || 'Failed to upload image.');
                setEditorImageUploadProgress(false);
                return;
            }
            setEditorImageUploadProgress(false);
        } else {
            if (!editorImageUrl.trim()) {
                setEditorImageError('Please enter an image URL.');
                return;
            }
            finalUrl = editorImageUrl.trim();
        }

        if (savedSelectionRef.current) {
            editor.chain().setTextSelection(savedSelectionRef.current).run();
        }

        // Map initial modal alignments to our new classes
        let mappedAlignment;
        if (editorImageAlignment === 'align-left') mappedAlignment = 'img-left img-medium';
        else if (editorImageAlignment === 'align-right') mappedAlignment = 'img-right img-medium';
        else mappedAlignment = 'img-center img-large';

        // Insert image node to Tiptap editor with alignment class
        editor.chain().focus().setImage({
            src: finalUrl,
            alt: editorImageAlt.trim() || 'Blog inline image',
            class: mappedAlignment
        }).run();

        // Reset state & close modal
        setShowImageModal(false);
        setEditorImageUrl('');
        setEditorImageFile(null);
        setEditorImageAlt('');
        setEditorImageAlignment('align-center');
        setEditorImageError('');
    };

    // Helper functions for image alignment & size controls in the BubbleMenu
    const getSelectedImageAttributes = () => {
        if (!editor) return { alignment: 'img-center', size: 'img-large' };
        const attrs = editor.getAttributes('image');
        const classStr = attrs.class || '';
        
        let alignment = 'img-center';
        if (classStr.includes('img-left')) alignment = 'img-left';
        else if (classStr.includes('img-right')) alignment = 'img-right';
        else if (classStr.includes('img-center')) alignment = 'img-center';
        
        let size = 'img-large';
        if (classStr.includes('img-small')) size = 'img-small';
        else if (classStr.includes('img-medium')) size = 'img-medium';
        else if (classStr.includes('img-large')) size = 'img-large';
        else if (classStr.includes('img-full-width')) size = 'img-full-width';
        
        return { alignment, size };
    };

    const handleUpdateImageClass = (alignment, size) => {
        if (!editor) return;
        editor.chain().focus().updateAttributes('image', {
            class: `${alignment} ${size}`
        }).run();
    };

    useEffect(() => {
        if (!newBookThumbnailFile) {
            setNewBookThumbnailPreview('');
            return;
        }
        const objectUrl = URL.createObjectURL(newBookThumbnailFile);
        setNewBookThumbnailPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [newBookThumbnailFile]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: false,
                code: false,
                strike: false,
                horizontalRule: false,
                underline: false,
            }),
            TiptapLink.configure({
                openOnClick: false,
            }),
            CustomImage.configure({
                inline: true,
                allowBase64: true,
            }),
            Underline,
            Strike,
            Code,
            Subscript,
            Superscript,
            BlockStyles,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right', 'justify']
            }),
            CustomTextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Youtube.configure({
                inline: false,
                width: 640,
                height: 360,
            }),
            HorizontalRule,
        ],
        content: formData.content,
        editorProps: {
            attributes: {
                class: 'blog-content',
            },
            handleDOMEvents: {
                drop: (view, event) => {
                    const hasFiles = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length;
                    if (!hasFiles) return false;

                    const images = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                    if (images.length === 0) return false;

                    event.preventDefault();

                    const { schema } = view.state;
                    const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });

                    images.forEach(async (file) => {
                        try {
                            setToast('Uploading image...');
                            const uploadForm = new FormData();
                            uploadForm.append('thumbnail', file);
                            const response = await apiClient.post('/api/blogs/admin/upload-cover', uploadForm, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                timeout: 0
                            });
                            const url = response.data?.secure_url || response.data?.url;
                            if (url) {
                                const node = schema.nodes.image.create({ src: url, alt: file.name || 'Blog image' });
                                const transaction = view.state.tr.insert(coordinates.pos, node);
                                view.dispatch(transaction);
                                setToast('Image uploaded successfully.');
                                setTimeout(() => setToast(''), 1500);
                            }
                        } catch (err) {
                            console.error('[EditorImageDrop] Upload failed:', err);
                            setToast('Image upload failed.');
                            setTimeout(() => setToast(''), 1500);
                        }
                    });
                    return true;
                },
                paste: (view, event) => {
                    const hasItems = event.clipboardData && event.clipboardData.items && event.clipboardData.items.length;
                    if (!hasItems) return false;

                    const images = Array.from(event.clipboardData.items)
                        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                        .map(item => item.getAsFile());

                    if (images.length === 0) return false;

                    event.preventDefault();

                    const { schema } = view.state;
                    const selectionPos = view.state.selection.from;

                    images.forEach(async (file) => {
                        try {
                            setToast('Uploading pasted image...');
                            const uploadForm = new FormData();
                            uploadForm.append('thumbnail', file);
                            const response = await apiClient.post('/api/blogs/admin/upload-cover', uploadForm, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                timeout: 0
                            });
                            const url = response.data?.secure_url || response.data?.url;
                            if (url) {
                                const node = schema.nodes.image.create({ src: url, alt: file.name || 'Blog pasted image' });
                                const transaction = view.state.tr.insert(selectionPos, node);
                                view.dispatch(transaction);
                                setToast('Image uploaded successfully.');
                                setTimeout(() => setToast(''), 1500);
                            }
                        } catch (err) {
                            console.error('[EditorImagePaste] Upload failed:', err);
                            setToast('Image upload failed.');
                            setTimeout(() => setToast(''), 1500);
                        }
                    });
                    return true;
                }
            }
        },
        onUpdate: ({ editor }) => {
            setFormData(prev => ({
                ...prev,
                content: editor.getHTML()
            }));
            setIsSaved(false);
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            const copiedFormat = formatPainterRef.current;
            if (copiedFormat && from !== to) {
                let chain = editor.chain().focus();
                // Apply copied marks
                copiedFormat.marks.forEach(mark => {
                    chain = chain.setMark(mark.name, mark.attrs);
                });
                // Apply copied styles
                if (copiedFormat.textStyle) {
                    chain = chain.setMark('textStyle', copiedFormat.textStyle);
                }
                chain.run();
                formatPainterRef.current = null; // Clear ref after applying
                setFormatPainterState(null); // Clear state
                setToast('Format applied.');
                setTimeout(() => setToast(''), 1500);
            }
        }
    });

    // Sync editor content when loaded (e.g., from DB or local storage restore)
    useEffect(() => {
        if (editor && !editor.isDestroyed && !editor.isFocused && formData.content !== editor.getHTML()) {
            editor.commands.setContent(formData.content || '');
        }
    }, [formData.content, editor]);

    // Retrieve active logged in user for preview
    const authUser = useMemo(() => {
        try {
            const raw = localStorage.getItem('authUser');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    // Get current date formatted for preview
    const previewDate = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }, []);

    // Estimate reading time for preview
    const previewReadTime = useMemo(() => {
        const text = formData.content || '';
        const words = text.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200) || 1;
        return `${minutes} min read`;
    }, [formData.content]);

    // Fetch all books for related books select dropdown
    const fetchBooks = async () => {
        try {
            const response = await apiClient.get('/api/books', { timeout: 60000 });
            const data = response.data || [];
            const resolved = Array.isArray(data) ? data : data.books || data.data || [];

            const options = resolved.map(book => ({
                value: book._id,
                label: `${book.title} - ${book.author}`,
                title: book.title,
                author: book.author,
                coverImage: book.coverImage || book.thumbnail
            }));
            setBooksOptions(options);
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Fetch books error:', err);
        }
    };

    // Load blog data if in edit mode
    const fetchBlogDetail = async () => {
        if (mode !== 'edit' || !id) return;
        setLoading(true);
        setFetchError('');
        try {
            const response = await apiClient.get(`/api/blogs/admin/${id}`, { timeout: 60000 });
            const blog = response.data?.blog;
            if (!blog) {
                throw new Error('Blog post not found.');
            }

            // Map blog content to form structure
            setFormData({
                title: blog.title || '',
                slug: blog.slug || '',
                category: blog.category || 'Classic Books',
                excerpt: blog.excerpt || '',
                content: blog.content || '',
                coverImage: blog.coverImage || '',
                tags: blog.tags || [],
                relatedBooks: blog.relatedBooks ? blog.relatedBooks.map(b => typeof b === 'object' ? b._id : b) : [],
                status: blog.status || 'draft',
                seoTitle: blog.seoTitle || '',
                seoDescription: blog.seoDescription || '',
                seoKeywords: blog.seoKeywords || []
            });
            isManualSlug.current = true;
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Fetch details error:', err);
            setFetchError(err.response?.data?.message || err.message || 'Unable to retrieve blog details.');
        } finally {
            setLoading(false);
        }
    };

    // Load on mount
    useEffect(() => {
        fetchBooks();

        // Check if there is a saved autosave in localStorage
        const autosaved = localStorage.getItem('readify_autosave_blog');
        if (autosaved) {
            try {
                const parsed = JSON.parse(autosaved);
                // Only prompt restore if it corresponds to current state (create mode, or matching id for edit mode)
                if ((mode === 'create' && !parsed.id) || (mode === 'edit' && parsed.id === id)) {
                    setShowAutosaveModal(true);
                }
            } catch {
                localStorage.removeItem('readify_autosave_blog');
            }
        }

        fetchBlogDetail();
    }, [id, mode]);

    // Track dirty form state for unsaved changes warning
    const updateFormField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
        // Clear field validation error
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [fieldErrors]);

    // Handle Title update + Auto slugify sync
    const handleTitleChange = (e) => {
        const titleVal = e.target.value;
        updateFormField('title', titleVal);

        // Auto generate slug if user hasn't typed a custom one manually
        if (!isManualSlug.current) {
            updateFormField('slug', slugify(titleVal));
        }
    };

    // Handle slug blur uniqueness verification
    const handleSlugBlur = async () => {
        const slugVal = formData.slug.trim();
        if (!slugVal) {
            setSlugError('Slug is required');
            return;
        }

        try {
            // Checks slug usage by querying details endpoint
            const response = await fetch(buildApiUrl(`/blogs/${encodeURIComponent(slugVal)}`));
            const data = await response.json();
            if (response.ok && data.blog && data.blog._id !== id) {
                setSlugError('This slug is already in use by another article.');
            } else {
                setSlugError('');
            }
        } catch {
            setSlugError(''); // If 404/error, slug is available
        }
    };

    // File cover image upload handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setToast('Uploading cover image...');

        try {
            const uploadForm = new FormData();
            uploadForm.append('thumbnail', file); // passes multer image filter

            const response = await apiClient.post('/api/blogs/admin/upload-cover', uploadForm, {
                timeout: 0
            });

            // Verify Cloudinary upload was successful (response has secure_url)
            const secureUrl = response.data?.secure_url || response.data?.url;
            if (response.data?.success && secureUrl) {
                updateFormField('coverImage', secureUrl);
                setToast('Cover image uploaded successfully.');
                setTimeout(() => setToast(''), 2200);
            } else {
                setToast('Image upload failed: Cloudinary secure URL not found.');
                updateFormField('coverImage', '');
                throw new Error('Upload succeeded but no secure URL was returned.');
            }
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] File upload error:', err);
            setToast('Image upload failed. Please try again.');
            updateFormField('coverImage', '');
            setFieldErrors(prev => ({
                ...prev,
                coverImage: err.response?.data?.message || err.message || 'Image upload failed.'
            }));
        } finally {
            setUploading(false);
        }
    };

    // Related books multi-select options sync
    const selectedRelatedBooksOptions = useMemo(() => {
        return booksOptions.filter(opt => formData.relatedBooks.includes(opt.value));
    }, [booksOptions, formData.relatedBooks]);

    const handleRelatedBooksChange = (selectedOpts) => {
        const ids = selectedOpts ? selectedOpts.map(opt => opt.value) : [];
        if (ids.length > 20) {
            setFieldErrors(prev => ({ ...prev, relatedBooks: 'A maximum of 20 related books can be linked.' }));
            return;
        }
        updateFormField('relatedBooks', ids);
    };

    const handleQuickAddBookSubmit = async () => {
        const titleVal = newBook.title.trim();
        const authorVal = newBook.author.trim();
        const categoryVal = newBook.category.trim();
        const fileUrlVal = newBook.fileUrl.trim();
        const thumbnailUrlVal = newBook.thumbnailUrl.trim();

        if (!titleVal || !authorVal || !categoryVal || !fileUrlVal) {
            setModalError('Title, Author, Category, and Book File URL are required.');
            return;
        }

        if (newBookImageMode === 'url' && !thumbnailUrlVal) {
            setModalError('Cover Image URL is required.');
            return;
        }

        if (newBookImageMode === 'file' && !newBookThumbnailFile) {
            setModalError('Cover Image File upload is required.');
            return;
        }

        setModalSubmitting(true);
        setModalError('');

        try {
            const token = localStorage.getItem('authToken');
            const formDataPayload = new FormData();
            formDataPayload.append('title', titleVal);
            formDataPayload.append('author', authorVal);
            formDataPayload.append('category', categoryVal);
            formDataPayload.append('description', `Special classic featured book: ${titleVal} by ${authorVal}.`);
            formDataPayload.append('language', 'English');
            formDataPayload.append('difficulty', 'Intermediate');
            formDataPayload.append('tags', JSON.stringify(['classic', 'featured']));

            if (newBookImageMode === 'file' && newBookThumbnailFile) {
                formDataPayload.append('thumbnail', newBookThumbnailFile);
            } else {
                formDataPayload.append('thumbnail', thumbnailUrlVal);
            }

            formDataPayload.append('fileUrl', fileUrlVal);

            const response = await apiClient.post('/api/books', formDataPayload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data && response.data.success && response.data.data) {
                const createdBook = response.data.data;

                await fetchBooks();

                setFormData(prev => {
                    const currentRelated = prev.relatedBooks || [];
                    if (!currentRelated.includes(createdBook._id)) {
                        return {
                            ...prev,
                            relatedBooks: [...currentRelated, createdBook._id]
                        };
                    }
                    return prev;
                });

                setToast(`Book "${createdBook.title}" added and selected.`);
                setTimeout(() => setToast(''), 2200);

                setNewBook({
                    title: '',
                    author: '',
                    category: formData.category || 'Classic Books',
                    description: '',
                    thumbnailUrl: '',
                    fileUrl: 'https://readify.ai/placeholder.epub',
                    tags: 'classic, study',
                    language: 'English',
                    difficulty: 'Beginner'
                });
                setNewBookThumbnailFile(null);
                setShowAddBookModal(false);
            } else {
                throw new Error('Unknown response payload structure.');
            }
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Quick add book error:', err);
            setModalError(err.response?.data?.message || err.message || 'Failed to add the book.');
        } finally {
            setModalSubmitting(false);
        }
    };

    // Tags Management
    const handleAddTag = (tag) => {
        const trimmed = tag.trim().toLowerCase();
        if (trimmed && !formData.tags.includes(trimmed)) {
            updateFormField('tags', [...formData.tags, trimmed]);
        }
    };

    const handleRemoveTag = (tag) => {
        updateFormField('tags', formData.tags.filter(t => t !== tag));
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            handleAddTag(e.target.value);
            e.target.value = '';
        }
    };

    // Restore autosaved draft
    const handleRestoreAutosave = () => {
        try {
            const autosaved = localStorage.getItem('readify_autosave_blog');
            if (autosaved) {
                const parsed = JSON.parse(autosaved);
                setFormData(parsed.data);
                isManualSlug.current = true;
                setIsSaved(false);
                setAutosaveIndicator('Autosave restored.');
            }
        } catch (err) {
            console.error('Failed to restore autosave', err);
        } finally {
            setShowAutosaveModal(false);
        }
    };

    const handleDiscardAutosave = () => {
        localStorage.removeItem('readify_autosave_blog');
        setShowAutosaveModal(false);
    };

    // Auto-save logic (runs every 30 seconds if form is dirty)
    useEffect(() => {
        if (isSaved) return undefined;

        const intervalId = setInterval(() => {
            setAutosaveIndicator('Saving draft...');
            const autosavePayload = {
                id: mode === 'edit' ? id : null,
                timestamp: Date.now(),
                data: formData
            };
            localStorage.setItem('readify_autosave_blog', JSON.stringify(autosavePayload));

            setTimeout(() => {
                setAutosaveIndicator('Draft saved locally.');
            }, 1000);
        }, 30000);

        return () => clearInterval(intervalId);
    }, [formData, isSaved, id, mode]);

    // Unsaved navigation warnings
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!isSaved) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to discard them?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaved]);

    // Keyboard shortcut (Ctrl + S to Save / Publish)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [formData]);

    // Helper to upload inline base64 images inside content before saving
    const uploadBase64ImagesInContent = async (htmlContent) => {
        if (!htmlContent) return htmlContent;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));
        const base64Images = images.filter(img => img.src && img.src.startsWith('data:image/'));

        if (base64Images.length === 0) return htmlContent;

        setToast(`Uploading ${base64Images.length} inline images...`);

        const dataURLtoFile = (dataurl, filename) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
        };

        for (let i = 0; i < base64Images.length; i++) {
            const img = base64Images[i];
            const base64Data = img.getAttribute('src');
            try {
                setToast(`Uploading image ${i + 1} of ${base64Images.length}...`);
                const file = dataURLtoFile(base64Data, `inline_image_${Date.now()}_${i}.png`);
                const uploadForm = new FormData();
                uploadForm.append('thumbnail', file);
                const response = await apiClient.post('/api/blogs/admin/upload-cover', uploadForm, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 0
                });
                const url = response.data?.secure_url || response.data?.url;
                if (url) {
                    img.setAttribute('src', url);
                }
            } catch (err) {
                console.error(`[uploadBase64ImagesInContent] Failed to upload image ${i + 1}:`, err);
                throw new Error(`Failed to upload embedded image #${i + 1}. Please verify image file size.`);
            }
        }

        return doc.body.innerHTML;
    };

    // Submit handler
    const handleSubmit = async (e, overrideStatus) => {
        if (e && e.preventDefault) e.preventDefault();

        const activeStatus = overrideStatus || formData.status;

        // Manual validation schema check
        const errors = {};
        const cleanTitle = formData.title.trim();
        const cleanExcerpt = formData.excerpt.trim();
        const cleanContent = formData.content.replace(/<[^>]*>/g, '').trim();
        const cleanCoverImage = formData.coverImage.trim();
        const cleanSlug = formData.slug.trim();

        if (!cleanTitle) errors.title = 'Title is required';
        else if (cleanTitle.length < 5 || cleanTitle.length > 200) errors.title = 'Title must be between 5 and 200 characters';

        if (!cleanSlug) errors.slug = 'Slug is required';
        if (slugError) errors.slug = slugError;

        if (!cleanExcerpt) errors.excerpt = 'Excerpt is required';
        else if (cleanExcerpt.length > 200) errors.excerpt = 'Excerpt cannot exceed 200 characters';

        if (!cleanContent) errors.content = 'Content is required';
        else if (cleanContent.length < 100) errors.content = 'Content must contain at least 100 characters';

        if (!cleanCoverImage) errors.coverImage = 'Cover image URL/file is required';

        if (formData.relatedBooks.length > 20) errors.relatedBooks = 'A maximum of 20 related books can be linked';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setToast('Please resolve validation errors before saving.');
            setTimeout(() => setToast(''), 2200);
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            // Upload any base64 images to Cloudinary before sending the request
            const cleanContentHtml = await uploadBase64ImagesInContent(formData.content);
            const submissionData = {
                ...formData,
                status: activeStatus,
                content: cleanContentHtml
            };

            const endpoint = mode === 'create' ? '/api/blogs' : `/api/blogs/${id}`;
            const apiMethod = mode === 'create' ? 'post' : 'put';

            await apiClient[apiMethod](endpoint, submissionData, { timeout: 120000 });

            // Sync clean content to editor and state
            editor?.commands?.setContent(cleanContentHtml);
            setFormData(submissionData);

            setToast(mode === 'create' ? 'Blog created successfully.' : 'Blog updated successfully.');
            setTimeout(() => setToast(''), 2200);

            setIsSaved(true);
            // Clear localStorage auto-save draft
            localStorage.removeItem('readify_autosave_blog');

            navigate('/admin/blogs');
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Save error:', err);
            setError(err.response?.data?.message || err.message || 'An error occurred while saving the blog post.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleArchiveBlog = async () => {
        if (mode !== 'edit' || !id) return;
        setDeleting(true);
        setError('');
        try {
            await apiClient.delete(`/api/blogs/${id}`);
            setToast('Blog post archived successfully.');
            setTimeout(() => setToast(''), 2200);
            navigate('/admin/blogs');
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Archive error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to archive blog.');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handlePermanentDeleteBlog = async () => {
        if (mode !== 'edit' || !id) return;
        setDeleting(true);
        setError('');
        try {
            await apiClient.delete(`/api/blogs/${id}/permanent`);
            setToast('Blog post permanently deleted.');
            setTimeout(() => setToast(''), 2200);
            navigate('/admin/blogs');
        } catch (err) {
            console.error('[AdminBlogCreateEditPage] Permanent delete error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to permanently delete blog.');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // Quick save status change triggers
    const handleSaveStatus = async (statusVal) => {
        setFormData(prev => ({ ...prev, status: statusVal }));
        // Execute submit with immediate status override
        await handleSubmit(null, statusVal);
    };

    // Ribbon Helper Functions
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (editor) {
                editor.commands.insertContent(text);
            }
        } catch {
            setToast('Please use Ctrl+V to paste directly.');
            setTimeout(() => setToast(''), 2200);
        }
    };

    const handleCut = async () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const text = editor.state.doc.textBetween(from, to, ' ');
        try {
            await navigator.clipboard.writeText(text);
            editor.commands.deleteSelection();
            setToast('Cut to clipboard.');
        } catch {
            setToast('Please use Ctrl+X to cut selection.');
        }
        setTimeout(() => setToast(''), 1500);
    };

    const handleCopy = async () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const text = editor.state.doc.textBetween(from, to, ' ');
        try {
            await navigator.clipboard.writeText(text);
            setToast('Copied to clipboard.');
        } catch {
            setToast('Please use Ctrl+C to copy selection.');
        }
        setTimeout(() => setToast(''), 1500);
    };

    const handleFormatPainterClick = () => {
        if (!editor) return;
        const activeMarkTypes = ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'highlight'];
        const marks = [];
        activeMarkTypes.forEach(name => {
            if (editor.isActive(name)) {
                marks.push({ name, attrs: editor.getAttributes(name) });
            }
        });
        const textStyle = editor.getAttributes('textStyle') || {};
        const format = { marks, textStyle };
        formatPainterRef.current = format;
        setFormatPainterState(format);
        setToast('Format copied. Select text to apply.');
        setTimeout(() => setToast(''), 2200);
    };

    const changeFontSizeStep = (direction) => {
        if (!editor) return;
        const attrs = editor.getAttributes('textStyle');
        const currentSize = attrs.fontSize || '16px';
        const sizeNum = parseInt(currentSize, 10) || 16;
        let newSize;
        if (direction === 'increase') {
            if (sizeNum < 12) newSize = sizeNum + 1;
            else if (sizeNum < 28) newSize = sizeNum + 2;
            else if (sizeNum < 48) newSize = sizeNum + 4;
            else newSize = sizeNum + 8;
        } else {
            if (sizeNum <= 12) newSize = Math.max(8, sizeNum - 1);
            else if (sizeNum <= 28) newSize = sizeNum - 2;
            else if (sizeNum <= 48) newSize = sizeNum - 4;
            else newSize = sizeNum - 8;
        }
        editor.commands.setFontSize(`${newSize}px`);
    };

    const changeTextCase = (caseType) => {
        if (!editor) return;
        const { state, dispatch } = editor.view;
        const { from, to } = state.selection;
        if (from === to) return;

        const tr = state.tr;
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
                const start = Math.max(from, pos);
                const end = Math.min(to, pos + node.text.length);
                const originalText = node.text.slice(start - pos, end - pos);
                let newText = originalText;
                if (caseType === 'uppercase') {
                    newText = originalText.toUpperCase();
                } else if (caseType === 'lowercase') {
                    newText = originalText.toLowerCase();
                } else if (caseType === 'sentence') {
                    newText = originalText.charAt(0).toUpperCase() + originalText.slice(1).toLowerCase();
                } else if (caseType === 'capitalize') {
                    newText = originalText.replace(/\b\w/g, c => c.toUpperCase());
                } else if (caseType === 'toggle') {
                    newText = originalText.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
                }
                tr.replaceWith(start, end, state.schema.text(newText, node.marks));
            }
        });
        dispatch(tr);
    };

    const clearFormatting = () => {
        if (!editor) return;
        editor.chain().focus().clearNodes().unsetAllMarks().run();
        setToast('Formatting cleared.');
        setTimeout(() => setToast(''), 1200);
    };

    const handleMultilevelList = () => {
        if (!editor) return;
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            editor.chain().focus().sinkListItem('listItem').run();
        } else {
            editor.chain().focus().toggleBulletList().sinkListItem('listItem').run();
        }
    };

    const handleIndent = () => {
        if (!editor) return;
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            editor.chain().focus().sinkListItem('listItem').run();
        } else {
            editor.chain().focus().indentText().run();
        }
    };

    const handleOutdent = () => {
        if (!editor) return;
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
            editor.chain().focus().liftListItem('listItem').run();
        } else {
            editor.chain().focus().outdentText().run();
        }
    };

    const sortSelectedLines = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const text = editor.state.doc.textBetween(from, to, '\n');
        const lines = text.split('\n');
        if (lines.length <= 1) return;
        const sorted = [...lines].sort((a, b) => a.localeCompare(b));
        editor.chain().focus().insertContentAt({ from, to }, sorted.join('\n')).run();
        setToast('Lines sorted alphabetically.');
        setTimeout(() => setToast(''), 1500);
    };

    const setBlockShading = (color) => {
        if (!editor) return;
        const type = editor.isActive('heading') ? 'heading' : 'paragraph';
        const currentAttrs = editor.getAttributes(type) || {};
        const currentStyle = currentAttrs.style || '';
        let newStyle = currentStyle.replace(/background-color:[^;]+;?/g, '').replace(/padding:[^;]+;?/g, '').replace(/border-radius:[^;]+;?/g, '');
        if (color) {
            newStyle = `background-color: ${color}; padding: 8px; border-radius: 4px; ${newStyle}`;
        }
        editor.commands.updateAttributes(type, { style: newStyle.trim() });
    };

    const setBlockBorder = (borderType) => {
        if (!editor) return;
        const type = editor.isActive('heading') ? 'heading' : 'paragraph';
        const currentAttrs = editor.getAttributes(type) || {};
        const currentStyle = currentAttrs.style || '';
        let newStyle = currentStyle
            .replace(/border-[^;]+;?/g, '')
            .replace(/border:[^;]+;?/g, '')
            .replace(/padding-bottom:[^;]+;?/g, '')
            .replace(/padding-top:[^;]+;?/g, '')
            .replace(/padding-left:[^;]+;?/g, '')
            .replace(/padding:[^;]+;?/g, '');

        let borderStyle = '';
        if (borderType === 'bottom') {
            borderStyle = 'border-bottom: 2px solid rgba(99, 102, 241, 0.6); padding-bottom: 4px;';
        } else if (borderType === 'box') {
            borderStyle = 'border: 2px solid rgba(99, 102, 241, 0.6); padding: 8px; border-radius: 4px;';
        } else if (borderType === 'top') {
            borderStyle = 'border-top: 2px solid rgba(99, 102, 241, 0.6); padding-top: 4px;';
        } else if (borderType === 'left') {
            borderStyle = 'border-left: 4px solid rgba(99, 102, 241, 0.6); padding-left: 8px;';
        }

        if (borderStyle) {
            newStyle = `${borderStyle} ${newStyle}`;
        }
        editor.commands.updateAttributes(type, { style: newStyle.trim() });
    };

    const handleFindAndReplace = (replaceAll = false) => {
        if (!editor || !findText.trim()) return;

        const { state, dispatch } = editor.view;
        const tr = state.tr;
        const searchRegex = new RegExp(findText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        let matches = [];

        state.doc.descendants((node, pos) => {
            if (node.isText) {
                const text = node.text;
                let match;
                while ((match = searchRegex.exec(text)) !== null) {
                    matches.push({
                        from: pos + match.index,
                        to: pos + match.index + match[0].length,
                        text: match[0]
                    });
                }
            }
        });

        if (matches.length === 0) {
            setToast('No matches found.');
            setTimeout(() => setToast(''), 1500);
            return;
        }

        if (replaceAll) {
            for (let i = matches.length - 1; i >= 0; i--) {
                const { from, to } = matches[i];
                tr.replaceWith(from, to, state.schema.text(replaceText));
            }
            dispatch(tr);
            setToast(`Replaced ${matches.length} occurrence(s).`);
        } else {
            const first = matches[0];
            const { from: selFrom, to: selTo } = state.selection;
            let matchToReplace = matches.find(m => m.from === selFrom && m.to === selTo);
            if (matchToReplace) {
                tr.replaceWith(matchToReplace.from, matchToReplace.to, state.schema.text(replaceText));
                dispatch(tr);
                setTimeout(() => {
                    handleFindAndReplace(false);
                }, 50);
            } else {
                editor.commands.setTextSelection({ from: first.from, to: first.to });
                setToast(`Found match. Click again to replace.`);
            }
        }
        setTimeout(() => setToast(''), 2000);
    };

    const applyTextEffect = (effectType) => {
        if (!editor) return;
        let style;
        if (effectType === 'glow') {
            style = { textShadow: '0 0 8px rgba(99, 102, 241, 0.8), 0 0 2px rgba(99, 102, 241, 0.9)' };
        } else if (effectType === 'shadow') {
            style = { textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6)' };
        } else if (effectType === 'outline') {
            style = { textShadow: '-1px -1px 0 #6366f1, 1px -1px 0 #6366f1, -1px 1px 0 #6366f1, 1px 1px 0 #6366f1' };
        } else if (effectType === 'blue-glow') {
            style = { textShadow: '0 0 8px rgba(59, 130, 246, 0.8)' };
        } else {
            editor.commands.unsetTextShadow();
            return;
        }
        editor.commands.setTextShadow(style.textShadow);
    };

    const STYLES_GALLERY = useMemo(() => [
        { name: 'Normal', label: 'Normal', preview: 'AaBbCc', action: () => editor.chain().focus().setParagraph().unsetFontSize().unsetFontFamily().unsetColor().unsetLineHeight().unsetTextShadow().run() },
        { name: 'No Spacing', label: 'No Spacing', preview: 'AaBbCc', action: () => editor.chain().focus().setParagraph().setLineHeight('1.0').run() },
        { name: 'Heading 1', label: 'Heading 1', preview: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
        { name: 'Heading 2', label: 'Heading 2', preview: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { name: 'Heading 3', label: 'Heading 3', preview: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { name: 'Title', label: 'Title', preview: 'Title', action: () => editor.chain().focus().toggleHeading({ level: 1 }).setFontSize('32px').setColor('#6366f1').run() },
        { name: 'Subtitle', label: 'Subtitle', preview: 'Subtitle', action: () => editor.chain().focus().setParagraph().setFontSize('18px').setColor('#94a3b8').run() }
    ], [editor]);

    const isStyleActive = (style) => {
        if (!editor) return false;
        if (style.name === 'Heading 1') return editor.isActive('heading', { level: 1 });
        if (style.name === 'Heading 2') return editor.isActive('heading', { level: 2 });
        if (style.name === 'Heading 3') return editor.isActive('heading', { level: 3 });
        if (style.name === 'Normal') return editor.isActive('paragraph') && !editor.getAttributes('textStyle').fontSize;
        if (style.name === 'No Spacing') return editor.isActive('paragraph') && editor.getAttributes('textStyle').lineHeight === '1.0';
        return false;
    };

    const inputClass =
        'w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition duration-300 placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-slate-900/70';

    const isEditorReady = editor && !editor.isDestroyed;


    const renderPreviewPanelContent = () => {
        return (
            <div className="space-y-6">
                <article className="rounded-xl overflow-hidden border border-white/5 bg-slate-950/40 p-4 flex flex-col gap-4">
                    {/* Cover preview */}
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-900/60 relative">
                        {formData.coverImage ? (
                            <img
                                src={formData.coverImage}
                                alt={formData.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="grid h-full place-items-center text-xs font-semibold text-slate-500">Image Cover</div>
                        )}
                        <span className="absolute left-2.5 top-2.5 rounded bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold uppercase text-indigo-300 border border-white/10 tracking-wide">
                            {formData.category}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>{previewDate}</span>
                            <span className="h-1 w-1 rounded bg-slate-700" />
                            <span>{previewReadTime}</span>
                        </div>
                        <h4 className="text-base font-bold text-white leading-snug">
                            {formData.title || 'Untitled Post'}
                        </h4>
                        {formData.excerpt && (
                            <p className="text-xs leading-relaxed text-slate-400">
                                {formData.excerpt}
                            </p>
                        )}
                    </div>

                    {/* Author preview */}
                    <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 ring-1 ring-white/10 flex items-center justify-center text-[9px] font-bold text-indigo-300">
                                {authUser?.avatar ? (
                                    <img src={authUser.avatar} alt="User" className="h-full w-full object-cover rounded-full" />
                                ) : (
                                    (authUser?.username || 'A').charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-300">
                                {authUser?.username || 'Admin'}
                            </span>
                        </div>
                        <span className="rounded bg-slate-900 border border-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            {formData.status}
                        </span>
                    </div>
                </article>

                {/* Rendered HTML content */}
                <div className="border-t border-white/10 pt-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Article Content Preview</h4>
                    <div
                        className="blog-content-html blog-content text-left text-gray-300 text-sm leading-relaxed space-y-4 
                        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
                        [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3
                        [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2
                        [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-gray-300
                        [&_a]:text-purple-400 [&_a]:underline
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-3
                        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-3
                        [&_img]:rounded-xl [&_img]:border [&_img]:border-purple-500/15 [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
                        [&_blockquote]:border-l-4 [&_blockquote]:border-purple-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-400 [&_blockquote]:my-4
                        [&_pre]:bg-slate-950/80 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-purple-500/15 [&_pre]:overflow-x-auto [&_pre]:my-4
                        [&_code]:bg-slate-900/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-purple-300 [&_code]:font-mono [&_code]:text-xs clearfix"
                        dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-slate-500 italic">No content written yet...</p>' }}
                    />
                </div>

                {/* Option A: Featured Books Preview */}
                {selectedRelatedBooksOptions.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 border-b border-white/5 pb-1.5 flex justify-between items-center">
                            <span>Featured Books</span>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">{selectedRelatedBooksOptions.length}</span>
                        </h4>
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {selectedRelatedBooksOptions.map((book) => (
                                <div key={book.value} className="flex gap-2.5 items-center rounded-lg bg-slate-950/40 p-2 border border-white/5">
                                    <div className="h-10 w-7 flex-shrink-0 rounded overflow-hidden bg-slate-900/60 border border-white/10 relative text-center flex items-center justify-center">
                                        {book.coverImage ? (
                                            <img
                                                src={book.coverImage}
                                                alt={book.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-[7px] font-bold text-slate-500 text-center leading-tight">No Cover</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-[11px] font-bold text-white truncate">{book.title}</h5>
                                        <p className="text-[9px] text-slate-400 truncate">by {book.author}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderMobilePreview = () => (
        <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>📱 Mobile Preview</span>
                <span className="text-[9px] lowercase text-slate-600">(375px viewport)</span>
            </div>
            {/* Simulated phone frame */}
            <div className="w-[375px] h-[640px] rounded-[32px] border-8 border-slate-800 bg-[#050914] overflow-y-auto shadow-2xl flex flex-col p-4 relative scrollbar-none scrollbar-thin">
                <div className="mt-4 flex-1">
                    {renderPreviewPanelContent()}
                </div>
            </div>
        </div>
    );

    const renderDesktopPreview = () => (
        <div className="flex flex-col items-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span>💻 Desktop Preview</span>
                <span className="text-[9px] lowercase text-slate-600">(1100px viewport, scaled)</span>
            </div>
            {/* Simulated desktop window */}
            <div className="w-[420px] h-[640px] rounded-2xl border-8 border-slate-800 bg-[#050914] overflow-hidden shadow-2xl relative flex flex-col">
                {/* Window header */}
                <div className="h-6 bg-slate-900 border-b border-white/5 flex items-center px-3 gap-1 shrink-0">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="mx-auto w-40 h-3 bg-slate-950 rounded text-[8px] text-slate-600 flex items-center justify-center font-mono overflow-hidden">
                        readifyai.com/preview
                    </div>
                </div>
                {/* Scrollable container */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin">
                    <div className="w-[1100px] origin-top-left scale-[0.35] h-auto pb-[180%]">
                        {renderPreviewPanelContent()}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative min-h-screen overflow-x-clip bg-[#050914] text-slate-100">
            {/* Ambient background glows */}
            <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-purple-500/10 blur-[130px]" />

            {/* SEO Helmet metadata */}
            <SEO
                title={mode === 'create' ? 'Create Blog | Readify AI Admin' : `Edit Blog | ${formData.title || 'Readify AI Admin'}`}
                description="Manage Readify AI Blog contents"
                path="/admin/blogs"
            />

            {/* Notification toast alert */}
            {toast && (
                <div className="fixed right-4 top-4 z-[130] rounded-xl border border-indigo-300/40 bg-indigo-950/90 px-4 py-3 text-sm font-semibold text-indigo-100 shadow-xl backdrop-blur-xl animate-[fadeIn_200ms_ease-out]">
                    {toast}
                </div>
            )}

            <MainLayout wide>
                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-2xl lg:p-8">

                    {/* Header bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-white/5 text-left">
                        <div>
                            <Link to="/admin/blogs" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mb-1.5">
                                &larr; Back to Blogs
                            </Link>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">
                                {mode === 'create' ? 'Create Blog Post' : 'Edit Blog Post'}
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                {autosaveIndicator ? (
                                    <span className="text-indigo-300 font-bold animate-pulse">{autosaveIndicator}</span>
                                ) : (
                                    'Draft changes are automatically saved locally every 30 seconds.'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Split two-column layout: Form (70%) & Live Preview (30%) */}
                    {loading ? (
                        <div className="py-12 text-center animate-pulse">
                            <div className="mx-auto h-12 w-12 rounded-full border-4 border-white/10 border-t-indigo-400 animate-spin" />
                            <p className="mt-4 text-sm text-slate-400">Loading blog details...</p>
                        </div>
                    ) : fetchError && mode === 'edit' ? (
                        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-center max-w-md mx-auto my-8">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="mt-2 text-sm font-bold text-white">Could not load details</h3>
                            <p className="mt-1.5 text-xs text-rose-300/80 leading-relaxed">{fetchError}</p>
                            <div className="mt-5 flex gap-2 justify-center">
                                <button type="button" onClick={fetchBlogDetail} className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600">Retry</button>
                                <Link to="/admin/blogs" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">Cancel</Link>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8 items-start relative">

                            {/* Form Column */}
                            <form onSubmit={handleSubmit} className={`w-full flex flex-col gap-6 text-left transition-all duration-300 ease-in-out ${showPreview ? 'flex-1 min-w-0' : 'w-full max-w-none'}`}>
                                {submitting && (
                                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-300 flex items-center gap-2">
                                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white/10 border-t-indigo-400 animate-spin" />
                                        <span>Saving post changes. Large posts with images may take a moment to upload to Cloudinary...</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-4 text-xs text-rose-300">
                                        {error}
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 sm:p-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">Basic Info</h3>

                                    {/* Title */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Title <span className="text-rose-400">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={handleTitleChange}
                                            placeholder="Enter article title"
                                            className={inputClass}
                                        />
                                        {fieldErrors.title && <p className="text-xs text-rose-400 mt-1">{fieldErrors.title}</p>}
                                    </div>

                                    {/* Slug preview & manual override */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Slug URL path <span className="text-rose-400">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            onChange={(e) => {
                                                isManualSlug.current = true;
                                                updateFormField('slug', slugify(e.target.value));
                                            }}
                                            onBlur={handleSlugBlur}
                                            placeholder="article-slug-path"
                                            className={inputClass}
                                        />
                                        <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                                            Preview path: <span className="text-indigo-300 font-mono">/blog/{formData.slug || '[slug]'}</span>
                                        </p>
                                        {slugError && <p className="text-xs text-rose-400 mt-1">{slugError}</p>}
                                    </div>

                                    {/* Category Selector */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300">Category <span className="text-rose-400">*</span></label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => updateFormField('category', e.target.value)}
                                            className={inputClass}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat} className="bg-slate-950 text-white">
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Excerpt */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-300">Excerpt <span className="text-rose-400">*</span></label>
                                            <span className="text-[10px] text-slate-500 font-mono">{formData.excerpt.length}/200</span>
                                        </div>
                                        <textarea
                                            value={formData.excerpt}
                                            onChange={(e) => {
                                                if (e.target.value.length <= 200) {
                                                    updateFormField('excerpt', e.target.value);
                                                }
                                            }}
                                            rows="3"
                                            placeholder="Enter a brief summary (max 200 characters)..."
                                            className={inputClass}
                                        />
                                        {fieldErrors.excerpt && <p className="text-xs text-rose-400 mt-1">{fieldErrors.excerpt}</p>}
                                    </div>
                                </div>

                                {/* Cover Image upload/link */}
                                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 sm:p-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">Cover Image</h3>

                                    <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                                        {/* Image preview box */}
                                        <div className="aspect-[16/10] w-full rounded-xl border border-white/10 bg-slate-950/40 relative overflow-hidden flex items-center justify-center">
                                            {formData.coverImage ? (
                                                <img
                                                    src={formData.coverImage}
                                                    alt="Cover Preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs text-slate-500 font-semibold">No Image</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col justify-center gap-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={uploading}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/[0.14] disabled:opacity-50"
                                                >
                                                    {uploading ? 'Uploading...' : 'Upload Cover Image'}
                                                </button>
                                                {formData.coverImage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateFormField('coverImage', '')}
                                                        className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400">Or Paste Image URL directly</label>
                                                <input
                                                    type="text"
                                                    value={formData.coverImage}
                                                    onChange={(e) => updateFormField('coverImage', e.target.value)}
                                                    placeholder="https://cloudinary.com/image.png"
                                                    className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {fieldErrors.coverImage && <p className="text-xs text-rose-400 mt-1">{fieldErrors.coverImage}</p>}
                                </div>

                                {/* Rich Text Content Editor */}
                                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 sm:p-6">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Blog Content <span className="text-rose-400">*</span></h3>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={togglePreview}
                                                className={showPreview
                                                    ? "border border-white/20 text-slate-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-300 ease-in-out"
                                                    : "border border-indigo-500 text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-all duration-300 ease-in-out"
                                                }
                                            >
                                                {showPreview ? '✕ Hide Preview' : '👁 Show Preview'}
                                            </button>
                                            <span className="text-[10px] text-slate-500 font-mono">Min 100 characters required</span>
                                        </div>
                                    </div>

                                    <div className="border border-purple-500/30 rounded-xl bg-slate-950/40">
                                        <div className="sticky top-[72px] sm:top-[88px] z-30 bg-slate-900/95 backdrop-blur-md border-b border-purple-500/20 rounded-t-xl shadow-md">
                                            {/* MS Word-like Ribbon */}
                                            <div className="word-ribbon">
                                                {/* Group 1: Clipboard */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls">
                                                        <button
                                                            type="button"
                                                            onClick={handlePaste}
                                                            className="ribbon-btn ribbon-btn-large"
                                                            title="Paste (Ctrl+V)"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor" opacity="0.2" />
                                                            </svg>
                                                            <span>Paste</span>
                                                        </button>
                                                        <div className="ribbon-row">
                                                            <button
                                                                type="button"
                                                                onClick={handleCut}
                                                                className="ribbon-btn ribbon-btn-small"
                                                                title="Cut (Ctrl+X)"
                                                            >
                                                                ✂️ Cut
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCopy}
                                                                className="ribbon-btn ribbon-btn-small"
                                                                title="Copy (Ctrl+C)"
                                                            >
                                                                📄 Copy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleFormatPainterClick}
                                                                className={`ribbon-btn ribbon-btn-small ${formatPainterState ? 'active' : ''}`}
                                                                title="Format Painter"
                                                            >
                                                                🖌️ Painter
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Clipboard</div>
                                                </div>

                                                {/* Group 2: Font */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls ribbon-row">
                                                        {/* Top Row: Font controls */}
                                                        <div className="ribbon-sub-row">
                                                            <select
                                                                value={editor?.getAttributes('textStyle').fontFamily || 'Aptos (Body)'}
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'Aptos (Body)') {
                                                                        editor.commands.unsetFontFamily();
                                                                    } else {
                                                                        editor.commands.setFontFamily(e.target.value);
                                                                    }
                                                                }}
                                                                className="ribbon-select font-sans"
                                                                style={{ width: '100px' }}
                                                                title="Font Family"
                                                            >
                                                                <option value="Aptos (Body)">Aptos (Body)</option>
                                                                <option value="DM Sans">DM Sans</option>
                                                                <option value="Arial">Arial</option>
                                                                <option value="Times New Roman">Times New Roman</option>
                                                                <option value="Courier New">Courier New</option>
                                                                <option value="Georgia">Georgia</option>
                                                                <option value="Segoe UI">Segoe UI</option>
                                                                <option value="Calibri">Calibri</option>
                                                            </select>

                                                            <select
                                                                value={editor?.getAttributes('textStyle').fontSize || '16px'}
                                                                onChange={(e) => editor.commands.setFontSize(e.target.value)}
                                                                className="ribbon-select"
                                                                style={{ width: '50px' }}
                                                                title="Font Size"
                                                            >
                                                                {['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px', '48px', '72px'].map(sz => (
                                                                    <option key={sz} value={sz}>{sz.replace('px', '')}</option>
                                                                ))}
                                                            </select>

                                                            <button
                                                                type="button"
                                                                onClick={() => changeFontSizeStep('increase')}
                                                                className="ribbon-btn ribbon-btn-square font-bold text-xs"
                                                                title="Grow Font Size"
                                                            >
                                                                A<sup>↑</sup>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => changeFontSizeStep('decrease')}
                                                                className="ribbon-btn ribbon-btn-square font-bold text-xs"
                                                                title="Shrink Font Size"
                                                            >
                                                                A<sup>↓</sup>
                                                            </button>

                                                            <select
                                                                onChange={(e) => {
                                                                    changeTextCase(e.target.value);
                                                                    e.target.value = '';
                                                                }}
                                                                className="ribbon-select text-center font-semibold"
                                                                style={{ width: '38px' }}
                                                                title="Change Case"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>Aa</option>
                                                                <option value="sentence">Sentence case</option>
                                                                <option value="lowercase">lowercase</option>
                                                                <option value="uppercase">UPPERCASE</option>
                                                                <option value="capitalize">Capitalize Each Word</option>
                                                                <option value="toggle">tOGGLE cASE</option>
                                                            </select>

                                                            <button
                                                                type="button"
                                                                onClick={clearFormatting}
                                                                className="ribbon-btn ribbon-btn-square"
                                                                title="Clear All Formatting"
                                                            >
                                                                🧹
                                                            </button>
                                                        </div>

                                                        {/* Bottom Row: Text Styles */}
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleBold().run()}
                                                                className={`ribbon-btn ribbon-btn-square font-bold ${editor?.isActive('bold') ? 'active' : ''}`}
                                                                title="Bold (Ctrl+B)"
                                                            >
                                                                B
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                                                className={`ribbon-btn ribbon-btn-square italic ${editor?.isActive('italic') ? 'active' : ''}`}
                                                                title="Italic (Ctrl+I)"
                                                            >
                                                                I
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                                                                className={`ribbon-btn ribbon-btn-square underline ${editor?.isActive('underline') ? 'active' : ''}`}
                                                                title="Underline (Ctrl+U)"
                                                            >
                                                                U
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                                                className={`ribbon-btn ribbon-btn-square line-through ${editor?.isActive('strike') ? 'active' : ''}`}
                                                                title="Strikethrough"
                                                            >
                                                                ab
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleSubscript().run()}
                                                                className={`ribbon-btn ribbon-btn-square text-[9px] ${editor?.isActive('subscript') ? 'active' : ''}`}
                                                                title="Subscript"
                                                            >
                                                                X<sub>2</sub>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                                                                className={`ribbon-btn ribbon-btn-square text-[9px] ${editor?.isActive('superscript') ? 'active' : ''}`}
                                                                title="Superscript"
                                                            >
                                                                X<sup>2</sup>
                                                            </button>

                                                            {/* Text effects preset select */}
                                                            <select
                                                                onChange={(e) => {
                                                                    applyTextEffect(e.target.value);
                                                                    e.target.value = '';
                                                                }}
                                                                className="ribbon-select font-bold"
                                                                style={{ width: '38px', color: '#6366f1' }}
                                                                title="Text Effects and Typography"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>A</option>
                                                                <option value="glow">Glow Indigo</option>
                                                                <option value="blue-glow">Glow Blue</option>
                                                                <option value="shadow">Shadow Block</option>
                                                                <option value="outline">Outline Purple</option>
                                                                <option value="clear">Clear Effects</option>
                                                            </select>

                                                            {/* Highlight Color */}
                                                            <div className="relative flex items-center h-6 w-6 rounded hover:bg-white/5 cursor-pointer">
                                                                <input
                                                                    type="color"
                                                                    value={editor?.getAttributes('highlight').color || '#fef08a'}
                                                                    onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                                                    title="Text Highlight Color"
                                                                />
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-350">
                                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4Z" />
                                                                    </svg>
                                                                    <div className="w-3.5 h-0.5 mt-0.5" style={{ backgroundColor: editor?.getAttributes('highlight').color || '#fef08a' }} />
                                                                </div>
                                                            </div>

                                                            {/* Font Color */}
                                                            <div className="relative flex items-center h-6 w-6 rounded hover:bg-white/5 cursor-pointer">
                                                                <input
                                                                    type="color"
                                                                    value={editor?.getAttributes('textStyle').color || '#ffffff'}
                                                                    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                                                    title="Font Color"
                                                                />
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                                    <span className="text-xs font-black text-slate-200">A</span>
                                                                    <div className="w-3.5 h-0.5 mt-0.5" style={{ backgroundColor: editor?.getAttributes('textStyle').color || '#ef4444' }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Font</div>
                                                </div>

                                                {/* Group 3: Paragraph */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls ribbon-row">
                                                        {/* Top Row: List structure */}
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive('bulletList') ? 'active' : ''}`}
                                                                title="Bullets List"
                                                            >
                                                                •List
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive('orderedList') ? 'active' : ''}`}
                                                                title="Numbering List"
                                                            >
                                                                1.List
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleMultilevelList}
                                                                className="ribbon-btn ribbon-btn-square"
                                                                title="Multilevel List"
                                                            >
                                                                🪜
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleOutdent}
                                                                className="ribbon-btn ribbon-btn-square font-bold"
                                                                title="Decrease Indent"
                                                            >
                                                                ←
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleIndent}
                                                                className="ribbon-btn ribbon-btn-square font-bold"
                                                                title="Increase Indent"
                                                            >
                                                                →
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={sortSelectedLines}
                                                                className="ribbon-btn ribbon-btn-square"
                                                                title="Sort selected lines"
                                                            >
                                                                ↓Z
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowFormattingMarks(!showFormattingMarks)}
                                                                className={`ribbon-btn ribbon-btn-square ${showFormattingMarks ? 'active' : ''}`}
                                                                title="Show Formatting Marks"
                                                            >
                                                                ¶
                                                            </button>
                                                        </div>

                                                        {/* Bottom Row: Align spacing */}
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
                                                                title="Align Left"
                                                            >
                                                                Align L
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
                                                                title="Align Center"
                                                            >
                                                                Align C
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
                                                                title="Align Right"
                                                            >
                                                                Align R
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                                                                className={`ribbon-btn ribbon-btn-square ${editor?.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
                                                                title="Justify"
                                                            >
                                                                Justify
                                                            </button>

                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'clear') {
                                                                        editor.chain().focus().unsetLineHeight().run();
                                                                    } else {
                                                                        editor.chain().focus().setLineHeight(e.target.value).run();
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                                className="ribbon-select text-center font-bold"
                                                                style={{ width: '38px' }}
                                                                title="Line and Paragraph Spacing"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>↕</option>
                                                                <option value="1.0">1.0</option>
                                                                <option value="1.15">1.15</option>
                                                                <option value="1.5">1.5</option>
                                                                <option value="2.0">2.0</option>
                                                                <option value="2.5">2.5</option>
                                                                <option value="3.0">3.0</option>
                                                                <option value="clear">Clear Spacing</option>
                                                            </select>

                                                            {/* Shading Paint Bucket */}
                                                            <div className="relative flex items-center h-6 w-6 rounded hover:bg-white/5 cursor-pointer">
                                                                <input
                                                                    type="color"
                                                                    onChange={(e) => setBlockShading(e.target.value)}
                                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                                                    title="Shading Background Block"
                                                                />
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-350">
                                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                                                                    </svg>
                                                                    <div className="w-3.5 h-0.5 mt-0.5 bg-indigo-500" />
                                                                </div>
                                                            </div>

                                                            {/* Borders Dropdown */}
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'clear') {
                                                                        setBlockBorder(null);
                                                                    } else {
                                                                        setBlockBorder(e.target.value);
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                                className="ribbon-select font-bold text-center"
                                                                style={{ width: '38px' }}
                                                                title="Borders"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>田</option>
                                                                <option value="bottom">Bottom Border</option>
                                                                <option value="top">Top Border</option>
                                                                <option value="left">Left Border</option>
                                                                <option value="box">Box Border</option>
                                                                <option value="clear">Clear Borders</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Paragraph</div>
                                                </div>

                                                {/* Group 4: Styles Gallery */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls">
                                                        <div className="ribbon-style-gallery">
                                                            {STYLES_GALLERY.map((style) => {
                                                                const active = isStyleActive(style);
                                                                return (
                                                                    <button
                                                                        key={style.name}
                                                                        type="button"
                                                                        onClick={style.action}
                                                                        className={`ribbon-style-item ${active ? 'active' : ''}`}
                                                                        title={style.label}
                                                                    >
                                                                        <span className="ribbon-style-preview">{style.preview}</span>
                                                                        <span className="ribbon-style-name">{style.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Styles</div>
                                                </div>

                                                {/* Group 5: Editing */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls ribbon-row">
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowFindReplacePanel(true);
                                                                }}
                                                                className={`ribbon-btn ribbon-btn-small ${showFindReplacePanel ? 'active' : ''}`}
                                                                title="Find"
                                                            >
                                                                🔍 Find
                                                            </button>
                                                        </div>
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setShowFindReplacePanel(true);
                                                                }}
                                                                className="ribbon-btn ribbon-btn-small"
                                                                title="Replace"
                                                            >
                                                                🔄 Replace
                                                            </button>
                                                        </div>
                                                        <div className="ribbon-sub-row">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'all') {
                                                                        editor.commands.selectAll();
                                                                    } else if (e.target.value === 'clear') {
                                                                        clearFormatting();
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                                className="ribbon-select text-[10px]"
                                                                style={{ width: '60px' }}
                                                                title="Select Options"
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>Select</option>
                                                                <option value="all">Select All</option>
                                                                <option value="clear">Clear All</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Editing</div>
                                                </div>

                                                {/* Group 6: Media Insert */}
                                                <div className="ribbon-group">
                                                    <div className="ribbon-controls ribbon-row">
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={handleOpenLinkModal}
                                                                className={`ribbon-btn ribbon-btn-small ${editor?.isActive('link') ? 'active' : ''}`}
                                                                title="Insert Link"
                                                            >
                                                                🔗 Link
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleOpenImageModal}
                                                                className="ribbon-btn ribbon-btn-small"
                                                                title="Insert Image"
                                                            >
                                                                🖼️ Image
                                                            </button>
                                                        </div>
                                                        <div className="ribbon-sub-row">
                                                            <button
                                                                type="button"
                                                                onClick={handleOpenYoutubeModal}
                                                                className={`ribbon-btn ribbon-btn-small ${editor?.isActive('youtube') ? 'active' : ''}`}
                                                                title="Insert YouTube Video"
                                                            >
                                                                📺 Video
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                                                                className="ribbon-btn ribbon-btn-small"
                                                                title="Insert Table (3x3)"
                                                            >
                                                                田 Table
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="ribbon-group-label">Insert</div>
                                                </div>
                                            </div>

                                            {/* Find and Replace Panel */}
                                            {showFindReplacePanel && (
                                                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-950 border-t border-purple-500/20 text-xs text-left animate-[fadeIn_150ms_ease-out]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-slate-400">Find:</span>
                                                        <input
                                                            type="text"
                                                            value={findText}
                                                            onChange={(e) => setFindText(e.target.value)}
                                                            placeholder="Text to find..."
                                                            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 w-36"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-slate-400">Replace:</span>
                                                        <input
                                                            type="text"
                                                            value={replaceText}
                                                            onChange={(e) => setReplaceText(e.target.value)}
                                                            placeholder="Replace with..."
                                                            className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 w-36"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFindAndReplace(false)}
                                                            className="px-2.5 py-1 font-bold rounded bg-indigo-600 text-white hover:bg-indigo-500 transition"
                                                        >
                                                            Find / Replace
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFindAndReplace(true)}
                                                            className="px-2.5 py-1 font-bold rounded bg-purple-600 text-white hover:bg-purple-500 transition"
                                                        >
                                                            Replace All
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowFindReplacePanel(false)}
                                                            className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Table Commands Sub-Bar */}
                                            {isEditorReady && editor.isActive('table') && (
                                                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950 border-t border-purple-500/20 text-[10px] text-left animate-[fadeIn_150ms_ease-out] shrink-0">
                                                    <span className="font-bold text-slate-400 mr-1">Table Tools:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().addRowBefore().run()}
                                                        className="px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-semibold"
                                                        title="Add Row Above"
                                                    >
                                                        +Row Above
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().addRowAfter().run()}
                                                        className="px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-semibold"
                                                        title="Add Row Below"
                                                    >
                                                        +Row Below
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().deleteRow().run()}
                                                        className="px-2 py-1 bg-rose-950/40 text-rose-300 hover:bg-rose-900 rounded font-semibold"
                                                        title="Delete Row"
                                                    >
                                                        -Row
                                                    </button>
                                                    <span className="w-px h-3 bg-white/10 mx-0.5" />
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                                                        className="px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-semibold"
                                                        title="Add Column Left"
                                                    >
                                                        +Col Left
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                                                        className="px-2 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-semibold"
                                                        title="Add Column Right"
                                                    >
                                                        +Col Right
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().deleteColumn().run()}
                                                        className="px-2 py-1 bg-rose-950/40 text-rose-300 hover:bg-rose-900 rounded font-semibold"
                                                        title="Delete Column"
                                                    >
                                                        -Col
                                                    </button>
                                                    <span className="w-px h-3 bg-white/10 mx-0.5" />
                                                    <button
                                                        type="button"
                                                        onClick={() => editor.chain().focus().deleteTable().run()}
                                                        className="px-2 py-1 bg-red-950/50 text-red-400 hover:bg-red-900 rounded font-extrabold"
                                                        title="Delete Table"
                                                    >
                                                        Delete Table
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {editor && (
                                            <BubbleMenu
                                                editor={editor}
                                                tippyOptions={{ duration: 150 }}
                                                shouldShow={({ editor }) => editor.isActive('image')}
                                            >
                                                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl text-[10px] sm:text-xs font-bold text-slate-200">
                                                    {/* Alignment controls */}
                                                    <span className="px-1 text-[10px] text-slate-500 uppercase tracking-wider">Align:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { size } = getSelectedImageAttributes();
                                                            handleUpdateImageClass('img-left', size);
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().alignment === 'img-left' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        Left
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { size } = getSelectedImageAttributes();
                                                            handleUpdateImageClass('img-center', size);
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().alignment === 'img-center' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        Center
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { size } = getSelectedImageAttributes();
                                                            handleUpdateImageClass('img-right', size);
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().alignment === 'img-right' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        Right
                                                    </button>
                                                    
                                                    <span className="w-px h-4 bg-white/10 mx-1" />
                                                    
                                                    {/* Sizing controls */}
                                                    <span className="px-1 text-[10px] text-slate-500 uppercase tracking-wider">Size:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { alignment } = getSelectedImageAttributes();
                                                            handleUpdateImageClass(alignment, 'img-small');
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().size === 'img-small' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        25%
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { alignment } = getSelectedImageAttributes();
                                                            handleUpdateImageClass(alignment, 'img-medium');
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().size === 'img-medium' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        50%
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { alignment } = getSelectedImageAttributes();
                                                            handleUpdateImageClass(alignment, 'img-large');
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().size === 'img-large' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        100%
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const { alignment } = getSelectedImageAttributes();
                                                            handleUpdateImageClass(alignment, 'img-full-width');
                                                        }}
                                                        className={`px-2 py-1 rounded transition-colors ${
                                                            getSelectedImageAttributes().size === 'img-full-width' 
                                                                ? 'bg-indigo-500 text-white' 
                                                                : 'hover:bg-white/10 text-slate-300'
                                                        }`}
                                                    >
                                                        Full Width
                                                    </button>
                                                </div>
                                            </BubbleMenu>
                                        )}
                                        <EditorContent
                                            editor={editor}
                                            className={`prose prose-invert max-w-none min-h-[500px] px-5 py-4 focus:outline-none text-slate-200 text-base outline-none rounded-b-xl w-full blog-content ${showFormattingMarks ? 'show-formatting-marks' : ''}`}
                                        />
                                    </div>
                                    {fieldErrors.content && <p className="text-xs text-rose-400 mt-1">{fieldErrors.content}</p>}
                                </div>

                                {/* Collapsible SEO Section */}
                                <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setSeoOpen(!seoOpen)}
                                        className="w-full px-5 py-4 flex items-center justify-between font-bold text-sm text-slate-300 hover:bg-white/[0.02]"
                                    >
                                        <span>SEO Optimization Metadata (Optional)</span>
                                        <span className="text-indigo-400 font-mono">{seoOpen ? '▲ Close' : '▼ Expand'}</span>
                                    </button>

                                    {seoOpen && (
                                        <div className="p-5 border-t border-white/5 space-y-4 animate-[fadeIn_200ms_ease-out]">
                                            {/* SEO Title */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-300">SEO Title (Tab title override)</label>
                                                    <span className="text-[10px] text-slate-500 font-mono">{formData.seoTitle.length}/60</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.seoTitle}
                                                    onChange={(e) => {
                                                        if (e.target.value.length <= 60) {
                                                            updateFormField('seoTitle', e.target.value);
                                                        }
                                                    }}
                                                    placeholder="Primary Keyword | Brand Title"
                                                    className={inputClass}
                                                />
                                            </div>

                                            {/* SEO Description */}
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-300">SEO Description (Meta tag description)</label>
                                                    <span className="text-[10px] text-slate-500 font-mono">{formData.seoDescription.length}/160</span>
                                                </div>
                                                <textarea
                                                    value={formData.seoDescription}
                                                    onChange={(e) => {
                                                        if (e.target.value.length <= 160) {
                                                            updateFormField('seoDescription', e.target.value);
                                                        }
                                                    }}
                                                    rows="2"
                                                    placeholder="Short summary targeting search results snippet (max 160 chars)..."
                                                    className={inputClass}
                                                />
                                                {fieldErrors.seoDescription && <p className="text-xs text-rose-400 mt-1">{fieldErrors.seoDescription}</p>}
                                            </div>

                                            {/* SEO Keywords */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-300">Keywords (Comma separated keywords)</label>
                                                <input
                                                    type="text"
                                                    value={formData.seoKeywords.join(', ')}
                                                    onChange={(e) => {
                                                        const words = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                        updateFormField('seoKeywords', words);
                                                    }}
                                                    placeholder="books, online, study, review"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Related Content & Tags Section */}
                                <div className="grid gap-6 sm:grid-cols-2 rounded-2xl border border-white/5 bg-white/[0.01] p-5 sm:p-6">
                                    {/* Related Books */}
                                    <div className="space-y-3 shrink-0">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-300">Related books (Mentioned shelf books)</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewBook(prev => ({
                                                        ...prev,
                                                        category: formData.category || 'Classic Books'
                                                    }));
                                                    setShowAddBookModal(true);
                                                }}
                                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                            >
                                                + Quick Add Book
                                            </button>
                                        </div>
                                        <Select
                                            isMulti
                                            options={booksOptions}
                                            value={selectedRelatedBooksOptions}
                                            onChange={handleRelatedBooksChange}
                                            styles={selectDarkStyles}
                                            placeholder="Search and link up to 20 books..."
                                            className="text-slate-100 text-xs"
                                        />
                                        {fieldErrors.relatedBooks && <p className="text-xs text-rose-400 mt-1">{fieldErrors.relatedBooks}</p>}
                                    </div>

                                    {/* Tags management */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-300 block">Tags (Press enter or comma to add)</label>
                                        <input
                                            type="text"
                                            onKeyDown={handleTagInputKeyDown}
                                            placeholder="Type tag and press enter..."
                                            className={inputClass}
                                        />

                                        {/* Display tags */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {formData.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-xs font-semibold text-indigo-300"
                                                >
                                                    #{tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="text-[10px] text-indigo-400 hover:text-indigo-200 ml-1 font-extrabold"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>

                                        {/* Suggested quick tags */}
                                        <div className="mt-3">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Suggested tags:</p>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {SUGGESTED_TAGS.filter(t => !formData.tags.includes(t)).map(tag => (
                                                    <button
                                                        type="button"
                                                        key={tag}
                                                        onClick={() => handleAddTag(tag)}
                                                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-300 border border-white/5 bg-white/5 px-2 py-0.5 rounded transition"
                                                    >
                                                        +{tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Radios */}
                                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 sm:p-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">Status</h3>

                                    <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-300">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="draft"
                                                checked={formData.status === 'draft'}
                                                onChange={(e) => updateFormField('status', e.target.value)}
                                                className="h-4 w-4 cursor-pointer text-indigo-600 focus:ring-0"
                                            />
                                            Draft
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="published"
                                                checked={formData.status === 'published'}
                                                onChange={(e) => updateFormField('status', e.target.value)}
                                                className="h-4 w-4 cursor-pointer text-indigo-600 focus:ring-0"
                                            />
                                            Published
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="archived"
                                                checked={formData.status === 'archived'}
                                                onChange={(e) => updateFormField('status', e.target.value)}
                                                className="h-4 w-4 cursor-pointer text-indigo-600 focus:ring-0"
                                            />
                                            Archived
                                        </label>
                                    </div>
                                </div>

                                {/* Form Action Buttons */}
                                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-bold">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 py-3 text-white transition hover:brightness-110 disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : mode === 'create' ? 'Save Draft' : 'Save Changes'}
                                    </button>

                                    {formData.status !== 'published' && (
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => handleSaveStatus('published')}
                                            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-3 text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                                        >
                                            Publish Post
                                        </button>
                                    )}

                                    {mode === 'edit' && formData.status === 'published' && (
                                        <a
                                            href={`/blog/${formData.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-6 py-3 text-indigo-300 hover:bg-indigo-500/25 transition text-center"
                                        >
                                            Preview Published
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPreview(true);
                                            localStorage.setItem('readify_preview_open', 'true');
                                        }}
                                        className="md:hidden rounded-xl border border-indigo-500/35 bg-indigo-500/10 px-6 py-3 text-indigo-300 hover:bg-indigo-500/25 transition text-center"
                                    >
                                        👁 Preview
                                    </button>

                                    {mode === 'edit' && (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteModal(true)}
                                            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-6 py-3 text-rose-300 hover:bg-rose-500/20 transition"
                                        >
                                            Delete Blog
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin/blogs')}
                                        className="rounded-xl border border-white/20 bg-white/[0.08] px-6 py-3 text-slate-100 hover:bg-white/[0.14] transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>

                            {/* Live Preview Sidebar (dynamic width, scrollable) */}
                            {showPreview && (
                                <aside 
                                    className={`hidden md:flex shrink-0 flex-col gap-4 text-left sticky top-4 transition-all duration-300 ease-in-out animate-[fadeIn_300ms_ease-in-out] ${
                                        previewLayout === 'both' ? 'w-[890px]' : previewLayout === 'desktop' ? 'w-[460px]' : 'w-[420px]'
                                    }`}
                                >
                                    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl flex flex-col gap-4 h-auto max-h-[90vh]">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">LIVE PREVIEW</h3>
                                            
                                            {/* Preview mode toggle */}
                                            <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/5 text-[10px] font-bold">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewLayout('desktop')}
                                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'desktop' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    Desktop
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewLayout('mobile')}
                                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'mobile' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    Mobile
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewLayout('both')}
                                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'both' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    Both
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowPreview(false);
                                                    localStorage.setItem('readify_preview_open', 'false');
                                                }}
                                                className="text-slate-400 hover:text-white font-bold text-sm transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto max-h-[80vh] pr-1">
                                            {/* Previews based on layout selection */}
                                            <div className={`flex gap-6 items-start justify-center ${previewLayout === 'both' ? 'flex-col xl:flex-row' : 'flex-col'}`}>
                                                {(previewLayout === 'both' || previewLayout === 'desktop') && renderDesktopPreview()}
                                                {(previewLayout === 'both' || previewLayout === 'mobile') && renderMobilePreview()}
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            )}

                        </div>
                    )}
                </div>
            </MainLayout>

            {/* Autosave draft restore alert modal */}
            {showAutosaveModal && (
                <div className="fixed inset-0 z-[120] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/90 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.65)] text-left">
                        <h4 className="text-lg font-bold text-white">Restore local draft?</h4>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            An autosaved draft of this article was found. Would you like to restore it and continue editing?
                        </p>
                        <div className="mt-5 flex justify-end gap-2 text-xs">
                            <button
                                type="button"
                                onClick={handleDiscardAutosave}
                                className="rounded-lg border border-rose-300/35 bg-rose-500/10 px-4 py-2 font-bold text-rose-300 hover:bg-rose-500/20"
                            >
                                Discard Draft
                            </button>
                            <button
                                type="button"
                                onClick={handleRestoreAutosave}
                                className="rounded-lg border border-indigo-500/35 bg-indigo-500 px-4 py-2 font-bold text-white hover:bg-indigo-600"
                            >
                                Restore Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Book Modal */}
            {showAddBookModal && (
                <div className="fixed inset-0 z-[140] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.7)] text-left flex flex-col gap-4 animate-[fadeIn_200ms_ease-out] my-8 max-h-[90vh]">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                            <h4 className="text-base font-bold text-white">Quick Add Book to Library</h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddBookModal(false);
                                    setModalError('');
                                }}
                                className="text-slate-400 hover:text-white font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs text-rose-350 leading-relaxed">
                                {modalError}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[50vh]">
                            {/* Title */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350">Book Title <span className="text-rose-400">*</span></label>
                                <input
                                    type="text"
                                    value={newBook.title}
                                    onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Pride and Prejudice"
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Author */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350">Author <span className="text-rose-400">*</span></label>
                                <input
                                    type="text"
                                    value={newBook.author}
                                    onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                                    placeholder="e.g. Jane Austen"
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350">Category <span className="text-rose-400">*</span></label>
                                <input
                                    type="text"
                                    value={newBook.category}
                                    onChange={(e) => setNewBook(prev => ({ ...prev, category: e.target.value }))}
                                    placeholder="e.g. Classic Books"
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Cover Image Source */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350 block">Cover Image <span className="text-rose-400">*</span></label>
                                <div className="inline-flex rounded border border-white/10 bg-white/[0.04] p-0.5 mb-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setNewBookImageMode('url')}
                                        className={`rounded px-2 py-0.5 text-[9px] font-bold transition ${newBookImageMode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Use URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewBookImageMode('file')}
                                        className={`rounded px-2 py-0.5 text-[9px] font-bold transition ${newBookImageMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Upload File
                                    </button>
                                </div>

                                {newBookImageMode === 'url' ? (
                                    <input
                                        type="url"
                                        value={newBook.thumbnailUrl}
                                        onChange={(e) => setNewBook(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                                        placeholder="https://covers.openlibrary.org/b/id/12345-L.jpg"
                                        className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                ) : (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewBookThumbnailFile(e.target.files?.[0] || null)}
                                        className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-1.5 text-xs text-white file:mr-2 file:rounded file:border-0 file:bg-indigo-500/20 file:px-2 file:py-0.5 file:text-[9px] file:font-semibold file:text-indigo-200"
                                    />
                                )}

                                {/* Thumbnail Preview */}
                                {newBookImageMode === 'url' && newBook.thumbnailUrl.trim() && (
                                    <div className="mt-2 h-14 w-10 overflow-hidden rounded border border-white/10 bg-slate-900/60">
                                        <img src={newBook.thumbnailUrl} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                )}
                                {newBookImageMode === 'file' && newBookThumbnailPreview && (
                                    <div className="mt-2 h-14 w-10 overflow-hidden rounded border border-white/10 bg-slate-900/60">
                                        <img src={newBookThumbnailPreview} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Book File URL */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350 block">Book File URL (EPUB/PDF) <span className="text-rose-400">*</span></label>
                                <input
                                    type="url"
                                    value={newBook.fileUrl}
                                    onChange={(e) => setNewBook(prev => ({ ...prev, fileUrl: e.target.value }))}
                                    placeholder="https://example.com/book.epub"
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                                <p className="text-[9px] text-slate-500">Defaults to a placeholder reading file url.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs border-t border-white/10 pt-3 mt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddBookModal(false);
                                    setModalError('');
                                }}
                                className="rounded-lg border border-white/20 bg-white/[0.08] px-3.5 py-2 font-bold text-slate-200 hover:bg-white/[0.14]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickAddBookSubmit}
                                disabled={modalSubmitting}
                                className="rounded-lg bg-indigo-600 px-3.5 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {modalSubmitting ? 'Saving Book...' : 'Save Book'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rich Text Editor Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_180ms_ease-out]">
                    <form
                        onSubmit={handleSaveLink}
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl text-left"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insert Hyperlink</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowLinkModal(false);
                                    setLinkUrl('');
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350 block">Link URL</label>
                                <input
                                    type="url"
                                    required
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3 mt-4">
                            <button
                                type="button"
                                onClick={handleUnlink}
                                className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 font-bold text-rose-400 hover:bg-rose-500/10"
                            >
                                Remove Link
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLinkModal(false);
                                        setLinkUrl('');
                                    }}
                                    className="rounded-lg border border-white/20 bg-white/[0.08] px-3.5 py-2 font-bold text-slate-200 hover:bg-white/[0.14]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-indigo-600 px-3.5 py-2 font-bold text-white hover:bg-indigo-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Rich Text Editor Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_180ms_ease-out]">
                    <form
                        onSubmit={handleInsertImage}
                        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl text-left space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insert Editor Image</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImageModal(false);
                                    setEditorImageUrl('');
                                    setEditorImageFile(null);
                                    setEditorImageAlt('');
                                    setEditorImageAlignment('align-center');
                                    setEditorImageError('');
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Image Source Mode Selector */}
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-350 block">Image Source</label>
                            <div className="flex gap-1.5 bg-slate-950 p-0.5 rounded border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setEditorImageTab('upload')}
                                    className={`rounded px-2.5 py-0.5 text-[9px] font-bold transition ${editorImageTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    File Upload
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditorImageTab('url')}
                                    className={`rounded px-2.5 py-0.5 text-[9px] font-bold transition ${editorImageTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Web URL
                                </button>
                            </div>
                        </div>

                        {editorImageError && (
                            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                                {editorImageError}
                            </div>
                        )}

                        <div className="space-y-3">
                            {editorImageTab === 'upload' ? (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 block">Select Image File</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setEditorImageFile(e.target.files[0])}
                                        className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-extrabold file:bg-indigo-600/10 file:text-indigo-400 file:cursor-pointer hover:file:bg-indigo-600/25 cursor-pointer file:transition"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 block">Image URL</label>
                                    <input
                                        type="url"
                                        value={editorImageUrl}
                                        onChange={(e) => setEditorImageUrl(e.target.value)}
                                        placeholder="https://example.com/image.png"
                                        className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Alignment Options */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-350 block">Image Alignment (Text Wrapping)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center cursor-pointer transition ${editorImageAlignment === 'align-left'
                                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:text-white'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="alignment"
                                            value="align-left"
                                            checked={editorImageAlignment === 'align-left'}
                                            onChange={() => setEditorImageAlignment('align-left')}
                                            className="sr-only"
                                        />
                                        <span className="text-xs font-bold">Left</span>
                                        <span className="text-[9px] text-slate-500 mt-0.5">Wrap Right</span>
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center cursor-pointer transition ${editorImageAlignment === 'align-center'
                                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:text-white'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="alignment"
                                            value="align-center"
                                            checked={editorImageAlignment === 'align-center'}
                                            onChange={() => setEditorImageAlignment('align-center')}
                                            className="sr-only"
                                        />
                                        <span className="text-xs font-bold">Center</span>
                                        <span className="text-[9px] text-slate-500 mt-0.5">Block/Full</span>
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center cursor-pointer transition ${editorImageAlignment === 'align-right'
                                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                                        : 'border-white/10 bg-slate-950/40 text-slate-400 hover:text-white'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="alignment"
                                            value="align-right"
                                            checked={editorImageAlignment === 'align-right'}
                                            onChange={() => setEditorImageAlignment('align-right')}
                                            className="sr-only"
                                        />
                                        <span className="text-xs font-bold">Right</span>
                                        <span className="text-[9px] text-slate-500 mt-0.5">Wrap Left</span>
                                    </label>
                                </div>
                            </div>

                            {/* Alt Text */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 block">Alternative Description (Alt Text)</label>
                                <input
                                    type="text"
                                    value={editorImageAlt}
                                    onChange={(e) => setEditorImageAlt(e.target.value)}
                                    placeholder="Describe the image..."
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs border-t border-white/10 pt-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImageModal(false);
                                    setEditorImageUrl('');
                                    setEditorImageFile(null);
                                    setEditorImageAlt('');
                                    setEditorImageAlignment('align-center');
                                    setEditorImageError('');
                                }}
                                className="rounded-lg border border-white/20 bg-white/[0.08] px-3.5 py-2 font-bold text-slate-200 hover:bg-white/[0.14]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editorImageUploadProgress}
                                className="rounded-lg bg-indigo-600 px-3.5 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {editorImageUploadProgress ? 'Uploading...' : 'Insert Image'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Rich Text Editor YouTube Embed Modal */}
            {showYoutubeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_180ms_ease-out]">
                    <form
                        onSubmit={handleInsertYoutube}
                        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl text-left"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Embed YouTube Video</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowYoutubeModal(false);
                                    setYoutubeUrl('');
                                }}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-350 block">YouTube Video URL</label>
                                <input
                                    type="url"
                                    required
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 text-xs border-t border-white/10 pt-3 mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowYoutubeModal(false);
                                    setYoutubeUrl('');
                                }}
                                className="rounded-lg border border-white/20 bg-white/[0.08] px-3.5 py-2 font-bold text-slate-200 hover:bg-white/[0.14]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-lg bg-indigo-600 px-3.5 py-2 font-bold text-white hover:bg-indigo-700"
                            >
                                Embed
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Mobile Preview Modal Overlay (< 768px) */}
            {showPreview && (
                <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
                    <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/10 bg-slate-950 px-5 py-6 shadow-2xl text-left flex flex-col gap-4 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-indigo-400">👁</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">LIVE PREVIEW</h3>
                            </div>
                            
                            {/* Preview mode toggle */}
                            <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/5 text-[10px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setPreviewLayout('desktop')}
                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'desktop' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewLayout('mobile')}
                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'mobile' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Mobile
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewLayout('both')}
                                    className={`px-2 py-0.5 rounded transition ${previewLayout === 'both' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Both
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowPreview(false);
                                    localStorage.setItem('readify_preview_open', 'false');
                                }}
                                className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                            >
                                Close ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            {/* Previews based on layout selection */}
                            <div className={`flex gap-6 items-start justify-center ${previewLayout === 'both' ? 'flex-col sm:flex-row' : 'flex-col'}`}>
                                {(previewLayout === 'both' || previewLayout === 'desktop') && renderDesktopPreview()}
                                {(previewLayout === 'both' || previewLayout === 'mobile') && renderMobilePreview()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal overlay */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[120] grid place-items-center bg-[#02050fcc] p-4 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]">
                    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950/90 p-5 shadow-[0_20px_60px_rgba(4,7,24,0.65)] text-left">
                        <h4 className="text-lg font-bold text-white">
                            {formData.status === 'archived' ? 'Permanently Delete Blog' : 'Delete / Archive Blog'}
                        </h4>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            {formData.status === 'archived' ? (
                                <>
                                    Are you sure you want to permanently delete <span className="font-semibold text-white">"{formData.title}"</span>? This action cannot be undone.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to archive or permanently delete <span className="font-semibold text-white">"{formData.title}"</span>? Archiving hides it from readers, and it can be recovered later.
                                </>
                            )}
                        </p>
                        <div className="mt-5 flex justify-end gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded-lg border border-white/20 bg-white/[0.08] px-4 py-2 font-bold text-slate-100 transition hover:bg-white/[0.14]"
                            >
                                Cancel
                            </button>
                            {formData.status !== 'archived' && (
                                <button
                                    type="button"
                                    onClick={handleArchiveBlog}
                                    disabled={deleting}
                                    className="rounded-lg border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 font-bold text-indigo-100 transition hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-65"
                                >
                                    {deleting ? 'Archiving...' : 'Archive Blog'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handlePermanentDeleteBlog}
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
