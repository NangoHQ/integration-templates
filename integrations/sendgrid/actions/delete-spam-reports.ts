import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z.array(z.string()).optional().describe('Email addresses to remove from spam reports. Example: ["a@x.com"]'),
    delete_all: z.boolean().optional().describe('Set to true to remove all spam reports.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Clear spam-report suppressions for one or more addresses, or all of them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.delete_all !== true && (input.emails === undefined || input.emails.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either delete_all must be true or emails must contain at least one address.'
            });
        }

        const body: { delete_all?: boolean; emails?: string[] } = {};
        if (input.delete_all === true) {
            body.delete_all = true;
        } else if (input.emails !== undefined && input.emails.length > 0) {
            body.emails = input.emails;
        }

        await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-spam-reports/delete-spam-reports
            endpoint: '/v3/suppression/spam_reports',
            data: body,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
