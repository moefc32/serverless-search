async function apiFetch(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mfc Site Worker',
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
                        headers: { 'Content-Type': 'text/plain' },
                    });
                } catch (e) {
                    return new Response(JSON.stringify({
                        error: e.message,
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

            case 'DELETE':
                return new Response(null, { status: 204 });

            default:
                return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' },
                });
        }
    },
};
