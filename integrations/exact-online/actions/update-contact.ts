import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Contact ID. Example: "da03b498-41d7-481c-b598-4364d09c907c"'),
    firstName: z.string().optional().nullable().describe('First name of the contact.'),
    lastName: z.string().optional().nullable().describe('Last name of the contact.'),
    email: z.string().optional().nullable().describe('Email address of the contact.'),
    phone: z.string().optional().nullable().describe('Phone number of the contact.'),
    mobile: z.string().optional().nullable().describe('Mobile number of the contact.'),
    title: z.string().optional().nullable().describe('Title of the contact.')
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    title: z.string().optional()
});

const action = createAction({
    description: 'Update an existing contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.contacts'],
    endpoint: {
        path: '/actions/update-contact',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapiply-divisions
            endpoint: '/api/v1/current/Me',
            retries: 3
        };
        const meResponse = await nango.get(meConfig);

        const meData = z
            .object({
                d: z.object({
                    results: z.array(
                        z.object({
                            CurrentDivision: z.number()
                        })
                    )
                })
            })
            .parse(meResponse.data);

        const meResult = meData.d.results[0];
        if (!meResult) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Me endpoint returned no results.'
            });
        }

        const division = meResult.CurrentDivision;

        const body: Record<string, unknown> = {};
        if (input.firstName !== undefined) {
            body['FirstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            body['LastName'] = input.lastName;
        }
        if (input.email !== undefined) {
            body['Email'] = input.email;
        }
        if (input.phone !== undefined) {
            body['Phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            body['Mobile'] = input.mobile;
        }
        if (input.title !== undefined) {
            body['Title'] = input.title;
        }

        const updateConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapiply-contacts
            endpoint: `/api/v1/${division}/crm/Contacts(guid'${encodeURIComponent(input.id)}')`,
            data: body,
            retries: 1
        };
        await nango.put(updateConfig);

        const getConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapiply-contacts
            endpoint: `/api/v1/${division}/crm/Contacts(guid'${encodeURIComponent(input.id)}')`,
            retries: 3
        };
        const response = await nango.get(getConfig);

        const contact = z
            .object({
                d: z.object({
                    ID: z.string(),
                    FirstName: z.string().nullable().optional(),
                    LastName: z.string().nullable().optional(),
                    Email: z.string().nullable().optional(),
                    Phone: z.string().nullable().optional(),
                    Mobile: z.string().nullable().optional(),
                    Title: z.string().nullable().optional()
                })
            })
            .parse(response.data);

        return {
            id: contact.d.ID,
            ...(contact.d.FirstName != null && { firstName: contact.d.FirstName }),
            ...(contact.d.LastName != null && { lastName: contact.d.LastName }),
            ...(contact.d.Email != null && { email: contact.d.Email }),
            ...(contact.d.Phone != null && { phone: contact.d.Phone }),
            ...(contact.d.Mobile != null && { mobile: contact.d.Mobile }),
            ...(contact.d.Title != null && { title: contact.d.Title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
