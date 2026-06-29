import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    account: z.string().describe('Exact Online account GUID. Example: "11acd652-4496-48e0-a189-e0045cc206e3"'),
    firstName: z.string().describe('Contact first name'),
    lastName: z.string().describe('Contact last name'),
    email: z.string().optional().describe('Contact email address'),
    phone: z.string().optional().describe('Business phone number'),
    businessMobile: z.string().optional().describe('Business mobile number')
});

const ProviderContactSchema = z.object({
    ID: z.string().nullable().optional(),
    Account: z.string().nullable().optional(),
    FirstName: z.string().nullable().optional(),
    LastName: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    BusinessPhone: z.string().nullable().optional(),
    BusinessMobile: z.string().nullable().optional()
});

const GetContactResponseSchema = z.object({
    d: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.string(),
    account: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    businessMobile: z.string().optional()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const PostResponseSchema = z.object({
    d: z.object({
        ID: z.string().nullable().optional(),
        __metadata: z
            .object({
                uri: z.string().optional()
            })
            .optional()
    })
});

const action = createAction({
    description: 'Create a new contact linked to an account',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-contact'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.Contacts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Sandbox-gen-get-currentDivision-me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.safeParse(meResponse.data);
        if (!meData.success || meData.data.d.results.length === 0) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        const firstResult = meData.data.d.results[0];
        if (firstResult === undefined) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint'
            });
        }

        const division = firstResult.CurrentDivision;

        const contactData: Record<string, string | number | undefined> = {
            Account: input.account,
            FirstName: input.firstName,
            LastName: input.lastName,
            ...(input.email !== undefined && { Email: input.email }),
            ...(input.phone !== undefined && { BusinessPhone: input.phone }),
            ...(input.businessMobile !== undefined && { BusinessMobile: input.businessMobile })
        };

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Sandbox-gen-crm-contacts
        const postResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Contacts`,
            data: contactData,
            retries: 3
        });

        const postData = PostResponseSchema.safeParse(postResponse.data);
        if (!postData.success) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Contact creation failed: invalid response'
            });
        }

        const postResult = postData.data.d;
        let contactId = postResult.ID;
        if (!contactId && postResult.__metadata?.uri) {
            const uriMatch = postResult.__metadata.uri.match(/guid'([^']+)'/);
            if (uriMatch && uriMatch[1]) {
                contactId = uriMatch[1];
            }
        }

        if (!contactId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Contact creation failed: no ID returned'
            });
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Sandbox-gen-crm-contacts
        const getResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Contacts(guid'${encodeURIComponent(contactId)}')`,
            retries: 3
        });

        const getData = GetContactResponseSchema.safeParse(getResponse.data);
        if (!getData.success) {
            throw new nango.ActionError({
                type: 'verify_failed',
                message: 'Could not verify created contact'
            });
        }

        const contact = getData.data.d;

        return {
            id: contactId,
            ...(contact.Account != null && { account: contact.Account }),
            ...(contact.FirstName != null && { firstName: contact.FirstName }),
            ...(contact.LastName != null && { lastName: contact.LastName }),
            ...(contact.Email != null && { email: contact.Email }),
            ...(contact.BusinessPhone != null && { phone: contact.BusinessPhone }),
            ...(contact.BusinessMobile != null && { businessMobile: contact.BusinessMobile })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
