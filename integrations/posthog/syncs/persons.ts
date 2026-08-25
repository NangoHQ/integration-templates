import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PersonSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    distinct_ids: z.array(z.string()).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    uuid: z.string().optional(),
    last_seen_at: z.string().optional()
});

const ProviderPersonSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string().nullable().optional(),
    distinct_ids: z.array(z.string()).optional(),
    properties: z.record(z.string(), z.unknown()).nullable().optional(),
    created_at: z.string().optional(),
    uuid: z.string().optional(),
    last_seen_at: z.string().optional()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

function getNextCursor(nextPageParam: unknown): string | undefined {
    if (typeof nextPageParam !== 'string' || nextPageParam.length === 0) {
        return undefined;
    }

    const nextUrl = new URL(nextPageParam, 'https://example.com');
    const cursor = nextUrl.searchParams.get('cursor');

    return cursor && cursor.length > 0 ? cursor : undefined;
}

const sync = createSync({
    description: 'Sync persons from PostHog',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/persons',
            method: 'POST'
        }
    ],
    models: {
        Person: PersonSchema
    },

    exec: async (nango) => {
        // Blocker: The PostHog persons list endpoint does not support an
        // updated_at, modified_since, or since_id filter. It only supports
        // cursor pagination via next/previous URLs with no timestamp-based
        // filtering, making incremental checkpointing impossible.
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { cursor: '' };
        let nextCursor: string | undefined = checkpoint.cursor || undefined;

        await nango.trackDeletesStart('Person');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/persons
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/persons/`,
            params: {
                ...(nextCursor && { cursor: nextCursor })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    nextCursor = getNextCursor(nextPageParam) ?? getNextCursor(response.data?.['next']);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const persons = [];
            for (const raw of page) {
                const parsed = ProviderPersonSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse person: ${parsed.error.message}`);
                }

                const record = parsed.data;
                persons.push({
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.distinct_ids != null && { distinct_ids: record.distinct_ids }),
                    ...(record.properties != null && { properties: record.properties }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.uuid != null && { uuid: record.uuid }),
                    ...(record.last_seen_at != null && { last_seen_at: record.last_seen_at })
                });
            }

            if (persons.length > 0) {
                await nango.batchSave(persons, 'Person');
            }

            // Persist pagination progress after every page so a timed-out run
            // resumes from the next cursor instead of restarting from page 1.
            if (nextCursor) {
                await nango.saveCheckpoint({ cursor: nextCursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Person');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
