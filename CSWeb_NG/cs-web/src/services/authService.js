import md5 from 'md5';
import { buildEndpointURL } from './config';
import { buildMenuTree } from './menuService.js';

function buildFetchOptions(command) {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(command),
    };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function loginCommand(username, password) {
    return {
        command: 'session',
        params: { username, password, action: 'login' },
    };
}

function munimentsCommand() {
    return {
        command: 'main',
        uid: '',
        params: { action: 'RunSeed', method: 'select', name: 'muniments' },
    };
}

function dscTypesCommand() {
    return {
        command: 'session',
        params: { action: 'DscTypes' },
    };
}

function munTypesCommand() {
    return {
        command: 'session',
        params: { action: 'MunTypes' },
    };
}

// ─── Main login flow ──────────────────────────────────────────────────────────

/**
 * handleLogin
 *
 * Mirrors the full OJet handleLogin async flow.
 *
 * @param {string} userLogin     - plain username from LoginPage
 * @param {string} userPassword  - plain password (md5-hashed internally, same as OJet)
 *
 * @returns {Promise<{
 *   username: string,
 *   seeds: any,
 *   muniments: any,
 *   dscTypes: any,
 *   munTypes: any,
 * }>}  All session data on success.
 *
 * @throws {Error}  message is already user-facing (translated in OJet, pass to UI as-is)
 */
export async function handleLogin(userLogin, userPassword) {
    // Mirrors: if (!event.detail.userLogin) return;
    if (!userLogin) throw new Error('Username is required.');

    const username = userLogin;
    const password = md5(userPassword); // mirrors: md5(event.detail.userPassword)

    const url = buildEndpointURL('main');

    // ── 1. LOGIN ──────────────────────────────────────────────────────────────
    // Mirrors: const loginRes = await fetch(url, { method:'POST', credentials:'include', ... })
    const loginRes = await fetch(url, buildFetchOptions(loginCommand(username, password)));
    const loginData = await loginRes.json();

    if (loginData.errors) {
        throw new Error(loginData.errors[0].name);
    } else localStorage.setItem('seeds', JSON.stringify(loginData.result.Seeds));

    // ── 2. FETCH MUNIMENTS + DSC TYPES + MUN TYPES (parallel) ────────────────
    // OJet did these sequentially — we run them in parallel for speed.
    // Mirrors: munRes, DscTypesRes, MunTypesRes fetches
    const [munData, dscTypesData, munTypesData] = await Promise.all([
        fetch(url, buildFetchOptions(munimentsCommand())).then((r) => r.json()),
        fetch(url, buildFetchOptions(dscTypesCommand())).then((r) => r.json()),
        fetch(url, buildFetchOptions(munTypesCommand())).then((r) => r.json()),
    ]);

    // Mirrors: if (munData.errors) { this._showMessage('error', ...) }
    if (munData.errors) {
        throw new Error(munData.errors[0].name);
    }

    if (munData.result?.items) {
        localStorage.setItem('muniments', JSON.stringify(munData.result.items));
    }

    if (munTypesData.result?.items) {
        localStorage.setItem('munTypesData', JSON.stringify(munTypesData.result.items));
    }

    // ── 3. SET SESSION USER ───────────────────────────────────────────────────
    sessionStorage.setItem('user', username);

    const dscItems = dscTypesData?.result?.items ?? [];
    //const menuTree = buildMenuTree(loginData.result.Seeds ?? []);
    //const menuTree = buildMenuTree(munData.result?.items ?? []);

    return {
        username,
        seeds: loginData.result.Seeds,
        muniments: munData.result?.items ?? [],
        dscTypes: dscTypesData ?? {},
        munTypes: munTypesData ?? {},
        menuTree: await buildMenuTree(munData.result?.items ?? []),
    };
}
