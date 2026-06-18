import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().describe('The event type name to retrieve. Example: "Purchase"')
});

const ProviderCategorySchema = z.object({
    name: z.string()
});

const ProviderEventTypeSchema = z.object({
    event_type: z.string(),
    category: ProviderCategorySchema.nullable().optional(),
    description: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    owner: z.string().nullable().optional(),
    is_hidden_from_dropdowns: z.boolean().nullable().optional(),
    is_hidden_from_persona_results: z.boolean().nullable().optional(),
    is_hidden_from_pathfinder: z.boolean().nullable().optional(),
    is_hidden_from_timeline: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderEventTypeSchema.nullable().optional()
});

const OutputSchema = z.object({
    event_type: z.string(),
    category: z.object({ name: z.string() }).optional(),
    description: z.string().optional(),
    display_name: z.string().optional(),
    deleted: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    owner: z.string().optional(),
    is_hidden_from_dropdowns: z.boolean().optional(),
    is_hidden_from_persona_results: z.boolean().optional(),
    is_hidden_from_pathfinder: z.boolean().optional(),
    is_hidden_from_timeline: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a taxonomy event type.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: `/api/2/taxonomy/event/${encodeURIComponent(input.event_type)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event type not found or empty response from provider.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned a failure response.'
            });
        }

        if (!providerResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event type not found.'
            });
        }

        const providerEventType = providerResponse.data;

        return {
            event_type: providerEventType.event_type,
            ...(providerEventType.category != null && { category: providerEventType.category }),
            ...(providerEventType.description != null && { description: providerEventType.description }),
            ...(providerEventType.display_name != null && { display_name: providerEventType.display_name }),
            ...(providerEventType.deleted != null && { deleted: providerEventType.deleted }),
            ...(providerEventType.tags != null && { tags: providerEventType.tags }),
            ...(providerEventType.is_active != null && { is_active: providerEventType.is_active }),
            ...(providerEventType.owner != null && { owner: providerEventType.owner }),
            ...(providerEventType.is_hidden_from_dropdowns != null && { is_hidden_from_dropdowns: providerEventType.is_hidden_from_dropdowns }),
            ...(providerEventType.is_hidden_from_persona_results != null && {
                is_hidden_from_persona_results: providerEventType.is_hidden_from_persona_results
            }),
            ...(providerEventType.is_hidden_from_pathfinder != null && { is_hidden_from_pathfinder: providerEventType.is_hidden_from_pathfinder }),
            ...(providerEventType.is_hidden_from_timeline != null && { is_hidden_from_timeline: providerEventType.is_hidden_from_timeline })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
