const PRERENDER_SERVICE_URL = 'https://service.prerender.io';
const DEFAULT_SITE_ORIGIN = 'https://readifyai.vercel.app';

const STATIC_ASSET_PATTERN = /\.(?:js|css|xml|txt|png|jpe?g|gif|webp|svg|ico|pdf|epub|woff2?|ttf|map)$/i;

function getTargetUrl(req) {
  const requestUrl = new URL(req.url, DEFAULT_SITE_ORIGIN);
  const rawPath = requestUrl.searchParams.get('path') || '/';
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const host = req.headers['x-forwarded-host'] || req.headers.host || new URL(DEFAULT_SITE_ORIGIN).host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}${normalizedPath}`;
}

module.exports = async function handler(req, res) {
  const token = process.env.PRERENDER_TOKEN;
  if (!token) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Prerender.io is not configured. Set PRERENDER_TOKEN.');
    return;
  }

  const targetUrl = getTargetUrl(req);
  const targetPath = new URL(targetUrl).pathname;

  if (STATIC_ASSET_PATTERN.test(targetPath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  try {
    const prerenderResponse = await fetch(`${PRERENDER_SERVICE_URL}/${targetUrl}`, {
      headers: {
        'x-prerender-token': token,
        'User-Agent': req.headers['user-agent'] || 'ReadifyAI-Prerender',
      },
    });

    res.statusCode = prerenderResponse.status;
    const contentType = prerenderResponse.headers.get('content-type') || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');

    const prerenderHeader = prerenderResponse.headers.get('x-prerender');
    if (prerenderHeader) res.setHeader('x-prerender', prerenderHeader);

    res.end(await prerenderResponse.text());
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`Prerender.io request failed: ${error.message}`);
  }
};
