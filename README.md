# Cloudflare Turnstile for Pterodactyl Panel 2.0

Community extension integrating [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) with Pterodactyl Panel 2.0 authentication.

**Current version: v1.0.3**  
**Compatibility:** Pterodactyl Panel 2.0 develop snapshot (October 2026). Other versions are not verified.

## Features

- Turnstile challenge on sign-in, forgot-password and password-reset pages.
- Server-side token verification with Cloudflare Siteverify and hostname validation.
- Administrator settings for Site Key, Secret Key and Enable Cloudflare Turnstile.
- Turnstile is **OFF** by default within the extension.
- When Turnstile is off, the Panel's original reCAPTCHA handling is preserved.
- v1.0.3 fixes the forgot-password/reset widget placement within the form; login placement remains unchanged.

## Requirements

- Compatible Pterodactyl Panel 2.0 source tree (including `packages/sdk`).
- Node.js 22 or newer supported by the Panel; PHP as specified in `extension.json`.
- Cloudflare Turnstile Site Key and Secret Key for your Panel hostname.

## Install (extension disabled by default)

Download the `cloudflare-turnstile-v1.0.3-source.zip` release asset and upload it to `/root/` on the Panel host.

```bash
cd /var/www/pterodactyl
unzip -o /root/cloudflare-turnstile-v1.0.3-source.zip -d extensions/
cd extensions/cloudflare-turnstile
npm install --legacy-peer-deps --install-links
npm run typecheck
npm run build
cd /var/www/pterodactyl
php artisan p:extension:install extensions/cloudflare-turnstile
php artisan optimize:clear
```

**Do not pass `--enable` on a fresh installation.** The extension should appear in Admin > Extensions but stay disabled until an administrator enables it. The separate **Enable Cloudflare Turnstile** setting also defaults to OFF.

The npm flags above were required on one tested Debian installation to avoid an npm dependency-resolution failure. They are not guaranteed to be necessary on every host.

## Configure

1. Create a Turnstile widget in your [Cloudflare dashboard](https://dash.cloudflare.com/) for your Panel hostname.
2. In Pterodactyl Admin > Extensions, manually enable Cloudflare Turnstile.
3. Save the Site Key and Secret Key in its settings.
4. Switch **Enable Cloudflare Turnstile** on.
5. Disable built-in Google reCAPTCHA under the Panel's Advanced Settings to avoid two challenges.
6. Test login and password recovery in a private window, keeping an existing administrator session open.

**Security:** If Turnstile is enabled without valid keys, authentication fails closed. Never share your Secret Key.

## Update from v1.0.2 to v1.0.3

Back up your Panel and extension configuration. Upload the new release asset, then run:

```bash
cd /var/www/pterodactyl
unzip -o /root/cloudflare-turnstile-v1.0.3-source.zip -d extensions/
cd extensions/cloudflare-turnstile
npm install --legacy-peer-deps --install-links
npm run typecheck
npm run build
cd /var/www/pterodactyl
php artisan p:extension:install extensions/cloudflare-turnstile --replace --enable
php artisan optimize:clear
```

The command above is intended for an extension **already enabled** before the upgrade. If your installed extension is disabled, omit `--enable` to avoid activating it. Confirm the flags supported by your Panel with `php artisan p:extension:install --help`.

## Development notes

The Panel 2.0 snapshot does not expose a dedicated authentication CAPTCHA-provider replacement API, so this extension replaces the `recaptcha` middleware alias for the three authentication endpoints and adapts the client-side authentication requests. Re-test it after Panel upgrades, particularly both login and password recovery.

To build, put the repository in `extensions/cloudflare-turnstile` under the Pterodactyl source tree, then run the npm commands above. The local SDK dependency resolves from `../../packages/sdk`.

## License

No license has yet been selected by the repository owner. An explicit license should be added before granting reuse or redistribution permissions.

## Disclaimer

Independent community extension; not affiliated with Pterodactyl or Cloudflare. v1.0.3's widget placement change has not yet been confirmed on a running Panel.
