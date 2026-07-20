import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        emails: z.array(z.string()).optional().describe('Email addresses to remove from the block list. Example: ["user@example.com"]'),
        delete_all: z.boolean().optional().describe('If true, clear all block suppressions.')
    })
    .refine((data) => data.delete_all === true || (data.emails !== undefined && data.emails.length > 0), {
        message: 'Either delete_all must be true, or emails must contain at least one address.'
    });

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful.')
});

const action = createAction({
    description: 'Clear block suppressions for one or more addresses, or all of them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.delete_all === true) {
            body['delete_all'] = true;
        } else if (input.emails !== undefined) {
            body['emails'] = input.emails;
        }

        // https://www.twilio.com/docs/sendgrid/api-reference/blocks-api/delete-blocks
        await nango.delete({
            endpoint: '/v3/suppression/blocks',
            data: body,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
