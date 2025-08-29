const application = 'Mfc API';
const contentTypeJson = {
    'Content-Type': 'application/json',
};

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
        const searchQuery = searchParams.get('q');

        if (!searchQuery) {
            return new Response(JSON.stringify({
                application,
                message: 'Missing search query string!'
            }), {
                status: 400,
                headers: contentTypeJson,
            });
        }

        switch (request.method) {
            case 'POST':
                try {
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

                    if (!response.ok) {
                        const text = await response.text();
                        throw new Error(`GCSE API returned ${response.status}: ${text}`);
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

                    return new Response(JSON.stringify({
                        application,
                        message: 'Fetch data success.',
                        data: result,
                    }), {
                        headers: contentTypeJson,
                    });
                } catch (e) {
                    return new Response(JSON.stringify({
                        application,
                        message: e.message,
                    }), {
                        status: 500,
                        headers: contentTypeJson,
                    });
                }

            case 'DELETE':
                return new Response(null, { status: 204 });

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
