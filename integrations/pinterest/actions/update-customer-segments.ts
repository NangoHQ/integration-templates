import { z } from 'zod';
import { createAction } from 'nango';

const SegmentUpdateSchema = z.object({
    id: z.string().describe('Customer segment ID. Example: "123456789"'),
    operation_type: z
        .enum(['UPDATE', 'REMOVE'])
        .describe('Operation type for the segment. Use UPDATE to modify audience_ids, or REMOVE to delete the segment.'),
    audience_ids: z.array(z.string()).optional().describe('Audience IDs to include in the customer segment. Only applicable for UPDATE operations.')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    segments: z.array(SegmentUpdateSchema).describe('Array of customer segment updates.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether all segment updates were accepted.')
});

const action = createAction({
    description: 'Update customer segments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.segments.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'segments array must contain at least one item.'
            });
        }

        for (const segment of input.segments) {
            const payload: { id: string; operation_type: string; audience_ids?: string[] } = {
                id: segment.id,
                operation_type: segment.operation_type
            };
            if (segment.audience_ids !== undefined) {
                payload.audience_ids = segment.audience_ids;
            }

            // https://developers.pinterest.com/docs/api/v5/#operation/customer_segment/update
            const response = await nango.patch({
                endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_segments`,
                data: payload,
                retries: 10
            });

            if (response.status !== 200) {
                throw new nango.ActionError({
                    type: 'api_error',
                    message: `Unexpected status code ${response.status} for segment ${segment.id}`
                });
            }
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
