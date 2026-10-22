# Changelog

## v1.0.3 — 2026-10-22
- Fix Turnstile placement in the forgot-password and password-reset forms.
- Keep login widget placement and server-side verification unchanged.
- Document npm install flags used successfully on a Panel 2.0 installation.

## v1.0.2 — 2026-10-22
- Add administrator Turnstile toggle, default OFF.
- Delegate to original reCAPTCHA middleware when Turnstile is off.
- Document fresh installation without `--enable`.

## v1.0.1
- Fix TypeScript `this` annotation in XMLHttpRequest adapter.

## v1.0.0
- Initial Turnstile support for login and password recovery.
