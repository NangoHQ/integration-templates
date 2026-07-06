import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const RequisitionFieldSchema = z
    .object({
        id: z.string(),
        text: z.string(),
        type: z.string().optional(),
        isRequired: z.boolean().optional(),
        subfields: z.array(z.unknown()).optional(),
        options: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(RequisitionFieldSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'List the custom requisition fields configured on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['requisition_fields:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/requisition_fields',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                next: z.string().optional(),
                hasNext: z.boolean().optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item) => {
            return RequisitionFieldSchema.parse(item);
        });

        return {
            items,
            ...(providerResponse.next !== undefined && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
