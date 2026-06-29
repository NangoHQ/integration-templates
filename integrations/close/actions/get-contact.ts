import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "cont_123"')
});

const ContactEmailSchema = z.object({
    email: z.string(),
    type: z.string(),
    is_unsubscribed: z.boolean().optional()
});

const ContactPhoneSchema = z.object({
    phone: z.string(),
    type: z.string(),
    phone_formatted: z.string().optional(),
    country: z.string().nullable().optional(),
    outbound_sms_blocked: z.boolean().optional(),
    tz_ids: z.array(z.string()).optional()
});

const ContactUrlSchema = z.object({
    url: z.string(),
    type: z.string()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    lead_id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    display_name: z.string().optional(),
    organization_id: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    created_by: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    emails: z.array(ContactEmailSchema).optional(),
    phones: z.array(ContactPhoneSchema).optional(),
    urls: z.array(ContactUrlSchema).optional(),
    timezone: z.string().nullable().optional(),
    timezone_source: z.string().nullable().optional(),
    integration_links: z
        .array(
            z.object({
                name: z.string(),
                url: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    lead_id: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    display_name: z.string().optional(),
    organization_id: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    emails: z.array(ContactEmailSchema).optional(),
    phones: z.array(ContactPhoneSchema).optional(),
    urls: z.array(ContactUrlSchema).optional(),
    timezone: z.string().optional(),
    timezone_source: z.string().optional(),
    integration_links: z
        .array(
            z.object({
                name: z.string(),
                url: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single contact by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/resources/contacts/
            endpoint: `/v1/contact/${encodeURIComponent(input.contactId)}/`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or invalid response',
                contactId: input.contactId
            });
        }

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            ...(providerContact.lead_id != null && { lead_id: providerContact.lead_id }),
            ...(providerContact.name != null && { name: providerContact.name }),
            ...(providerContact.title != null && { title: providerContact.title }),
            ...(providerContact.display_name !== undefined && { display_name: providerContact.display_name }),
            ...(providerContact.organization_id !== undefined && { organization_id: providerContact.organization_id }),
            ...(providerContact.date_created !== undefined && { date_created: providerContact.date_created }),
            ...(providerContact.date_updated !== undefined && { date_updated: providerContact.date_updated }),
            ...(providerContact.created_by != null && { created_by: providerContact.created_by }),
            ...(providerContact.updated_by != null && { updated_by: providerContact.updated_by }),
            ...(providerContact.emails !== undefined && { emails: providerContact.emails }),
            ...(providerContact.phones !== undefined && { phones: providerContact.phones }),
            ...(providerContact.urls !== undefined && { urls: providerContact.urls }),
            ...(providerContact.timezone != null && { timezone: providerContact.timezone }),
            ...(providerContact.timezone_source != null && { timezone_source: providerContact.timezone_source }),
            ...(providerContact.integration_links !== undefined && { integration_links: providerContact.integration_links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
