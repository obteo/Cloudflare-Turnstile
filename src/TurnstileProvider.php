<?php

declare(strict_types=1);

namespace CloudflareTurnstile;

use Pterodactyl\Extensions\ExtensionProvider;
use Pterodactyl\Services\Extensions\ExtensionSettingDefinition as Setting;
use Pterodactyl\Services\Extensions\ExtensionSettingsDefinition;

final class TurnstileProvider extends ExtensionProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->registerSettings(new ExtensionSettingsDefinition($this->settings(), [
            Setting::make('enabled', 'enabled', false, ['boolean'])
                ->label('Enable Cloudflare Turnstile')->help('Disabled by default. Configure both keys before enabling.')
                ->field('toggle')->frontend()->public(),
            Setting::make('site_key', 'site_key', '', ['nullable', 'string', 'max:256'])
                ->label('Cloudflare site key')->help('Public Turnstile site key for this panel hostname.')
                ->frontend()->public(),
            Setting::make('secret_key', 'secret_key', '', ['nullable', 'string', 'max:256'])
                ->label('Cloudflare secret key')->help('Private Siteverify key. Never share this key.')
                ->secret(),
        ]));

        // The three core auth endpoints already carry the "recaptcha" alias.
        // Replace the implementation, preserving the core route throttles.
        $this->app['router']->aliasMiddleware('recaptcha', Http\VerifyTurnstile::class);
    }
}
