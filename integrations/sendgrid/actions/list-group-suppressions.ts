import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_id: z.string().describe('The ID of the suppression group. Example: "254514"')
});

const OutputSchema = z.object({
    emails: z.array(z.string())
});

const action = createAction({
    description: 'List the email addresses unsubscribed from a specific group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asm.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-unsubscribe-groups-retrieve-all-suppressions-for-a-group
            endpoint: `/v3/asm/groups/${encodeURIComponent(input.group_id)}/suppressions`,
            retries: 3
        });

        const emails = z.array(z.string()).parse(response.data);

        return {
            emails
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
