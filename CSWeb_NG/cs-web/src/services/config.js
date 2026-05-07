let _config = null;

export async function loadConfig() {
    const res = await fetch('/config.json');
    _config = await res.json();
}

export function buildEndpointURL(endpoint) {
    if (!_config) throw new Error('Config not loaded. Call loadConfig() first.');

    const url = new URL(window.location.href);
    let aURL;

    if (url.pathname === '/') {
        const port = _config.port;
        if (parseInt(port, 10) > 0)
            aURL = `${_config.isSecure ? 'https' : 'http'}://${_config.host}:${port}/${_config.database}/${_config.endpoints[endpoint]}`;
        else
            aURL = `${_config.isSecure ? 'https' : 'http'}://${_config.host}/${_config.database}/${_config.endpoints[endpoint]}`;
    } else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0)
            aURL = `${url.protocol}//${url.hostname}:${url.port}/${parts[0]}/${_config.endpoints[endpoint]}`;
        else aURL = `${url.protocol}//${url.hostname}:${url.port}/${_config.endpoints[endpoint]}`;
    }

    return aURL;
}
