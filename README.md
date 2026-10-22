# Cloudflare Turnstile for Pterodactyl Panel 2.0

A community extension to protect authentication with [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).

**Version:** 1.0.2  
**Compatibility:** Pterodactyl Panel 2.0 development snapshot used for testing in October 2026. Other revisions are not verified.

## Features

- Turnstile on sign-in, forgot-password, and reset-password forms.
- Server-side token validation with Cloudflare Siteverify and hostname verification.
- Settings in the administrator's extension settings panel: enable switch, site key and secret key.
- When the extension's Turnstile setting is off, the original Panel reCAPTCHA middleware remains in effect.

## Install (disabled by default)

Download the `cloudflare-turnstile-v1.0.2-source.zip` release asset, transfer it to your Panel server (for example `/root`), and run:

```bash
cd /var/www/pterodactyl
unzip /root/cloudflare-turnstile-v1.0.2-source.zip -d extensions/
cd extensions/cloudflare-turnstile
npm install --legacy-peer-deps --install-links
npm run typecheck
npm run build
cd /var/www/pterodactyl
php artisan p:extension:install extensions/cloudflare-turnstile
php artisan optimize:clear
```

**Do not add `--enable` to the install command.** Without that option the extension is installed but not enabled in the Panel's Extensions list. You can enable it manually when ready.

## Configure

1. Create a Cloudflare Turnstile widget for your Panel hostname in the Cloudflare dashboard.
2. Open **Admin > Extensions**, enable **Cloudflare Turnstile** manually.
3. In the extension settings, enter **Site Key** and **Secret Key**.
4. Turn **Enable Cloudflare Turnstile** on when the keys have been saved.
5. Disable the Panel's built-in Google reCAPTCHA challenge in its Advanced Settings to avoid requiring both providers.
6. Test sign-in and password reset from a private browser window **without closing your existing administrator session**.

### Two separate switches

- **Extension enabled/disabled:** Pterodactyl controls whether the extension loads at all. Installation intentionally leaves it **disabled**.
- **Enable Cloudflare Turnstile:** a separate setting inside the extension; its default is **off**, even after the extension is enabled.

If the extension is enabled while its Turnstile setting is off, the built-in reCAPTCHA behavior is preserved. If Turnstile is on but keys are missing, authentication requests fail closed.

## Updating

Back up your installation and extension settings, then follow the Panel 2.0 extension replacement instructions. Rebuild the client and clear caches as necessary. Verify `php artisan p:extension:install --help` for the syntax supported by your Panel revision.

## Technical notes

The extension replaces the `recaptcha` middleware alias for the three authentication endpoints and adapts frontend requests to send the Turnstile token in the compatible field. Since this Panel snapshot does not offer a dedicated captcha-provider replacement interface, compatibility after upstream updates cannot be guaranteed.

Review your Panel's CSP and Cloudflare Turnstile integration requirements if the widget fails to load. Never expose the Turnstile secret key.

## Development

```bash
npm install
npm run typecheck
npm run build
```

The `@pterodactyl/sdk` dependency points to `../../packages/sdk`: build this extension from inside a compatible Pterodactyl Panel 2.0 source tree under `extensions/cloudflare-turnstile`.

## License

No license has been chosen yet. Until a license file is added, redistribution and reuse are not automatically granted; the repository owner should select an explicit license before inviting contributions.

## Attribution

Independent community project. Not affiliated with Pterodactyl or Cloudflare.
