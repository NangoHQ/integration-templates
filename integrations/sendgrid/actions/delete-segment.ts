import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    segment_id: z.string().describe('The ID of the segment to delete.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was accepted.')
});

export default createAction({
    description: 'Delete a segment.',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://www.twilio.com/docs/sendgrid/api-reference/segmenting-contacts-v2/delete-segment
        const response = await nango.delete({
            endpoint: `/v3/marketing/segments/2.0/${encodeURIComponent(input.segment_id)}`,
            retries: 3
        });

        return { success: response.status >= 200 && response.status < 300 };
    }
});
