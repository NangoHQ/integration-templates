import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    offset: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of sources to return per page (1-100).')
});

const SourceSchema = z.object({
    text: z.string(),
    count: z.number().optional()
});

const OutputSchema = z.object({
    data: z.array(SourceSchema),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const action = createAction({
    description: 'List all candidate sources configured on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation
        const response = await nango.get({
            endpoint: '/v1/sources',
            params: {
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            data: z.array(SourceSchema),
            hasNext: z.boolean().optional(),
            next: z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            data: providerResponse.data,
            ...(providerResponse.hasNext !== undefined && { hasNext: providerResponse.hasNext }),
            ...(providerResponse.next !== undefined && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
