const application = 'Mfc API';
const cache = caches.default;
const cacheDuration = 60 * 60 * 24 * 3;
const cacheControl = { 'Cache-Control': `public, max-age=${cacheDuration}` };
const contentTypeJson = { 'Content-Type': 'application/json' };

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
            case 'POST':
                if (!searchQuery) {
                    return new Response(JSON.stringify({
                        application,
                        message: 'Missing search query string!'
                    }), {
                        status: 400,
                        headers: contentTypeJson,
                    });
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
                        return new Response(JSON.stringify({
                            application,
                            message: 'Missing environment variable(s)!',
                        }), {
                            status: 500,
                            headers: contentTypeJson,
                        });
                    }

                    const response = await apiFetch(
                        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&cx=${gcse_cx}&key=${gcse_key}&num=10`);

                    if (!response?.ok) {
                        const text = await response.text();
                        throw new Error(`GCSE API failed: ${text}`);
                    }

                    const data = await response.json();

                    if (!data.items) {
                        return new Response(JSON.stringify({
                            application,
                            message: 'No search result found.',
                            data: [],
                        }), {
                            status: 200,
                            headers: contentTypeJson,
                        });
                    }

                    const result = data.items?.map((item) => {
                        return {
                            title: item.title,
                            link: item.link,
                            snippet: item.htmlSnippet,
                        }
                    });

                    const cachedData = new Response(JSON.stringify({
                        application,
                        message: 'Fetch data success.',
                        data: result,
                    }), {
                        headers: {
                            ...contentTypeJson,
                            ...cacheControl,
                        }
                    });

                    ctx.waitUntil(cache.put(cacheKey, cachedData.clone()));
                    return cachedData;
                } catch (e) {
                    return new Response(JSON.stringify({
                        application,
                        message: e.message,
                    }), {
                        status: 500,
                        headers: contentTypeJson,
                    });
                }

            default:
                return new Response(JSON.stringify({
                    application,
                    message: 'Method not allowed!'
                }), {
                    status: 405,
                    headers: contentTypeJson,
                });
        }
    },
};
