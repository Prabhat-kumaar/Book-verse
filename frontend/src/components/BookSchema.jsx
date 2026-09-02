const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'

const buildOrganizationSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${PRODUCTION_DOMAIN}/#organization`,
    name: 'Readify',
    url: PRODUCTION_DOMAIN,
    logo: `${PRODUCTION_DOMAIN}/favicon.svg`,
})

const buildBookSchema = (book = {}, canonicalUrl, imageUrl) => {
    const description = String(book.description || '').trim().replace(/\s+/g, ' ').slice(0, 320)

    return {
        '@context': 'https://schema.org',
        '@type': 'Book',
        '@id': canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        name: book.title || 'Readify Book',
        author: {
            '@type': 'Person',
            name: book.author || 'Readify',
        },
        description: description || 'Read this book free online on Readify.',
        image: imageUrl || `${PRODUCTION_DOMAIN}/favicon.svg`,
        url: canonicalUrl,
        genre: book.category || undefined,
        inLanguage: book.language || undefined,
        datePublished: book.publishedAt || book.createdAt || undefined,
        dateModified: book.updatedAt || undefined,
        numberOfPages: book.pages || undefined,
        aggregateRating: book.averageRating
            ? {
                '@type': 'AggregateRating',
                ratingValue: Number(book.averageRating).toFixed(1),
                reviewCount: Number(book.totalReviews || book.ratingsCount || 0),
            }
            : undefined,
        publisher: {
            '@type': 'Organization',
            name: 'Readify',
            logo: {
                '@type': 'ImageObject',
                url: `${PRODUCTION_DOMAIN}/favicon.svg`,
            },
        },
        bookFormat: book.fileType === 'epub' ? 'EBook' : undefined,
    }
}

const buildBreadcrumbSchema = (title, pagePath) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${PRODUCTION_DOMAIN}/`,
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Books',
            item: `${PRODUCTION_DOMAIN}/books`,
        },
        {
            '@type': 'ListItem',
            position: 3,
            name: title || 'Book Detail',
            item: `${PRODUCTION_DOMAIN}${pagePath}`,
        },
    ],
})

export function createBookSchema(book = {}, canonicalPath = '/book', imageUrl, breadcrumbPath) {
    const canonicalUrl = `${PRODUCTION_DOMAIN}${canonicalPath}`
    const crumbPath = breadcrumbPath || canonicalPath

    return [
        buildBookSchema(book, canonicalUrl, imageUrl),
        buildBreadcrumbSchema(book.title, crumbPath),
        buildOrganizationSchema(),
    ]
}
