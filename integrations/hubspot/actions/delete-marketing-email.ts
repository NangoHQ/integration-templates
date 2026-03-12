import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email_id: z.string().describe('The ID of the marketing email to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    email_id: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a marketing email',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-marketing-email',
        group: 'Marketing Emails'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.marketing_emails.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/delete-marketing-v3-emails-emailId
        await nango.delete({
            endpoint: `/marketing/v3/emails/${input.email_id}`,
            retries: 10
        });

        return {
            success: true,
            email_id: input.email_id,
            message: `Marketing email ${input.email_id} deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
