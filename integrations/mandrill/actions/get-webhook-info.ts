import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of a webhook belonging to this account. Example: 12345')
});

const OutputSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    events: z.array(z.string()),
    created_at: z.string(),
    last_sent_at: z.string().nullable().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().nullable().optional()
});

const action = createAction({
    description: 'Get data about a single existing webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/webhooks/get-webhook-info/
            endpoint: '/1.0/webhooks/info.json',
            data: {
                id: input.id
            },
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
