import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('A limit on the number of objects to be returned. The limit can range between 1 and 100 items.')
});

const ProviderTagSchema = z.object({
    text: z.string(),
    count: z.number()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTagSchema),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const OutputTagSchema = z.object({
    text: z.string(),
    count: z.number()
});

const OutputSchema = z.object({
    items: z.array(OutputTagSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List all candidate/opportunity tags configured on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-tags
            endpoint: '/v1/tags',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.data.map((tag) => ({
                text: tag.text,
                count: tag.count
            })),
            ...(parsed.next != null && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
