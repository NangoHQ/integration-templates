import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.string()).optional().describe('Contact IDs to delete. Example: ["c6491580-2f4a-4339-8812-eb1f86aae6dd"]'),
    delete_all_contacts: z.boolean().optional().describe('Set to true to delete all contacts. Use with caution.')
});

const ProviderResponseSchema = z.object({
    job_id: z.string()
});

const OutputSchema = z.object({
    job_id: z.string().describe('The ID of the async deletion job.')
});

const action = createAction({
    description: 'Delete contacts by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let params: Record<string, string>;

        if (input.ids !== undefined && input.ids.length > 0) {
            if (input.delete_all_contacts === true) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Exactly one of ids or delete_all_contacts is required. Both were provided.'
                });
            }
            params = { ids: input.ids.join(',') };
        } else if (input.delete_all_contacts === true) {
            params = { delete_all_contacts: 'true' };
        } else {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Exactly one of ids or delete_all_contacts is required. Both were omitted.'
            });
        }

        const response = await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/contacts-api-delete-contacts
            endpoint: '/v3/marketing/contacts',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job_id: providerResponse.job_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
