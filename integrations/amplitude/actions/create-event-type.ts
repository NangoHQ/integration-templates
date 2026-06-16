import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().describe('Required. The event name. Example: "Purchase"'),
    category: z.string().optional().describe('Optional. The event type\'s category. Example: "Conversion"'),
    description: z.string().optional().describe('Optional. Details about the event type.'),
    is_active: z.boolean().optional().describe('Optional. Activity of the event type.'),
    is_hidden_from_dropdowns: z.boolean().optional().describe('Optional. Event type is hidden from dropdowns.'),
    is_hidden_from_persona_results: z.boolean().optional().describe('Optional. Event type is hidden from persona results.'),
    is_hidden_from_pathfinder: z.boolean().optional().describe('Optional. Event type is hidden from pathfinder.'),
    is_hidden_from_timeline: z.boolean().optional().describe('Optional. Event type is hidden from timeline.'),
    tags: z.string().optional().describe('Optional. List of tags, separated by a comma.'),
    owner: z.string().optional().describe('Optional. Owner of the event type.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    event_type: z.string()
});

const action = createAction({
    description: 'Create a taxonomy event type.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-event-type',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, string | boolean | undefined> = {
            event_type: input.event_type,
            ...(input.category !== undefined && { category: input.category }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.is_active !== undefined && { is_active: input.is_active }),
            ...(input.is_hidden_from_dropdowns !== undefined && { is_hidden_from_dropdowns: input.is_hidden_from_dropdowns }),
            ...(input.is_hidden_from_persona_results !== undefined && { is_hidden_from_persona_results: input.is_hidden_from_persona_results }),
            ...(input.is_hidden_from_pathfinder !== undefined && { is_hidden_from_pathfinder: input.is_hidden_from_pathfinder }),
            ...(input.is_hidden_from_timeline !== undefined && { is_hidden_from_timeline: input.is_hidden_from_timeline }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.owner !== undefined && { owner: input.owner })
        };

        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
            if (value !== undefined) {
                params.append(key, String(value));
            }
        }

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/taxonomy#create-an-event-type
            endpoint: '/api/2/taxonomy/event',
            data: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            const messages = providerResponse.errors?.map((e) => e.message).join(', ') ?? 'Unknown error';
            throw new nango.ActionError({
                type: 'provider_error',
                message: messages
            });
        }

        return {
            success: true,
            event_type: input.event_type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
