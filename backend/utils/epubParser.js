const AdmZip = require('adm-zip');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');

const WORDS_PER_MINUTE = 200;

function cleanText(text = '') {
    return text
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8212;/g, '—')
        .trim();
}

function extractPullQuote($, paragraphs) {
    let foundQuote = '';
    // 1. Direct blockquote or <q> tags
    $('blockquote, q').each((_, el) => {
        const text = cleanText($(el).text());
        if (text.length >= 35 && text.length <= 260 && !foundQuote) {
            foundQuote = text;
        }
    });
    if (foundQuote) return foundQuote;

    // 2. Heuristic sentence from the first third of paragraphs
    const candidateParagraphs = paragraphs.slice(0, Math.max(3, Math.floor(paragraphs.length / 3)));
    const sentences = [];
    candidateParagraphs.forEach((p) => {
        const parts = p.split(/(?<=[.!?])\s+/);
        parts.forEach((s) => {
            const trimmed = cleanText(s);
            if (trimmed.length >= 65 && trimmed.length <= 180 && /^[A-Z"“'‘]/.test(trimmed)) {
                sentences.push(trimmed);
            }
        });
    });

    if (sentences.length > 0) {
        sentences.sort((a, b) => b.length - a.length);
        return sentences[0];
    }

    if (paragraphs.length > 0 && paragraphs[0].length >= 40) {
        const first = paragraphs[0];
        return first.length > 150 ? `${first.slice(0, 140)}...` : first;
    }

    return '';
}

function parseToc(zip, opfDir, opfXml) {
    const $opf = cheerio.load(opfXml, { xmlMode: true });
    const tocMap = {};

    // 1. Check NCX
    const ncxHref = $opf('manifest > item[media-type*="x-dtbncx+xml"]').attr('href') ||
                    $opf('manifest > item[id*="ncx"]').attr('href') ||
                    $opf('manifest > item[id*="toc"]').attr('href');

    if (ncxHref) {
        const fullNcxPath = opfDir + ncxHref;
        const ncxEntry = zip.getEntry(fullNcxPath) || zip.getEntry(decodeURIComponent(fullNcxPath));
        if (ncxEntry) {
            try {
                const ncxXml = zip.readAsText(ncxEntry);
                const $ncx = cheerio.load(ncxXml, { xmlMode: true });
                $ncx('navPoint').each((_, el) => {
                    const label = cleanText($ncx(el).find('> navLabel > text').text());
                    const src = $ncx(el).find('> content').attr('src');
                    if (src && label) {
                        const cleanSrc = src.split('#')[0].split('?')[0];
                        tocMap[cleanSrc] = label;
                        tocMap[cleanSrc.toLowerCase()] = label;
                    }
                });
            } catch (err) {
                console.warn('[epubParser] Failed to parse NCX:', err.message);
            }
        }
    }

    // 2. Check EPUB 3 nav.xhtml
    const navHref = $opf('manifest > item[properties*="nav"]').attr('href');
    if (navHref) {
        const fullNavPath = opfDir + navHref;
        const navEntry = zip.getEntry(fullNavPath) || zip.getEntry(decodeURIComponent(fullNavPath));
        if (navEntry) {
            try {
                const navHtml = zip.readAsText(navEntry);
                const $nav = cheerio.load(navHtml);
                $nav('nav[epub\\:type="toc"] a, nav#toc a').each((_, el) => {
                    const label = cleanText($nav(el).text());
                    const href = $nav(el).attr('href');
                    if (href && label) {
                        const cleanHref = href.split('#')[0].split('?')[0];
                        tocMap[cleanHref] = label;
                        tocMap[cleanHref.toLowerCase()] = label;
                    }
                });
            } catch (err) {
                console.warn('[epubParser] Failed to parse NAV:', err.message);
            }
        }
    }

    return tocMap;
}

async function loadEpubBuffer(source) {
    if (Buffer.isBuffer(source)) return source;
    if (typeof source !== 'string') throw new Error('Invalid EPUB source');

    if (/^https?:\/\//i.test(source)) {
        const response = await axios.get(source, { responseType: 'arraybuffer', timeout: 30000 });
        return Buffer.from(response.data);
    }

    return fs.promises.readFile(source);
}

async function parseEpub(source) {
    const buffer = await loadEpubBuffer(source);
    const zip = new AdmZip(buffer);

    // 1. Locate container.xml
    const containerEntry = zip.getEntry('META-INF/container.xml');
    if (!containerEntry) {
        throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }

    const containerXml = zip.readAsText(containerEntry);
    const $container = cheerio.load(containerXml, { xmlMode: true });
    const opfPath = $container('rootfile').attr('full-path');
    if (!opfPath) {
        throw new Error('Invalid EPUB: OPF rootfile not specified');
    }

    // 2. Read OPF file
    const opfEntry = zip.getEntry(opfPath) || zip.getEntry(decodeURIComponent(opfPath));
    if (!opfEntry) {
        throw new Error(`Invalid EPUB: OPF package not found at ${opfPath}`);
    }

    const opfXml = zip.readAsText(opfEntry);
    const $opf = cheerio.load(opfXml, { xmlMode: true });
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // Metadata
    const title = cleanText($opf('metadata > dc\\:title, metadata > title').first().text()) || 'Untitled Book';
    const author = cleanText($opf('metadata > dc\\:creator, metadata > creator').first().text()) || 'Unknown Author';
    const description = cleanText($opf('metadata > dc\\:description, metadata > description').first().text()) || '';
    const language = cleanText($opf('metadata > dc\\:language, metadata > language').first().text()) || 'en';

    // Manifest mapping
    const manifest = {};
    $opf('manifest > item').each((_, el) => {
        const id = $opf(el).attr('id');
        manifest[id] = {
            href: $opf(el).attr('href'),
            mediaType: $opf(el).attr('media-type'),
        };
    });

    // Spine item sequence
    const spine = [];
    $opf('spine > itemref').each((_, el) => {
        const idref = $opf(el).attr('idref');
        if (idref && manifest[idref]) {
            spine.push(manifest[idref].href);
        }
    });

    // Parse TOC
    const tocMap = parseToc(zip, opfDir, opfXml);

    // Extract Chapters
    const chapters = [];
    let chapterCount = 0;

    for (let i = 0; i < spine.length; i++) {
        const relHref = spine[i];
        const fullHref = opfDir + relHref;
        const entry = zip.getEntry(fullHref) || zip.getEntry(decodeURIComponent(fullHref)) || zip.getEntry(relHref);

        if (!entry) continue;

        const html = zip.readAsText(entry);
        const $ = cheerio.load(html);

        // Strip non-content and styling tags
        $('script, style, link, meta, svg, iframe, noscript, header nav, footer').remove();

        const paragraphs = [];
        const seen = new Set();

        // Extract headings for title detection
        const rawHeading = cleanText($('h1, h2, h3, title').first().text());

        // Extract paragraphs and structured blocks
        $('p, div, li, blockquote').each((_, el) => {
            // Avoid duplicate text from parent wrappers
            if ($(el).find('> p').length > 0) return;
            const text = cleanText($(el).text());
            if (text.length > 20 && !seen.has(text)) {
                seen.add(text);
                paragraphs.push(text);
            }
        });

        // Skip cover pages or empty pages with 0 paragraphs
        if (paragraphs.length === 0) {
            continue;
        }

        chapterCount += 1;

        // Resolve clean chapter title
        const cleanHref = relHref.split('#')[0].split('?')[0];
        const tocTitle = tocMap[cleanHref] || tocMap[cleanHref.toLowerCase()] || tocMap[cleanHref.split('/').pop()];
        let chapterTitle = tocTitle || rawHeading || `Chapter ${chapterCount}`;
        if (chapterTitle.length > 120) {
            chapterTitle = `${chapterTitle.slice(0, 115)}...`;
        }

        // Pull quote extraction
        const pullQuote = extractPullQuote($, paragraphs);

        // Word count & reading time
        const totalWords = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0);
        const readingTimeMinutes = Math.max(1, Math.round(totalWords / WORDS_PER_MINUTE));

        chapters.push({
            chapterNumber: chapterCount,
            chapterTitle,
            paragraphs,
            quotes: pullQuote ? [pullQuote] : [],
            pullQuote,
            wordCount: totalWords,
            readingTimeMinutes,
            sourceHref: relHref,
        });
    }

    return {
        metadata: {
            title,
            author,
            description,
            language,
        },
        chapters,
        totalChapters: chapters.length,
    };
}

module.exports = {
    parseEpub,
    cleanText,
    extractPullQuote,
};
