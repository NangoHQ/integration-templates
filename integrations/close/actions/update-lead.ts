import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead ID. Example: "lead_123"'),
    name: z.string().optional().describe('Lead name.'),
    url: z.string().nullable().optional().describe('Lead URL. Pass null to clear.'),
    description: z.string().nullable().optional().describe('Lead description. Pass null to clear.'),
    status_id: z.string().nullable().optional().describe('Valid organization lead status ID. Pass null to clear.'),
    contacts: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                title: z.string().nullable().optional(),
                phones: z
                    .array(
                        z.object({
                            phone: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                emails: z
                    .array(
                        z.object({
                            email: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                urls: z
                    .array(
                        z.object({
                            url: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                custom: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
        .describe('Contacts to update or create.'),
    custom: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom fields. Pass null to clear.')
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status_id: z.string().nullable().optional(),
    organization_id: z.string().optional(),
    html_url: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    contacts: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                title: z.string().nullable().optional(),
                lead_id: z.string().optional(),
                phones: z
                    .array(
                        z.object({
                            phone: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                emails: z
                    .array(
                        z.object({
                            email: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                urls: z
                    .array(
                        z.object({
                            url: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                custom: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional(),
    custom: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    status_id: z.string().optional(),
    organization_id: z.string().optional(),
    html_url: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    contacts: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                title: z.string().optional(),
                lead_id: z.string().optional(),
                phones: z
                    .array(
                        z.object({
                            phone: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                emails: z
                    .array(
                        z.object({
                            email: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                urls: z
                    .array(
                        z.object({
                            url: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional(),
                custom: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional(),
    custom: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update a Close lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.url !== undefined && { url: input.url }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.status_id !== undefined && { status_id: input.status_id }),
            ...(input.contacts !== undefined && { contacts: input.contacts }),
            ...(input.custom !== undefined && { custom: input.custom })
        };

        // https://developer.close.com/
        const response = await nango.put({
            endpoint: `/v1/lead/${encodeURIComponent(input.id)}/`,
            data,
            retries: 3
        });

        const providerLead = ProviderLeadSchema.parse(response.data);

        return {
            id: providerLead.id,
            ...(providerLead.name !== undefined && { name: providerLead.name }),
            ...(providerLead.url !== undefined && providerLead.url !== null && { url: providerLead.url }),
            ...(providerLead.description !== undefined && providerLead.description !== null && { description: providerLead.description }),
            ...(providerLead.status_id !== undefined && providerLead.status_id !== null && { status_id: providerLead.status_id }),
            ...(providerLead.organization_id !== undefined && { organization_id: providerLead.organization_id }),
            ...(providerLead.html_url !== undefined && { html_url: providerLead.html_url }),
            ...(providerLead.date_created !== undefined && { date_created: providerLead.date_created }),
            ...(providerLead.date_updated !== undefined && { date_updated: providerLead.date_updated }),
            ...(providerLead.created_by !== undefined && { created_by: providerLead.created_by }),
            ...(providerLead.updated_by !== undefined && { updated_by: providerLead.updated_by }),
            ...(providerLead.contacts !== undefined && {
                contacts: providerLead.contacts.map((contact) => ({
                    ...(contact.id !== undefined && { id: contact.id }),
                    ...(contact.name !== undefined && { name: contact.name }),
                    ...(contact.title !== undefined && contact.title !== null && { title: contact.title }),
                    ...(contact.lead_id !== undefined && { lead_id: contact.lead_id }),
                    ...(contact.phones !== undefined && {
                        phones: contact.phones.map((phone) => ({
                            ...(phone.phone !== undefined && { phone: phone.phone }),
                            ...(phone.type !== undefined && { type: phone.type })
                        }))
                    }),
                    ...(contact.emails !== undefined && {
                        emails: contact.emails.map((email) => ({
                            ...(email.email !== undefined && { email: email.email }),
                            ...(email.type !== undefined && { type: email.type })
                        }))
                    }),
                    ...(contact.urls !== undefined && {
                        urls: contact.urls.map((url) => ({
                            ...(url.url !== undefined && { url: url.url }),
                            ...(url.type !== undefined && { type: url.type })
                        }))
                    }),
                    ...(contact.custom !== undefined && { custom: contact.custom })
                }))
            }),
            ...(providerLead.custom !== undefined && providerLead.custom !== null && { custom: providerLead.custom })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
