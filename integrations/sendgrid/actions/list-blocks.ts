import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_time: z.number().optional(),
    end_time: z.number().optional()
});

const BlockSchema = z.object({
    created: z.number(),
    email: z.string(),
    reason: z.string(),
    status: z.string()
});

const OutputSchema = z.array(BlockSchema);

const action = createAction({
    description: 'List blocked email addresses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/blocks-api/retrieve-all-blocks
            endpoint: '/v3/suppression/blocks',
            params: {
                ...(input.start_time !== undefined && { start_time: input.start_time }),
                ...(input.end_time !== undefined && { end_time: input.end_time })
            },
            retries: 3
        });

        const blocks = OutputSchema.parse(response.data);

        return blocks;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
