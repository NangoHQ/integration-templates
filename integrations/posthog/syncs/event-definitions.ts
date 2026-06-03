import { createSync } from 'nango';
import { z } from 'zod';

const EventDefinitionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    last_seen_at: z.string().optional(),
    last_updated_at: z.string().optional(),
    verified: z.boolean().optional(),
    verified_at: z.string().optional(),
    hidden: z.boolean().optional(),
    enforcement_mode: z.string().optional(),
    primary_property: z.string().optional(),
    is_action: z.boolean().optional(),
    action_id: z.number().optional(),
    post_to_slack: z.boolean().optional(),
    tags: z.array(z.string()).optional()
});

const ProviderEventDefinitionSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    last_seen_at: z.string().nullable().optional(),
    last_updated_at: z.string().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    verified_at: z.string().nullable().optional(),
    hidden: z.boolean().nullable().optional(),
    enforcement_mode: z.string().nullable().optional(),
    primary_property: z.string().nullable().optional(),
    is_action: z.boolean().nullable().optional(),
    action_id: z.number().nullable().optional(),
    post_to_slack: z.boolean().nullable().optional(),
    tags: z.array(z.string().nullable()).nullable().optional()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync event definitions (auto-detected event schemas) from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        EventDefinition: EventDefinitionSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/event-definitions'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        // Blocker: provider list endpoint only exposes limit/offset pagination
        // with no changed-since filter, no deleted-record endpoint, and no
        // resumable cursor for incremental syncs.
        await nango.trackDeletesStart('EventDefinition');

        // https://posthog.com/docs/api/event-definitions
        for await (const page of nango.paginate({
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/event_definitions/`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        })) {
            const eventDefinitions = page.map((item) => {
                const parsed = ProviderEventDefinitionSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse event definition: ${parsed.error.message}`);
                }
                const record = parsed.data;

                return {
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at }),
                    ...(record.last_seen_at != null && { last_seen_at: record.last_seen_at }),
                    ...(record.last_updated_at != null && { last_updated_at: record.last_updated_at }),
                    ...(record.verified != null && { verified: record.verified }),
                    ...(record.verified_at != null && { verified_at: record.verified_at }),
                    ...(record.hidden != null && { hidden: record.hidden }),
                    ...(record.enforcement_mode != null && { enforcement_mode: record.enforcement_mode }),
                    ...(record.primary_property != null && { primary_property: record.primary_property }),
                    ...(record.is_action != null && { is_action: record.is_action }),
                    ...(record.action_id != null && { action_id: record.action_id }),
                    ...(record.post_to_slack != null && { post_to_slack: record.post_to_slack }),
                    ...(record.tags != null && { tags: record.tags.filter((tag) => tag !== null) })
                };
            });

            if (eventDefinitions.length > 0) {
                await nango.batchSave(eventDefinitions, 'EventDefinition');
            }
        }

        await nango.trackDeletesEnd('EventDefinition');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
