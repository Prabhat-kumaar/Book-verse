const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const Epub = require('epub-gen');

// Step 9: Extract JPEGs from PDF buffer using binary marker matching
function extractImagesFromPdf(pdfBuffer, outputDir) {
    const images = [];
    let index = 0;
    let pos = 0;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        while (pos < pdfBuffer.length) {
            const start = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD8]), pos);
            if (start === -1) break;

            const end = pdfBuffer.indexOf(Buffer.from([0xFF, 0xD9]), start);
            if (end === -1) {
                pos = start + 2;
                continue;
            }

            const jpegBuffer = pdfBuffer.subarray(start, end + 2);
            if (jpegBuffer.length > 5000) { // filter out small noise, icon fragments
                const filename = `extracted_img_${Date.now()}_${index}.jpg`;
                const filepath = path.join(outputDir, filename);
                fs.writeFileSync(filepath, jpegBuffer);
                images.push({
                    filename,
                    filepath
                });
                index++;
            }
            pos = end + 2;
        }
    } catch (err) {
        console.error('Image extraction error:', err);
    }
    return images;
}

// Step 3: Smart Cleaning Engine
function smartCleanText(text) {
    if (!text) return '';
    let cleaned = text;

    // Remove page numbers: Page 12, - 12 -, etc.
    cleaned = cleaned.replace(/Page \d+/gi, '');
    cleaned = cleaned.replace(/\b-\s*\d+\s*-\b/g, ''); 
    cleaned = cleaned.replace(/\b\d+\s*\|\s*Page\b/gi, '');

    // Remove watermarks & noise
    cleaned = cleaned.replace(/do\s*not\s*copy/gi, '');
    cleaned = cleaned.replace(/draft/gi, '');
    cleaned = cleaned.replace(/all\s*rights\s*reserved/gi, '');

    // Standardize whitespace
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\r\n/g, '\n');

    // Clean up empty line noise (max 2 consecutive newlines)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
}

// Step 4 & 5: Chapter Detection and Auto TOC Generator
function detectChapters(text) {
    const lines = text.split('\n');
    const chapters = [];
    let currentChapterTitle = 'Introduction';
    let currentChapterContent = [];

    // Match "Chapter 1", "CHAPTER II", "Unit 3", "Lesson 4", "Part 1"
    const chapterRegex = /^\s*(chapter|ch\.|unit|lesson|part)\s+([0-9a-zA-Z]+)/i;

    for (let line of lines) {
        const trimmed = line.trim();
        if (chapterRegex.test(trimmed) && trimmed.length < 120) {
            // Save previous chapter if it had content
            if (currentChapterContent.length > 0) {
                chapters.push({
                    title: currentChapterTitle,
                    data: currentChapterContent.join('\n')
                });
            }
            currentChapterTitle = trimmed;
            currentChapterContent = [];
        } else {
            currentChapterContent.push(line);
        }
    }

    // Push the final chapter
    if (currentChapterContent.length > 0 || chapters.length === 0) {
        chapters.push({
            title: currentChapterTitle,
            data: currentChapterContent.join('\n')
        });
    }

    // Heuristically paginate into smaller chapters if single massive text file
    if (chapters.length === 1 && chapters[0].data.length > 15000) {
        const fullText = chapters[0].data;
        const splitChapters = [];
        const paragraphs = fullText.split('\n\n');
        let chunk = [];
        let chunkLength = 0;
        let index = 1;

        for (let p of paragraphs) {
            chunk.push(p);
            chunkLength += p.length;
            if (chunkLength > 10000) {
                splitChapters.push({
                    title: `Chapter ${index}`,
                    data: chunk.join('\n\n')
                });
                chunk = [];
                chunkLength = 0;
                index++;
            }
        }
        if (chunk.length > 0) {
            splitChapters.push({
                title: `Chapter ${index}`,
                data: chunk.join('\n\n')
            });
        }
        return splitChapters;
    }

    return chapters;
}

// Step 10 (Bonus): Structuring heading, paragraph, lists into semantic HTML
function convertToSemanticHtml(textData) {
    const lines = textData.split('\n');
    const htmlBlocks = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Bullet lists
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            htmlBlocks.push(`<li>${trimmed.substring(2)}</li>`);
        }
        // Headings (short lines in bold/all-caps or numbered headings)
        else if (trimmed.length < 80 && (/^\d+\.\s+[A-Z]/i.test(trimmed) || /^[A-Z\s]{4,80}$/.test(trimmed))) {
            htmlBlocks.push(`<h3>${trimmed}</h3>`);
        }
        // Paragraphs
        else {
            htmlBlocks.push(`<p>${trimmed}</p>`);
        }
    }

    // Wrap contiguous <li> blocks in a <ul>
    let finalHtml = '';
    let inList = false;

    for (let block of htmlBlocks) {
        if (block.startsWith('<li>')) {
            if (!inList) {
                finalHtml += '<ul>\n';
                inList = true;
            }
            finalHtml += block + '\n';
        } else {
            if (inList) {
                finalHtml += '</ul>\n';
                inList = false;
            }
            finalHtml += block + '\n';
        }
    }

    if (inList) {
        finalHtml += '</ul>\n';
    }

    return finalHtml;
}

// Step 9: Insert images after the nearest paragraph in the chapter
function insertImagesIntoChapters(chapters, images) {
    if (images.length === 0) return chapters;

    const imagesPerChapter = Math.ceil(images.length / chapters.length);
    let imgIndex = 0;

    return chapters.map((chapter) => {
        let htmlContent = chapter.data;

        for (let i = 0; i < imagesPerChapter; i++) {
            if (imgIndex >= images.length) break;

            const img = images[imgIndex];
            // Format absolute path for the image file within the EPUB structure
            const imgTag = `<div style="text-align: center; margin: 1.8rem 0;"><img src="${img.filepath}" alt="Extracted Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" /></div>`;

            const pMatches = [...htmlContent.matchAll(/<\/p>/g)];
            if (pMatches.length > 0) {
                const insertAfterP = Math.min(pMatches.length - 1, Math.floor(pMatches.length / (imagesPerChapter + 1)) * (i + 1));
                const match = pMatches[insertAfterP];
                const insertPos = match.index + 4; // Place after closing </p>

                htmlContent = htmlContent.slice(0, insertPos) + '\n' + imgTag + '\n' + htmlContent.slice(insertPos);
            } else {
                htmlContent += '\n' + imgTag;
            }

            imgIndex++;
        }

        return {
            ...chapter,
            data: htmlContent
        };
    });
}

// Master Pipeline Execution
async function convertPdfToEpub({ pdfPath, outputPath, title, author, category, coverPath, uploadsDir }) {
    try {
        const pdfBuffer = fs.readFileSync(pdfPath);

        // Step 2: Extract raw text from PDF
        const parser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
        const pdfData = await parser.getText();
        const rawText = pdfData.text;

        // Step 3: Smart Clean Text
        const cleanedText = smartCleanText(rawText);

        // Step 4: Chapter Detection
        let chapters = detectChapters(cleanedText);

        // Step 10: AI / Heuristic Chapter Structuring to Clean Semantic HTML
        chapters = chapters.map(ch => ({
            title: ch.title,
            data: convertToSemanticHtml(ch.data)
        }));

        // Step 9: Extract JPEG images
        const imagesDir = path.join(uploadsDir, 'extracted_images');
        const extractedImages = extractImagesFromPdf(pdfBuffer, imagesDir);

        // Step 9: Insert images after nearest paragraphs
        chapters = insertImagesIntoChapters(chapters, extractedImages);

        // Step 7 & 8: Mobile-Friendly CSS + Dark Mode Support
        const customCss = `
body {
  font-size: 1.1rem;
  line-height: 1.8;
  padding: 15px;
  font-family: Georgia, 'Times New Roman', Times, serif;
  background-color: #ffffff;
  color: #1a1a1a;
}
img { 
  max-width: 100%; 
  height: auto; 
  display: block;
  margin: 1.5rem auto;
  border-radius: 8px;
}
h1, h2, h3 { 
  margin-top: 2rem; 
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
p {
  margin-bottom: 1.25rem;
}
ul {
  margin-bottom: 1.25rem;
  padding-left: 20px;
}
li {
  margin-bottom: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  body { 
    background-color: #111111; 
    color: #e0e0e0; 
  }
  h1, h2, h3 {
    color: #ffffff;
  }
  a { 
    color: #a78bfa; 
  }
}
        `;

        // Step 6: Assemble final EPUB
        const epubOptions = {
            title,
            author,
            category,
            css: customCss,
            content: chapters.map(ch => ({
                title: ch.title,
                data: ch.data
            }))
        };

        if (coverPath && fs.existsSync(coverPath)) {
            epubOptions.cover = coverPath;
        }

        await new Promise((resolve, reject) => {
            new Epub(epubOptions, outputPath).promise.then(resolve, reject);
        });

        return {
            success: true,
            outputPath,
            chaptersCount: chapters.length,
            imagesCount: extractedImages.length
        };
    } catch (err) {
        console.error('EPUB conversion pipeline failed:', err);
        throw err;
    }
}

module.exports = {
    convertPdfToEpub
};
