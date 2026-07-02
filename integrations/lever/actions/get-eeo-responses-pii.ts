import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset from the previous response. Omit for the first page.')
});

const EeoResponseSchema = z
    .object({
        id: z.string().optional(),
        opportunityId: z.string().optional(),
        posting: z.string().optional(),
        gender: z.string().optional(),
        race: z.string().optional(),
        veteranStatus: z.string().optional(),
        disabilityStatus: z.string().optional(),
        createdAt: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(EeoResponseSchema).optional(),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    response: z.array(EeoResponseSchema).optional(),
    next: z.string().optional()
});

const action = createAction({
    description: 'Get EEO survey responses including personally identifiable information.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['eeo_responses_pii:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#retrieve-eeo-responses-with-pii
            endpoint: '/v1/eeo/responses/pii',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const eeoResponses = providerResponse.data ?? [];

        return {
            success: true,
            response: eeoResponses,
            ...(providerResponse.next !== undefined && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
