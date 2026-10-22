<?php

declare(strict_types=1);

namespace CloudflareTurnstile\Http;

use Closure;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Pterodactyl\Events\Auth\FailedCaptcha;
use Pterodactyl\Http\Middleware\VerifyReCaptcha;
use Pterodactyl\Services\Extensions\ExtensionRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class VerifyTurnstile
{
    public function __construct(private readonly ExtensionRepository $extensions, private readonly VerifyReCaptcha $recaptcha) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $settings = $this->extensions->settings('cloudflare-turnstile');
        // When disabled, preserve the Panel's original reCAPTCHA behaviour.
        if ($settings->get('enabled', false) !== true) {
            return $this->recaptcha->handle($request, $next);
        }

        $siteKey = $settings->get('site_key', '');
        $secret = $settings->get('secret_key', '');
        if (!is_string($siteKey) || $siteKey === '' || !is_string($secret) || $secret === '') {
            throw new HttpException(503, 'Turnstile is not configured. Contact the administrator.');
        }

        // Reuse the field name the Panel 2.0 auth forms already send.
        $token = $request->input('g-recaptcha-response');
        $result = [];
        if (is_string($token) && $token !== '' && strlen($token) <= 2048) {
            try {
                $client = new Client(['timeout' => 6, 'connect_timeout' => 3]);
                $response = $client->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'form_params' => [
                        'secret' => $secret,
                        'response' => $token,
                        'remoteip' => $request->ip(),
                    ],
                ]);
                $result = json_decode((string) $response->getBody(), true);
            } catch (\Throwable) {
                $result = [];
            }
        }

        // Require Cloudflare to confirm the exact hostname used for the request.
        $hostname = is_array($result) ? ($result['hostname'] ?? null) : null;
        if (is_array($result) && ($result['success'] ?? false) === true
            && is_string($hostname) && hash_equals(strtolower($request->getHost()), strtolower($hostname))) {
            return $next($request);
        }

        event(new FailedCaptcha($request->ip() ?? 'unknown', is_string($hostname) ? $hostname : 'unknown'));
        throw new HttpException(400, 'Failed to validate Cloudflare Turnstile. Please retry.');
    }
}
