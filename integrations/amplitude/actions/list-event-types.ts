import { createAction } from 'nango';
import * as z from 'zod';

const CategorySchema = z.object({
    name: z.string().optional()
});

const EventTypeSchema = z.object({
    event_type: z.string(),
    category: CategorySchema.nullable().optional(),
    description: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    is_active: z.boolean().nullable().optional(),
    is_hidden_from_dropdowns: z.boolean().nullable().optional(),
    is_hidden_from_persona_results: z.boolean().nullable().optional(),
    is_hidden_from_pathfinder: z.boolean().nullable().optional(),
    is_hidden_from_timeline: z.boolean().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    owner: z.string().nullable().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional(),
    limit: z.number().optional()
});

const OutputSchema = z.object({
    data: z.array(EventTypeSchema),
    next_cursor: z.string().nullable().optional()
});

const TaxonomyResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(z.unknown())
});

const action = createAction({
    description: 'List taxonomy event types',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/list-event-types' },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        const params: Record<string, string | number> = {};
        if (input['cursor'] !== undefined) {
            params['cursor'] = input['cursor'];
        }
        if (input['limit'] !== undefined) {
            params['limit'] = input['limit'];
        }

        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/event',
            params,
            retries: 3
        });

        const parsed = TaxonomyResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({ message: 'Invalid response from Amplitude Taxonomy API' });
        }

        if (!parsed.data.success) {
            throw new nango.ActionError({ message: 'Amplitude Taxonomy API returned an error' });
        }

        const data = parsed.data.data.map((item) => {
            const eventType = EventTypeSchema.safeParse(item);
            if (!eventType.success) {
                throw new nango.ActionError({ message: 'Invalid event type in response data' });
            }
            return eventType.data;
        });

        return {
            data,
            next_cursor: null
        };
    }
});

export default action;
