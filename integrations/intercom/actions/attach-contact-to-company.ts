import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contact_id: z.string().describe('The unique identifier for the contact. Example: "5f3e2e3c5f3e2e3c5f3e2e3c"'),
    company_id: z.string().describe('The unique identifier for the company. Example: "5f3e2e3c5f3e2e3c5f3e2e3d"')
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier for the company that was attached.')
});

const action = createAction({
    description: 'Associate a contact with a company.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write', 'companies.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts
            endpoint: `/contacts/${encodeURIComponent(input.contact_id)}/companies`,
            data: {
                id: input.company_id
            },
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or company could not be attached',
                contact_id: input.contact_id
            });
        }

        const result = z
            .object({
                id: z.string()
            })
            .parse(response.data);

        return {
            id: result.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
