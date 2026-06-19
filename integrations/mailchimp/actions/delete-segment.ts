import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The unique ID of the Mailchimp audience/list. Example: "16ed227135"'),
    segment_id: z.string().describe('The unique ID of the segment to delete. Example: "3730784"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    list_id: z.string(),
    segment_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a segment in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/list-segments/delete-segment/
            endpoint: `/3.0/lists/${encodeURIComponent(input.list_id)}/segments/${encodeURIComponent(input.segment_id)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true,
            list_id: input.list_id,
            segment_id: input.segment_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
