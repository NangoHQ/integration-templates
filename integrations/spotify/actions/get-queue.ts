import { z } from 'zod';
import { createAction } from 'nango';

// https://developer.spotify.com/documentation/web-api/reference/get-queue
const ProviderQueueItemSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        type: z.string().optional(),
        uri: z.string().optional()
    })
    .passthrough();

const ProviderQueueSchema = z.object({
    currently_playing: ProviderQueueItemSchema.nullable().optional(),
    queue: z.array(ProviderQueueItemSchema).optional()
});

const InputSchema = z.object({});

const QueueItemSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    currentlyPlaying: QueueItemSchema.optional(),
    queue: z.array(QueueItemSchema).optional()
});

const action = createAction({
    description: "Retrieve the user's current playback queue.",
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-queue',
        group: 'Player'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-read-playback-state'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-queue
        const response = await nango.get({
            endpoint: '/v1/me/player/queue',
            retries: 3
        });

        const providerData = ProviderQueueSchema.parse(response.data);

        return {
            ...(providerData.currently_playing != null && {
                currentlyPlaying: providerData.currently_playing
            }),
            ...(providerData.queue != null && { queue: providerData.queue })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
