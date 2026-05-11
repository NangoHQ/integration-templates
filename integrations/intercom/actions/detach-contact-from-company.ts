import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The unique identifier for the contact. Example: "63d2a3f8e8a1b2c3d4e5f6g7"'),
    company_id: z.string().describe('The unique identifier for the company. Example: "63d2a3f8e8a1b2c3d4e5f6h8"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    contact_id: z.string(),
    company_id: z.string()
});

const action = createAction({
    description: "Remove a contact's association with a company.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/detach-contact-from-company',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts
        await nango.delete({
            endpoint: `/contacts/${encodeURIComponent(input.contact_id)}/companies/${encodeURIComponent(input.company_id)}`,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        return {
            success: true,
            contact_id: input.contact_id,
            company_id: input.company_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
