import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        creation_id: z.string().describe('ID of a prepared Instagram media container whose status_code is FINISHED.')
    })
    .describe('Input for publishing a prepared Instagram media container.');

const ProviderPublishSchema = z.object({
    id: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the published Instagram media object.')
    })
    .describe('The published Instagram media object.');

/**
 * @tags: [write, destructive]
 * @tagReason: Publishes a media container, creating a permanent public Instagram post with no confirmed API-based undo.
 * @pitfalls: The container must already exist and be FINISHED; publishing is effectively irreversible because deleting the resulting media is not supported on this connection type.
 */
const action = createAction({
    description: 'Publish a prepared Instagram media container.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_content_publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish
        const response = await nango.post({
            endpoint: '/me/media_publish',
            params: {
                creation_id: input.creation_id
            },
            // Publishing is not idempotent: a retry after a lost response could publish again.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const published = ProviderPublishSchema.parse(response.data);

        return {
            id: published.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
