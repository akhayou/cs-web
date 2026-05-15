let _config = null;

export async function loadConfig() {
    const res = await fetch('/config.json');
    _config = await res.json();
}

export function buildEndpointURL(endpoint) {
    if (!_config) {
        throw new Error('Config not loaded. Call loadConfig() first.');
    }

    const endpointPath = _config.endpoints?.[endpoint];

    if (!endpointPath) {
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    const protocol = _config.isSecure ? 'https' : 'http';
    const host = _config.host;

    const port = _config.port && parseInt(_config.port, 10) > 0 ? `:${_config.port}` : '';

    // base path from current app (supports /, /app/, /something/)
    const basePath = window.location.pathname.replace(/\/$/, '');

    // build base URL
    const baseURL = `${protocol}://${host}${port}`;

    // if database is required always include it
    const dbPart = _config.database ? `/${_config.database}` : '';

    return `${baseURL}${dbPart}${basePath}/${endpointPath}`;
}
