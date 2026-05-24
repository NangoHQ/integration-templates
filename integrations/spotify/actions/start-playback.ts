import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    device_id: z.string().optional().describe("The ID of the device to play on. If not provided, playback will start on the user's currently active device."),
    context_uri: z
        .string()
        .optional()
        .describe('Spotify URI of the context to play. This can be an album, artist, or playlist URI. Example: "spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE"'),
    uris: z
        .array(z.string())
        .optional()
        .describe('An array of Spotify track URIs to play. If provided, context_uri should not be provided. Example: ["spotify:track:70LcF31zb1H0PyJoS1Sx1r"]'),
    offset: z
        .object({
            position: z.number().int().min(0).optional().describe('The index of the item in the context to play, starting from 0.'),
            uri: z.string().optional().describe('The URI of the item to start playback from.')
        })
        .optional()
        .describe('Indicates from where in the context playback should start. Only available when context_uri corresponds to an album or playlist.'),
    position_ms: z.number().optional().describe('The position in milliseconds to start playback from.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the playback was started successfully')
});

const SpotifyErrorSchema = z
    .object({
        error: z.object({ reason: z.string().optional() }).optional()
    })
    .optional();

const action = createAction({
    description: 'Start or resume Spotify playback, optionally on a specific device or with a context',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/start-playback',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-modify-playback-state'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build request body - only include defined fields
        const body: Record<string, unknown> = {};

        if (input['context_uri'] !== undefined) {
            body['context_uri'] = input['context_uri'];
        }

        if (input['uris'] !== undefined) {
            body['uris'] = input['uris'];
        }

        if (input['offset'] !== undefined) {
            body['offset'] = input['offset'];
        }

        if (input['position_ms'] !== undefined) {
            body['position_ms'] = input['position_ms'];
        }

        // Build query params
        const params: Record<string, string> = {};
        if (input['device_id'] !== undefined) {
            params['device_id'] = input['device_id'];
        }

        // Build config dynamically
        const hasParams = Object.keys(params).length > 0;
        const hasBody = Object.keys(body).length > 0;

        const config: ProxyConfiguration = {
            // https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback
            endpoint: '/v1/me/player/play',
            retries: 3
        };

        if (hasParams) {
            config.params = params;
        }

        if (hasBody) {
            config.data = body;
        }

        const response = await nango.put(config);

        // Spotify returns 204 No Content on success
        // 404 with NO_ACTIVE_DEVICE when no device is available
        // 403 when user doesn't have Premium
        if (response.status === 404) {
            const parseResult = SpotifyErrorSchema.safeParse(response.data);
            const reason = parseResult.success ? parseResult.data?.error?.reason : undefined;

            throw new nango.ActionError({
                type: 'no_active_device',
                message:
                    reason === 'NO_ACTIVE_DEVICE' ? 'No active Spotify device found. Please open Spotify on a device first.' : 'Playback device not found.',
                ...(reason && { reason })
            });
        }

        if (response.status === 403) {
            throw new nango.ActionError({
                type: 'premium_required',
                message: 'Spotify Premium is required to control playback.'
            });
        }

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'Rate limit exceeded. Please try again later.',
                retry_after: response.headers?.['retry-after']
            });
        }

        // 204 indicates success
        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'playback_failed',
                message: `Unexpected response status: ${response.status}`,
                status: response.status
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
