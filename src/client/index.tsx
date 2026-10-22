import { definePterodactylExtension } from '@pterodactyl/sdk';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TurnstileApi {
    render(element: HTMLElement, options: Record<string, unknown>): string;
    getResponse(widgetId: string): string;
    reset(widgetId: string): void;
    remove(widgetId: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi; } }

let widgetId: string | null = null;
let token = '';
let configuredKey = '';
let enabled = false;
let scriptPromise: Promise<void> | undefined;

function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Cloudflare Turnstile could not load'));
            document.head.appendChild(script);
        });
    }
    return scriptPromise;
}

function Challenge() {
    const holder = useRef<HTMLDivElement>(null);
    const [message, setMessage] = useState('');
    useEffect(() => {
        let active = true;
        const element = holder.current;
        if (!element || !configuredKey) { setMessage('Turnstile is not configured by the administrator.'); return; }
        loadScript().then(() => {
            if (!active || !window.turnstile || !element) return;
            // Only the current page's widget can supply the auth challenge.
            if (widgetId) { try { window.turnstile.remove(widgetId); } catch { /* ignore */ } }
            token = '';
            widgetId = window.turnstile.render(element, {
                sitekey: configuredKey,
                theme: 'auto',
                callback: (value: string) => { token = value; setMessage(''); },
                'expired-callback': () => { token = ''; setMessage('Verification expired. Please retry.'); },
                'error-callback': () => { token = ''; setMessage('Verification unavailable. Please retry.'); },
            });
        }).catch(() => { if (active) setMessage('Unable to load Turnstile.'); });
        return () => { active = false; token = ''; if (widgetId && window.turnstile) {
            try { window.turnstile.remove(widgetId); } catch { /* ignore */ } widgetId = null;
        }};
    }, []);
    return <div style={{ marginTop: 12, marginBottom: 12 }}><div ref={holder} />{message && <p role='alert'>{message}</p>}</div>;
}
// Keep React as an ordinary dependency managed by the SDK build.

/** Password pages expose only page-level slots, outside AuthCard. Portal the challenge
 * into the matching form without altering the Panel theme or the login page. */
function PasswordFormChallenge() {
    const [mount, setMount] = useState<HTMLDivElement | null>(null);
    useEffect(() => {
        const mountNode = document.createElement('div');
        mountNode.dataset.cloudflareTurnstile = 'password-form';
        let mounted = true;
        const place = () => {
            if (!mounted) return;
            const form = Array.from(document.querySelectorAll('form')).find(candidate =>
                candidate.querySelector('button[type="submit"]')
            );
            const submit = form?.querySelector('button[type="submit"]');
            const buttonRow = submit?.parentElement;
            // AuthCard puts the button in a dedicated div inside the form.
            if (form && buttonRow && buttonRow.parentElement) {
                if (mountNode.parentElement !== buttonRow.parentElement || mountNode.nextSibling !== buttonRow) {
                    buttonRow.parentElement.insertBefore(mountNode, buttonRow);
                }
                setMount(mountNode);
            }
        };
        place();
        const observer = new MutationObserver(() => {
            // React may rerender the password view after a form state update.
            if (!mountNode.isConnected) place();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            mounted = false;
            observer.disconnect();
            mountNode.remove();
        };
    }, []);
    return mount ? createPortal(<Challenge />, mount) : null;
}

function protectedAuthUrl(url: string): boolean {
    const path = new URL(url, window.location.href).pathname.replace(/\/$/, '');
    return path === '/auth/login' || path === '/auth/password' || path === '/auth/password/reset';
}
function inject(body: unknown): unknown {
    if (typeof body !== 'string') return body;
    try {
        const json = JSON.parse(body) as Record<string, unknown>;
        if (typeof json !== 'object' || !json || Array.isArray(json)) return body;
        json['g-recaptcha-response'] = token;
        return JSON.stringify(json);
    } catch { return body; }
}
function consume(): void {
    token = '';
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
}
function installTransportAdapter(): void {
    // Auth API in this Panel build uses Axios with the browser XHR adapter.
    // Also wrap native fetch for installations whose adapter differs.
    const proto = XMLHttpRequest.prototype as XMLHttpRequest & { __cftWrapped?: boolean };
    if (!proto.__cftWrapped) {
        const open = XMLHttpRequest.prototype.open;
        const send = XMLHttpRequest.prototype.send;
        const targets = new WeakMap<XMLHttpRequest, boolean>();
        XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, method: string, url: string | URL, ...args: unknown[]) {
            targets.set(this, method.toUpperCase() === 'POST' && protectedAuthUrl(String(url)));
            return Reflect.apply(open, this, [method, url, ...args]);
        } as typeof XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.send = function(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
            if (targets.get(this)) {
                if (!token) { throw new Error('Complete Cloudflare Turnstile before signing in.'); }
                const changed = inject(body);
                this.addEventListener('loadend', consume, { once: true });
                return send.call(this, changed as XMLHttpRequestBodyInit);
            }
            return send.call(this, body);
        };
        proto.__cftWrapped = true;
    }
    const w = window as Window & { __cftFetchWrapped?: boolean };
    if (!w.__cftFetchWrapped) {
        const original = window.fetch.bind(window);
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const request = input instanceof Request ? input : null;
            const url = request?.url ?? String(input);
            const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
            if (method !== 'POST' || !protectedAuthUrl(url)) return original(input, init);
            if (!token) throw new Error('Complete Cloudflare Turnstile before signing in.');
            const body = init?.body ?? (request ? await request.clone().text() : undefined);
            try {
                if (request) return await original(new Request(request, { ...init, body: inject(body) as BodyInit }));
                return await original(input, { ...init, body: inject(body) as BodyInit });
            } finally { consume(); }
        };
        w.__cftFetchWrapped = true;
    }
}

export default definePterodactylExtension({
    setup({ config, slots }) {
        enabled = config.enabled === true;
        if (!enabled) return;
        configuredKey = typeof config.site_key === 'string' ? config.site_key : '';
        installTransportAdapter();
        slots.register('auth.login.form.after', Challenge);
        slots.register('auth.password.before', PasswordFormChallenge);
        slots.register('auth.passwordReset.before', PasswordFormChallenge);
    },
});
