import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const StepPropertySchema = z
    .object({
        key: z.string(),
        type: z.string().optional(),
        value: z.unknown().optional(),
        operator: z.string().optional()
    })
    .passthrough();

const StepSchema = z
    .object({
        event: z.string().optional(),
        properties: z.array(StepPropertySchema).optional(),
        selector: z.string().optional(),
        selector_regex: z.string().optional(),
        tag_name: z.string().optional(),
        text: z.string().optional(),
        text_matching: z.string().optional(),
        href: z.string().optional(),
        href_matching: z.string().optional(),
        url: z.string().optional(),
        url_matching: z.string().optional()
    })
    .passthrough();

const CreatedBySchema = z
    .object({
        id: z.number(),
        uuid: z.string().optional(),
        distinct_id: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        is_email_verified: z.boolean().optional(),
        hedgehog_config: z.unknown().optional(),
        role_at_organization: z.string().optional()
    })
    .passthrough();

const ProviderActionSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        description: z.string().optional(),
        tags: z.array(z.string().nullable()).optional(),
        post_to_slack: z.boolean().optional(),
        slack_message_format: z.string().optional(),
        steps: z.array(StepSchema).optional(),
        created_at: z.string(),
        created_by: CreatedBySchema.nullable().optional(),
        deleted: z.boolean().optional(),
        is_calculating: z.boolean().optional(),
        last_calculated_at: z.string().optional(),
        team_id: z.number().optional(),
        is_action: z.boolean().optional(),
        bytecode_error: z.string().optional(),
        pinned_at: z.string().nullable().optional(),
        creation_context: z.string().optional(),
        user_access_level: z.string().optional()
    })
    .passthrough();

const ActionSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    post_to_slack: z.boolean().optional(),
    slack_message_format: z.string().optional(),
    steps: z.array(StepSchema).optional(),
    created_at: z.string(),
    created_by: CreatedBySchema.optional(),
    deleted: z.boolean().optional(),
    is_calculating: z.boolean().optional(),
    last_calculated_at: z.string().optional(),
    team_id: z.number().optional(),
    is_action: z.boolean().optional(),
    bytecode_error: z.string().optional(),
    pinned_at: z.string().optional(),
    creation_context: z.string().optional(),
    user_access_level: z.string().optional()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync actions (saved event patterns) from PostHog.',
    version: '1.0.0',
    // https://posthog.com/docs/api/actions
    endpoints: [{ method: 'GET', path: '/syncs/actions' }],
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Action: ActionSchema
    },

    exec: async (nango) => {
        // Blocker: The PostHog Actions list endpoint only supports limit/offset
        // pagination with no updated_after, modified_since, since_id, or cursor
        // filter. There is no changed-records or delta endpoint for actions.
        await nango.trackDeletesStart('Action');

        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }
        const projectId = metadata.project_id;

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/actions
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/actions/`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                continue;
            }

            const actions: z.infer<typeof ActionSchema>[] = [];

            for (const raw of page) {
                const parsed = ProviderActionSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse action: ${parsed.error.message}`);
                }

                const action = parsed.data;
                actions.push({
                    id: String(action.id),
                    ...(action.name != null && action.name !== undefined ? { name: action.name } : {}),
                    ...(action.description != null ? { description: action.description } : {}),
                    ...(action.tags != null ? { tags: action.tags.filter((tag): tag is string => tag != null) } : {}),
                    ...(action.post_to_slack != null ? { post_to_slack: action.post_to_slack } : {}),
                    ...(action.slack_message_format != null ? { slack_message_format: action.slack_message_format } : {}),
                    ...(action.steps != null ? { steps: action.steps } : {}),
                    created_at: action.created_at,
                    ...(action.created_by != null ? { created_by: action.created_by } : {}),
                    ...(action.deleted != null ? { deleted: action.deleted } : {}),
                    ...(action.is_calculating != null ? { is_calculating: action.is_calculating } : {}),
                    ...(action.last_calculated_at != null ? { last_calculated_at: action.last_calculated_at } : {}),
                    ...(action.team_id != null ? { team_id: action.team_id } : {}),
                    ...(action.is_action != null ? { is_action: action.is_action } : {}),
                    ...(action.bytecode_error != null ? { bytecode_error: action.bytecode_error } : {}),
                    ...(action.pinned_at != null ? { pinned_at: action.pinned_at } : {}),
                    ...(action.creation_context != null ? { creation_context: action.creation_context } : {}),
                    ...(action.user_access_level != null ? { user_access_level: action.user_access_level } : {})
                });
            }

            if (actions.length > 0) {
                await nango.batchSave(actions, 'Action');
            }
        }

        await nango.trackDeletesEnd('Action');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
