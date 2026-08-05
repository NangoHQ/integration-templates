import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first_name: z.string().min(1).describe('Contact first name. Example: "John"'),
    last_name: z.string().min(1).describe('Contact last name. Example: "Doe"'),
    email: z.string().email().describe('Contact email address. Example: "john.doe@example.com"'),
    company_name: z.string().min(1).describe('Company name to create or match. Example: "Acme Inc"')
});

const ProviderResponseSchema = z.object({
    contact_id: z.string().optional(),
    company_id: z.string().optional()
});

const OutputSchema = z.object({
    contact_id: z.string().describe('ID of the created or matched contact. Example: "6a71ddac92e09607f906db64"'),
    company_id: z.string().describe('ID of the created or matched company. Example: "6a71ddac92e09607f906db63"')
});

const action = createAction({
    description: 'Create (or find, if matching an existing company by name) a contact and its associated company in one call',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/importcontactpubv2.md
            endpoint: '/api/v2/pub/contacts',
            data: {
                first_name: input.first_name,
                last_name: input.last_name,
                email: input.email,
                company_name: input.company_name
            },
            retries: 1
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.contact_id || !parsed.company_id) {
            throw new nango.ActionError({
                type: 'missing_ids',
                message: 'Provider response did not include both contact_id and company_id'
            });
        }

        return {
            contact_id: parsed.contact_id,
            company_id: parsed.company_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
