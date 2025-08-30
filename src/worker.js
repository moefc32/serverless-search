import corsHeaders from './corsHeaders.js';
import responseHelper from './responseHelper.js';

const cache = caches.default;
const cacheDuration = 60 * 60 * 24 * 3;
const cacheControl = { 'Cache-Control': `public, max-age=${cacheDuration}` };

async function apiFetch(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Win11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36',
        'Accept': 'application/json',
    };

    options.headers = { ...defaultHeaders, ...(options.headers || {}) };
    return fetch(url, options);
}

export default {
    async fetch(request, env, ctx) {
        const { searchParams } = new URL(request.url);
        const rawQuery = searchParams.get('q') || '';
        const searchQuery = rawQuery
            .trim()
            .toLowerCase()
            .replace(/[\x00-\x1F\x7F]/g, '')
            .replace(/<\/?[^>]+(>|$)/g, '');

        switch (request.method) {
            case 'OPTIONS':
                return new Response(null, { headers: corsHeaders });

            case 'POST':
                if (!searchQuery) {
                    return responseHelper({
                        message: 'Missing search query string!'
                    }, 400);
                }

                try {
                    const cacheKey = new Request(
                        new URL(request.url).origin + `?q=${searchQuery}`, request);
                    const cachedResponse = await cache.match(cacheKey);

                    if (cachedResponse) {
                        const age = cachedResponse.headers.get('CF-Cache-Age');
                        if (age !== null && parseInt(age) < cacheDuration) {
                            return cachedResponse;
                        }
                    }

                    const gcse_cx = env.CONFIG_GCSE_CX;
                    const gcse_key = env.CONFIG_GCSE_KEY;

                    if (!gcse_cx || !gcse_key) {
                        return responseHelper({
                            message: 'Missing environment variable(s)!',
                        }, 500);
                    }

                    const response = await apiFetch(
                        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&cx=${gcse_cx}&key=${gcse_key}&num=10`);

                    if (!response?.ok) {
                        const text = await response.text();
                        throw new Error(`GCSE API failed: ${text}`);
                    }

                    const data = await response.json();

                    if (!data.items) {
                        return responseHelper({
                            message: 'No search result found.',
                        });
                    }

                    const result = data.items?.map((item) => {
                        return {
                            title: item.title,
                            link: item.link,
                            snippet: item.htmlSnippet,
                        }
                    });

                    const cachedData = responseHelper({
                        message: 'Fetch data success.',
                        data: result,
                    }, 200, {
                        ...cacheControl,
                    });

                    ctx.waitUntil(cache.put(cacheKey, cachedData.clone()));
                    return cachedData;
                } catch (e) {
                    return responseHelper({
                        message: e.message,
                    }, 500);
                }

            default:
                return responseHelper({
                    message: 'Method not allowed!'
                }, 405);
        }
    },
};
