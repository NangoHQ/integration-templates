import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SurveySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    schedule: z.string().optional(),
    linked_flag_id: z.number().optional().nullable(),
    linked_insight_id: z.number().optional().nullable(),
    targeting_flag_id: z.number().optional().nullable(),
    questions: z.unknown().optional().nullable(),
    conditions: z.unknown().optional().nullable(),
    appearance: z.unknown().optional().nullable(),
    created_at: z.string().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    archived: z.boolean().optional().nullable(),
    responses_limit: z.number().optional().nullable(),
    iteration_count: z.number().optional().nullable(),
    iteration_frequency_days: z.number().optional().nullable(),
    current_iteration: z.number().optional().nullable(),
    current_iteration_start_date: z.string().optional().nullable(),
    enable_partial_responses: z.boolean().optional().nullable(),
    enable_iframe_embedding: z.boolean().optional().nullable(),
    base_language: z.string().optional().nullable()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync surveys from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Survey: SurveySchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/surveys'
        }
    ],

    exec: async (nango) => {
        // https://posthog.com/docs/api/surveys
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        await nango.trackDeletesStart('Survey');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/surveys#list-all-surveys
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/surveys/`,
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

        for await (const page of nango.paginate<z.infer<typeof SurveySchema>>(proxyConfig)) {
            const surveys = page.map((record) => ({
                id: record.id,
                ...(record.name !== undefined && { name: record.name }),
                ...(record.description !== undefined && { description: record.description }),
                ...(record.type !== undefined && { type: record.type }),
                ...(record.schedule !== undefined && { schedule: record.schedule }),
                ...(record.linked_flag_id !== undefined && record.linked_flag_id !== null && { linked_flag_id: record.linked_flag_id }),
                ...(record.linked_insight_id !== undefined && record.linked_insight_id !== null && { linked_insight_id: record.linked_insight_id }),
                ...(record.targeting_flag_id !== undefined && record.targeting_flag_id !== null && { targeting_flag_id: record.targeting_flag_id }),
                ...(record.questions !== undefined && record.questions !== null && { questions: record.questions }),
                ...(record.conditions !== undefined && record.conditions !== null && { conditions: record.conditions }),
                ...(record.appearance !== undefined && record.appearance !== null && { appearance: record.appearance }),
                ...(record.created_at !== undefined && { created_at: record.created_at }),
                ...(record.start_date !== undefined && record.start_date !== null && { start_date: record.start_date }),
                ...(record.end_date !== undefined && record.end_date !== null && { end_date: record.end_date }),
                ...(record.archived !== undefined && record.archived !== null && { archived: record.archived }),
                ...(record.responses_limit !== undefined && record.responses_limit !== null && { responses_limit: record.responses_limit }),
                ...(record.iteration_count !== undefined && record.iteration_count !== null && { iteration_count: record.iteration_count }),
                ...(record.iteration_frequency_days !== undefined &&
                    record.iteration_frequency_days !== null && { iteration_frequency_days: record.iteration_frequency_days }),
                ...(record.current_iteration !== undefined && record.current_iteration !== null && { current_iteration: record.current_iteration }),
                ...(record.current_iteration_start_date !== undefined &&
                    record.current_iteration_start_date !== null && { current_iteration_start_date: record.current_iteration_start_date }),
                ...(record.enable_partial_responses !== undefined &&
                    record.enable_partial_responses !== null && { enable_partial_responses: record.enable_partial_responses }),
                ...(record.enable_iframe_embedding !== undefined &&
                    record.enable_iframe_embedding !== null && { enable_iframe_embedding: record.enable_iframe_embedding }),
                ...(record.base_language !== undefined && record.base_language !== null && { base_language: record.base_language })
            }));

            if (surveys.length > 0) {
                await nango.batchSave(surveys, 'Survey');
            }
        }

        await nango.trackDeletesEnd('Survey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
