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
        switch (request.method) {
            case 'GET':
                try {
                    return new Response('Hello World!', {
                        headers: {
                            'Content-Type': 'text/plain',
                        },
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
