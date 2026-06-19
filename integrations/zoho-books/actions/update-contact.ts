import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const InputSchema = z.object({
    contact_id: z.string().describe('The ID of the contact to update. Example: "260815000000097001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional(),
    billing_address: z
        .object({
            attention: z.string().optional(),
            address: z.string().optional(),
            street2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    shipping_address: z
        .object({
            attention: z.string().optional(),
            address: z.string().optional(),
            street2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            country: z.string().optional(),
            phone: z.string().optional()
        })
        .optional()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional()
});

const OutputSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional()
});

const action = createAction({
    description: 'Update a contact in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.contacts.ALL', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.contact_name !== undefined) {
            payload['contact_name'] = input.contact_name;
        }
        if (input.company_name !== undefined) {
            payload['company_name'] = input.company_name;
        }
        if (input.contact_type !== undefined) {
            payload['contact_type'] = input.contact_type;
        }
        if (input.website !== undefined) {
            payload['website'] = input.website;
        }
        if (input.phone !== undefined) {
            payload['phone'] = input.phone;
        }
        if (input.email !== undefined) {
            payload['email'] = input.email;
        }
        if (input.notes !== undefined) {
            payload['notes'] = input.notes;
        }
        if (input.billing_address !== undefined) {
            payload['billing_address'] = input.billing_address;
        }
        if (input.shipping_address !== undefined) {
            payload['shipping_address'] = input.shipping_address;
        }

        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        // https://www.zoho.com/books/api/v3/contacts/#update-a-contact
        const response = await nango.put({
            endpoint: `/books/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                organization_id: organizationId
            },
            data: payload,
            retries: 10
        });

        const raw = response.data;
        if (!isRecord(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books.'
            });
        }

        const contactData = raw['contact'];
        if (!isRecord(contactData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books: missing contact data.'
            });
        }

        const providerContact = ProviderContactSchema.parse(contactData);

        return {
            contact_id: providerContact.contact_id,
            ...(providerContact.contact_name !== undefined && { contact_name: providerContact.contact_name }),
            ...(providerContact.company_name !== undefined && { company_name: providerContact.company_name }),
            ...(providerContact.contact_type !== undefined && { contact_type: providerContact.contact_type }),
            ...(providerContact.website !== undefined && { website: providerContact.website }),
            ...(providerContact.phone !== undefined && { phone: providerContact.phone }),
            ...(providerContact.email !== undefined && { email: providerContact.email }),
            ...(providerContact.status !== undefined && { status: providerContact.status }),
            ...(providerContact.notes !== undefined && { notes: providerContact.notes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
