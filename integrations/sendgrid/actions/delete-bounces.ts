import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        emails: z.array(z.string().email()).optional().describe('Array of email addresses to remove from bounce suppressions. Example: ["test@example.com"]'),
        delete_all: z.boolean().optional().describe('Set to true to clear all bounce suppressions.')
    })
    .refine((data) => data.delete_all === true || (data.emails !== undefined && data.emails.length > 0), {
        message: 'Either a non-empty emails array or delete_all: true must be provided.'
    })
    .refine((data) => !(data.emails !== undefined && data.emails.length > 0 && data.delete_all === true), {
        message: 'Cannot specify both a non-empty emails array and delete_all: true.'
    });

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Clear bounce suppressions for one or more addresses, or all of them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { emails?: string[]; delete_all?: boolean } = {};
        if (input.emails !== undefined) {
            body.emails = input.emails;
        }
        if (input.delete_all !== undefined) {
            body.delete_all = input.delete_all;
        }

        // https://www.twilio.com/docs/sendgrid/api-reference/bounces-api/delete-bounces
        const response = await nango.delete({
            endpoint: '/v3/suppression/bounces',
            data: body,
            retries: 3
        });

        if (response.status === 204 || (response.status >= 200 && response.status < 300)) {
            return {
                success: true
            };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: `Unexpected status code ${response.status} from SendGrid.`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
