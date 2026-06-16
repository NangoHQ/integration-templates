import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().describe('The event type name to update. Example: "Purchase"'),
    new_event_type: z.string().optional().describe("The event type's new name."),
    category: z.string().optional().describe('Current category name of the event type.'),
    description: z.string().optional().describe('Details to add to the event type.'),
    display_name: z.string().optional().describe('Display name of the event type.'),
    is_active: z.boolean().optional().describe('Activity of the event type.'),
    is_hidden_from_dropdowns: z.boolean().optional().describe('Event type is hidden from dropdowns.'),
    is_hidden_from_persona_results: z.boolean().optional().describe('Event type is hidden from persona results.'),
    is_hidden_from_pathfinder: z.boolean().optional().describe('Event type is hidden from pathfinder.'),
    is_hidden_from_timeline: z.boolean().optional().describe('Event type is hidden from timeline.'),
    tags: z.string().optional().describe('List of tags, separated by a comma.'),
    owner: z.string().optional().describe('Owner of the event type.')
});

const CategorySchema = z.object({
    name: z.string().optional()
});

const ProviderEventTypeSchema = z.object({
    event_type: z.string(),
    category: CategorySchema.nullable().optional(),
    description: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    is_hidden_from_dropdowns: z.boolean().optional(),
    is_hidden_from_persona_results: z.boolean().optional(),
    is_hidden_from_pathfinder: z.boolean().optional(),
    is_hidden_from_timeline: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    owner: z.string().nullable().optional()
});

const OutputSchema = z.object({
    event_type: z.string(),
    category: CategorySchema.optional(),
    description: z.string().optional(),
    display_name: z.string().optional(),
    is_active: z.boolean().optional(),
    is_hidden_from_dropdowns: z.boolean().optional(),
    is_hidden_from_persona_results: z.boolean().optional(),
    is_hidden_from_pathfinder: z.boolean().optional(),
    is_hidden_from_timeline: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    owner: z.string().optional()
});

const TaxonomySuccessSchema = z.object({
    success: z.boolean()
});

const TaxonomyGetResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderEventTypeSchema
});

const action = createAction({
    description: 'Update a taxonomy event type.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-event-type',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = new URLSearchParams();

        if (input.new_event_type !== undefined) {
            params.append('new_event_type', input.new_event_type);
        }
        if (input.category !== undefined) {
            params.append('category', input.category);
        }
        if (input.description !== undefined) {
            params.append('description', input.description);
        }
        if (input.display_name !== undefined) {
            params.append('display_name', input.display_name);
        }
        if (input.is_active !== undefined) {
            params.append('is_active', String(input.is_active));
        }
        if (input.is_hidden_from_dropdowns !== undefined) {
            params.append('is_hidden_from_dropdowns', String(input.is_hidden_from_dropdowns));
        }
        if (input.is_hidden_from_persona_results !== undefined) {
            params.append('is_hidden_from_persona_results', String(input.is_hidden_from_persona_results));
        }
        if (input.is_hidden_from_pathfinder !== undefined) {
            params.append('is_hidden_from_pathfinder', String(input.is_hidden_from_pathfinder));
        }
        if (input.is_hidden_from_timeline !== undefined) {
            params.append('is_hidden_from_timeline', String(input.is_hidden_from_timeline));
        }
        if (input.tags !== undefined) {
            params.append('tags', input.tags);
        }
        if (input.owner !== undefined) {
            params.append('owner', input.owner);
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy#update-an-event-type
        const updateResponse = await nango.put({
            endpoint: `/api/2/taxonomy/event/${encodeURIComponent(input.event_type)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: params.toString(),
            retries: 1
        });

        const updateResult = TaxonomySuccessSchema.safeParse(updateResponse.data);
        if (!updateResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Amplitude API.',
                response: updateResponse.data
            });
        }

        if (!updateResult.data.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Amplitude failed to update the event type.',
                response: updateResponse.data
            });
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy#get-an-event-type
        const getResponse = await nango.get({
            endpoint: `/api/2/taxonomy/event/${encodeURIComponent(input.event_type)}`,
            retries: 3
        });

        const getResult = TaxonomyGetResponseSchema.safeParse(getResponse.data);
        if (!getResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response when fetching updated event type.',
                response: getResponse.data
            });
        }

        if (!getResult.data.success) {
            throw new nango.ActionError({
                type: 'fetch_failed',
                message: 'Amplitude failed to return the updated event type.',
                response: getResponse.data
            });
        }

        const providerEvent = getResult.data.data;

        return {
            event_type: providerEvent.event_type,
            ...(providerEvent.category != null && { category: providerEvent.category }),
            ...(providerEvent.description != null && { description: providerEvent.description }),
            ...(providerEvent.display_name != null && { display_name: providerEvent.display_name }),
            ...(providerEvent.is_active !== undefined && { is_active: providerEvent.is_active }),
            ...(providerEvent.is_hidden_from_dropdowns !== undefined && { is_hidden_from_dropdowns: providerEvent.is_hidden_from_dropdowns }),
            ...(providerEvent.is_hidden_from_persona_results !== undefined && { is_hidden_from_persona_results: providerEvent.is_hidden_from_persona_results }),
            ...(providerEvent.is_hidden_from_pathfinder !== undefined && { is_hidden_from_pathfinder: providerEvent.is_hidden_from_pathfinder }),
            ...(providerEvent.is_hidden_from_timeline !== undefined && { is_hidden_from_timeline: providerEvent.is_hidden_from_timeline }),
            ...(providerEvent.tags !== undefined && { tags: providerEvent.tags }),
            ...(providerEvent.owner != null && { owner: providerEvent.owner })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
