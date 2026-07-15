import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list to remove contacts from. Example: "fa1dbbb4-10af-42d7-b07e-d1ab501a805b"'),
    contact_ids: z.array(z.string()).describe('The contact IDs to remove from the list. Example: ["c6491580-2f4a-4339-8812-eb1f86aae6dd"]')
});

const ProviderResponseSchema = z.object({
    job_id: z.string()
});

const OutputSchema = z.object({
    job_id: z.string()
});

const action = createAction({
    description: 'Remove contacts from a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contactIdsParam = input.contact_ids.join(',');

        const response = await nango.delete({
            // https://www.twilio.com/docs/sendgrid/api-reference/lists/remove-contacts-from-a-list
            endpoint: `/v3/marketing/lists/${encodeURIComponent(input.list_id)}/contacts`,
            params: {
                contact_ids: contactIdsParam
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            job_id: data.job_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
