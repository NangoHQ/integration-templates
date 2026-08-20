import { z } from 'zod';
import { createAction } from 'nango';

const OtherCompanySchema = z.object({
    company_id: z.number().describe('ID of the additional company.'),
    view_all_tickets: z.boolean().describe('Whether the contact can see all tickets for this company.')
});

const InputSchema = z
    .object({
        id: z.number().describe('The unique ID of the contact to update. Example: 432'),
        name: z.string().optional().describe('Name of the contact.'),
        email: z.string().optional().describe('Primary email address of the contact.'),
        phone: z.string().optional().describe('Telephone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
        unique_external_id: z.string().optional().describe('External ID of the contact.'),
        other_emails: z.array(z.string()).optional().describe('Additional emails associated with the contact.'),
        company_id: z.number().optional().describe('ID of the primary company to which this contact belongs.'),
        view_all_tickets: z.boolean().optional().describe('Set to true if the contact can see all tickets associated with their company.'),
        other_companies: z
            .array(OtherCompanySchema)
            .optional()
            .describe('Additional companies associated with the contact. Requires Multiple Companies feature.'),
        address: z.string().optional().describe('Address of the contact.'),
        description: z.string().optional().describe('A small description of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language of the contact. Default is "en".'),
        tags: z.array(z.string()).optional().describe('Tags associated with this contact.'),
        time_zone: z.string().optional().describe('Time zone of the contact.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Key-value pairs of custom fields. Only dates in YYYY-MM-DD format are accepted for custom date fields.'),
        social_handler: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Social handles of the contact. Up to 10 values. Valid Facebook, Instagram and Twitter handles supported.'),
        lookup_parameter: z.string().optional().describe('Custom Objects lookup parameter. Either "display_id" or "primary_field_value".')
    })
    .describe('Input to update a Freshdesk contact.');

const ProviderContactSchema = z.object({
    active: z.boolean(),
    address: z.string().nullable(),
    company_id: z.number().nullable(),
    view_all_tickets: z.boolean(),
    deleted: z.boolean().optional(),
    description: z.string().nullable(),
    email: z.string(),
    id: z.number(),
    contact_type: z.string(),
    job_title: z.string().nullable(),
    language: z.string(),
    mobile: z.string().nullable(),
    name: z.string(),
    phone: z.string().nullable(),
    time_zone: z.string().nullable(),
    twitter_id: z.string().nullable(),
    social_handler: z.array(z.record(z.string(), z.unknown())).optional(),
    other_emails: z.array(z.string()),
    other_companies: z.array(OtherCompanySchema),
    created_at: z.string(),
    updated_at: z.string(),
    tags: z.array(z.string()),
    avatar: z.unknown().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    unique_external_id: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the contact.'),
        name: z.string().describe('Name of the contact.'),
        email: z.string().describe('Primary email address of the contact.'),
        phone: z.string().optional().describe('Telephone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
        unique_external_id: z.string().optional().describe('External ID of the contact.'),
        other_emails: z.array(z.string()).describe('Additional emails associated with the contact.'),
        company_id: z.number().optional().describe('ID of the primary company to which this contact belongs.'),
        view_all_tickets: z.boolean().describe('Whether the contact can see all tickets associated with their company.'),
        other_companies: z.array(OtherCompanySchema).describe('Additional companies associated with the contact.'),
        address: z.string().optional().describe('Address of the contact.'),
        description: z.string().optional().describe('A small description of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().describe('Language of the contact.'),
        tags: z.array(z.string()).describe('Tags associated with this contact.'),
        time_zone: z.string().optional().describe('Time zone of the contact.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom fields.'),
        active: z.boolean().describe('Whether the contact is active.'),
        deleted: z.boolean().optional().describe('Whether the contact has been deleted.'),
        contact_type: z.string().describe('Type of the contact.'),
        created_at: z.string().describe('Contact creation timestamp in UTC.'),
        updated_at: z.string().describe('Contact last updated timestamp in UTC.'),
        avatar: z.unknown().optional().describe('Avatar of the contact.'),
        social_handler: z.array(z.record(z.string(), z.unknown())).optional().describe('Social handles of the contact.')
    })
    .describe('The updated Freshdesk contact.');

/**
 * @tags: [write]
 * @tagReason: Updates contact properties on the provider.
 * @pitfalls: Updating a deleted or blocked contact returns 405 Method Not Allowed. Duplicate email, twitter_id, or unique_external_id values return 409.
 */
const action = createAction({
    description: 'Update a contact in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) data['name'] = input.name;
        if (input.email !== undefined) data['email'] = input.email;
        if (input.phone !== undefined) data['phone'] = input.phone;
        if (input.mobile !== undefined) data['mobile'] = input.mobile;
        if (input.twitter_id !== undefined) data['twitter_id'] = input.twitter_id;
        if (input.unique_external_id !== undefined) data['unique_external_id'] = input.unique_external_id;
        if (input.other_emails !== undefined) data['other_emails'] = input.other_emails;
        if (input.company_id !== undefined) data['company_id'] = input.company_id;
        if (input.view_all_tickets !== undefined) data['view_all_tickets'] = input.view_all_tickets;
        if (input.other_companies !== undefined) data['other_companies'] = input.other_companies;
        if (input.address !== undefined) data['address'] = input.address;
        if (input.description !== undefined) data['description'] = input.description;
        if (input.job_title !== undefined) data['job_title'] = input.job_title;
        if (input.language !== undefined) data['language'] = input.language;
        if (input.tags !== undefined) data['tags'] = input.tags;
        if (input.time_zone !== undefined) data['time_zone'] = input.time_zone;
        if (input.custom_fields !== undefined) data['custom_fields'] = input.custom_fields;
        if (input.social_handler !== undefined) data['social_handler'] = input.social_handler;
        if (input.lookup_parameter !== undefined) data['lookup_parameter'] = input.lookup_parameter;

        const response = await nango.patch({
            // https://developers.freshdesk.com/api/#update_contact
            endpoint: `/api/v2/contacts/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 1
        });

        const contact = ProviderContactSchema.parse(response.data);

        return {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.mobile != null && { mobile: contact.mobile }),
            ...(contact.twitter_id != null && { twitter_id: contact.twitter_id }),
            ...(contact.unique_external_id != null && { unique_external_id: contact.unique_external_id }),
            other_emails: contact.other_emails,
            ...(contact.company_id != null && { company_id: contact.company_id }),
            view_all_tickets: contact.view_all_tickets,
            other_companies: contact.other_companies,
            ...(contact.address != null && { address: contact.address }),
            ...(contact.description != null && { description: contact.description }),
            ...(contact.job_title != null && { job_title: contact.job_title }),
            language: contact.language,
            tags: contact.tags,
            ...(contact.time_zone != null && { time_zone: contact.time_zone }),
            ...(contact.custom_fields !== undefined && { custom_fields: contact.custom_fields }),
            active: contact.active,
            ...(contact.deleted !== undefined && { deleted: contact.deleted }),
            contact_type: contact.contact_type,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
            ...(contact.avatar != null && { avatar: contact.avatar }),
            ...(contact.social_handler !== undefined && { social_handler: contact.social_handler })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
