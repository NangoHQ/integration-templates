import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    cursor_direction: z.enum(['after', 'before']).optional().describe('Direction for the cursor. Defaults to after.'),
    limit: z.number().int().min(1).max(100).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    events: z.array(z.string()).min(1),
    range_start: z.string().optional(),
    range_end: z.string().optional(),
    organization_id: z.string().optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        event: z.string(),
        created_at: z.string(),
        data: z.record(z.string(), z.unknown()),
        context: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({
    object: z.literal('list').optional(),
    data: z.array(ResourceSchema),
    list_metadata: z.object({ after: z.string().nullable().optional(), before: z.string().nullable().optional() })
});
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional() });
const action = createAction({
    description: 'List WorkOS events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursorDirection = input.cursor_direction ?? 'after';
        const response = await nango.get({
            // https://workos.com/docs/reference/events/list
            endpoint: '/events',
            params: {
                ...(input.cursor !== undefined && { [cursorDirection]: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order !== undefined && { order: input.order }),
                events: input.events,
                ...(input.range_start !== undefined && { range_start: input.range_start }),
                ...(input.range_end !== undefined && { range_end: input.range_end }),
                ...(input.organization_id !== undefined && { organization_id: input.organization_id })
            },
            retries: 3
        });
        const provider = ProviderResponseSchema.parse(response.data);
        const nextCursor = cursorDirection === 'before' ? provider.list_metadata.before : provider.list_metadata.after;
        return { items: provider.data, ...(nextCursor != null && { next_cursor: nextCursor }) };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
