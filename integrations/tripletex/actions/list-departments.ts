import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const DepartmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    departmentNumber: z.string().optional().nullable(),
    isInactive: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(DepartmentSchema),
    nextCursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    fullResultSize: z.number(),
    from: z.number(),
    count: z.number(),
    values: z.array(z.unknown())
});

const action = createAction({
    description: 'List departments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer offset string.'
            });
        }
        const from = input.cursor ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/department',
            params: {
                from: String(from),
                count: '100'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = providerResponse.values.map((item) => {
            const parsed = DepartmentSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid department item in response.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const nextFrom = from + items.length;
        const nextCursor = nextFrom < providerResponse.fullResultSize ? String(nextFrom) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
