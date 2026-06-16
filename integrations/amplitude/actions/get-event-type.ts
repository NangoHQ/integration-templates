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
    tags: z.array(z.string()),
    is_active: z.boolean(),
    owner: z.string().nullable().optional(),
    is_hidden_from_dropdowns: z.boolean(),
    is_hidden_from_persona_results: z.boolean(),
    is_hidden_from_pathfinder: z.boolean(),
    is_hidden_from_timeline: z.boolean()
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
    tags: z.array(z.string()),
    is_active: z.boolean(),
    owner: z.string().optional(),
    is_hidden_from_dropdowns: z.boolean(),
    is_hidden_from_persona_results: z.boolean(),
    is_hidden_from_pathfinder: z.boolean(),
    is_hidden_from_timeline: z.boolean()
});

const action = createAction({
    description: 'Retrieve a taxonomy event type.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-event-type',
        group: 'Taxonomy'
    },
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
            tags: providerEventType.tags,
            is_active: providerEventType.is_active,
            ...(providerEventType.owner != null && { owner: providerEventType.owner }),
            is_hidden_from_dropdowns: providerEventType.is_hidden_from_dropdowns,
            is_hidden_from_persona_results: providerEventType.is_hidden_from_persona_results,
            is_hidden_from_pathfinder: providerEventType.is_hidden_from_pathfinder,
            is_hidden_from_timeline: providerEventType.is_hidden_from_timeline
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
