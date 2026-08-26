import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    team_id: z.string()
});

const WebhookSchema = z.object({
    id: z.string(),
    event_type: z.string(),
    team_id: z.string(),
    context: z.string(),
    context_id: z.string(),
    plan_api_id: z.string(),
    status: z.string(),
    client_id: z.string().nullable(),
    passcode: z.string(),
    endpoint: z.string(),
    description: z.string().nullable()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync webhooks from Figma',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/webhooks' }],
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new Error('team_id is required in metadata');
        }

        const teamId = parsedMetadata.data.team_id;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { cursor: '' });
        let nextCursor: string | undefined = checkpoint.cursor || undefined;

        await nango.trackDeletesStart('Webhook');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.figma.com/docs/rest-api/webhooks-endpoints/
            endpoint: `/v2/teams/${encodeURIComponent(teamId)}/webhooks`,
            params: {
                ...(nextCursor && { cursor: nextCursor })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'pagination.next_page',
                response_path: 'webhooks',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        const paginator: AsyncGenerator<unknown[], undefined, void> = nango.paginate(proxyConfig);

        for await (const page of paginator) {
            const parsedPage = z.array(WebhookSchema).safeParse(page);

            if (!parsedPage.success) {
                throw new Error(`Failed to parse webhooks: ${parsedPage.error.message}`);
            }

            if (parsedPage.data.length > 0) {
                await nango.batchSave(parsedPage.data, 'Webhook');
            }

            if (nextCursor !== undefined) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
