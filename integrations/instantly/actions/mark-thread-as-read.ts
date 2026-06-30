import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    thread_id: z.string().describe('Thread ID. Example: "123e4567-e89b-12d3-a456-426614174000"')
});

const ProviderOutputSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Mark all emails in a thread as read',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: { method: 'POST', path: '/actions/mark-thread-as-read' },
    scopes: ['emails:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/email/mark-all-emails-in-a-thread-as-read
            endpoint: `/v2/emails/threads/${encodeURIComponent(input.thread_id)}/mark-as-read`,
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            success: providerOutput.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
