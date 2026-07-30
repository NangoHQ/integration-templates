import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderClientSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderClientSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List clients in an organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/clients`,
            params: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        });

        const rawData = z.union([z.array(z.unknown()), z.object({ clients: z.array(z.unknown()) }).passthrough()]).parse(response.data);

        const items = Array.isArray(rawData)
            ? rawData.map((item) => ProviderClientSchema.parse(item))
            : rawData.clients.map((item) => ProviderClientSchema.parse(item));

        const nextCursor = !Array.isArray(rawData) && typeof rawData['next_cursor'] === 'string' ? rawData['next_cursor'] : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
