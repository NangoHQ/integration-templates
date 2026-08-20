import { z } from 'zod';
import { createAction } from 'nango';

const OtherCompanyInputSchema = z.object({
    company_id: z.number().describe('ID of the additional company to associate with the contact.'),
    view_all_tickets: z.boolean().optional().describe('Whether the contact can see all tickets associated with this company.')
});

const InputSchema = z
    .object({
        name: z.string().describe('Full name of the contact. Example: "Jane Doe"'),
        email: z
            .string()
            .min(1)
            .optional()
            .describe('Primary email address of the contact. One of email, phone, mobile, twitter_id, or unique_external_id is required.'),
        phone: z.string().min(1).optional().describe('Telephone number of the contact.'),
        mobile: z.string().min(1).optional().describe('Mobile number of the contact.'),
        twitter_id: z.string().min(1).optional().describe('Twitter handle of the contact.'),
        unique_external_id: z.string().min(1).optional().describe('External ID of the contact.'),
        other_emails: z.array(z.string()).optional().describe('Additional email addresses associated with the contact.'),
        company_id: z.number().optional().describe('ID of the primary company to which this contact belongs.'),
        view_all_tickets: z.boolean().optional().describe('Set to true if the contact can see all tickets associated with the primary company.'),
        other_companies: z
            .array(OtherCompanyInputSchema)
            .optional()
            .describe('Additional companies associated with the contact. Requires the Multiple Companies feature.'),
        address: z.string().optional().describe('Address of the contact.'),
        custom_fields: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Key-value pairs of custom field names and values. Date fields must be YYYY-MM-DD.'),
        description: z.string().optional().describe('A short description of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language of the contact. Defaults to "en". Requires the Multiple Language feature.'),
        tags: z.array(z.string()).optional().describe('Tags associated with this contact.'),
        time_zone: z.string().optional().describe('Time zone of the contact. Defaults to the domain time zone. Requires the Multiple Time Zone feature.'),
        lookup_parameter: z.string().optional().describe('Used with Custom Objects. Values: "display_id" or "primary_field_value". Defaults to "display_id".'),
        social_handler: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Social handles of the contact. Up to 10 values. Valid Facebook, Instagram and Twitter handles supported.')
    })
    .describe('Payload to create a new Freshdesk contact.')
    .refine((data) => data.email || data.phone || data.mobile || data.twitter_id || data.unique_external_id, {
        message: 'At least one of email, phone, mobile, twitter_id, or unique_external_id is required.'
    });

const OtherCompanyOutputSchema = z.object({
    company_id: z.number().describe('ID of the additional company associated with the contact.'),
    view_all_tickets: z.boolean().describe('Whether the contact can see all tickets associated with this company.')
});

const ProviderContactSchema = z.object({
    // Plan-gated fields (e.g. Multiple Companies, Multiple Language/Time Zone features) may be
    // entirely absent from the response rather than null, so every field but id/name is nullish.
    active: z.boolean().nullable().optional(),
    address: z.string().nullable().optional(),
    company_id: z.number().nullable().optional(),
    view_all_tickets: z.boolean().nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    id: z.number(),
    contact_type: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    name: z.string(),
    phone: z.string().nullable().optional(),
    time_zone: z.string().nullable().optional(),
    twitter_id: z.string().nullable().optional(),
    social_handler: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    other_emails: z.array(z.string()).nullable().optional(),
    other_companies: z.array(OtherCompanyOutputSchema).nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    tags: z.array(z.string()).nullable().optional(),
    avatar: z.unknown().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    unique_external_id: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created contact.'),
        name: z.string().describe('Full name of the contact.'),
        email: z.string().optional().describe('Primary email address of the contact.'),
        phone: z.string().optional().describe('Telephone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
        unique_external_id: z.string().optional().describe('External ID of the contact.'),
        other_emails: z.array(z.string()).optional().describe('Additional emails associated with the contact.'),
        company_id: z.number().optional().describe('ID of the primary company the contact belongs to.'),
        view_all_tickets: z.boolean().optional().describe('Whether the contact can see all tickets associated with the primary company.'),
        other_companies: z.array(OtherCompanyOutputSchema).optional().describe('Additional companies associated with the contact.'),
        address: z.string().optional().describe('Address of the contact.'),
        description: z.string().optional().describe('A short description of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language of the contact.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the contact.'),
        time_zone: z.string().optional().describe('Time zone of the contact.'),
        active: z.boolean().optional().describe('Whether the contact has been verified.'),
        deleted: z.boolean().optional().describe('Whether the contact has been deleted.'),
        contact_type: z.string().optional().describe('Type of the contact (Visitor / Contact).'),
        created_at: z.string().describe('Contact creation timestamp in UTC. Example: "2015-08-28T09:08:16Z"'),
        updated_at: z.string().describe('Contact last updated timestamp in UTC. Example: "2015-08-28T09:08:16Z"'),
        social_handler: z.array(z.record(z.string(), z.unknown())).optional().describe('Social handles of the contact.'),
        avatar: z.unknown().optional().describe('Avatar object of the contact.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom field names and values.')
    })
    .describe('The newly created Freshdesk contact.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact record in Freshdesk via POST /api/v2/contacts.
 * @pitfalls: Duplicate email, twitter_id, or unique_external_id returns 409 Conflict. Fields like other_companies, language, time_zone, and lookup_parameter require specific plan features and will fail if unavailable.
 */
const action = createAction({
    description: 'Create a contact in Freshdesk.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            name: input.name
        };

        if (input.email !== undefined) {
            payload['email'] = input.email;
        }
        if (input.phone !== undefined) {
            payload['phone'] = input.phone;
        }
        if (input.mobile !== undefined) {
            payload['mobile'] = input.mobile;
        }
        if (input.twitter_id !== undefined) {
            payload['twitter_id'] = input.twitter_id;
        }
        if (input.unique_external_id !== undefined) {
            payload['unique_external_id'] = input.unique_external_id;
        }
        if (input.other_emails !== undefined) {
            payload['other_emails'] = input.other_emails;
        }
        if (input.company_id !== undefined) {
            payload['company_id'] = input.company_id;
        }
        if (input.view_all_tickets !== undefined) {
            payload['view_all_tickets'] = input.view_all_tickets;
        }
        if (input.other_companies !== undefined) {
            payload['other_companies'] = input.other_companies;
        }
        if (input.address !== undefined) {
            payload['address'] = input.address;
        }
        if (input.custom_fields !== undefined) {
            payload['custom_fields'] = input.custom_fields;
        }
        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.job_title !== undefined) {
            payload['job_title'] = input.job_title;
        }
        if (input.language !== undefined) {
            payload['language'] = input.language;
        }
        if (input.tags !== undefined) {
            payload['tags'] = input.tags;
        }
        if (input.time_zone !== undefined) {
            payload['time_zone'] = input.time_zone;
        }
        if (input.lookup_parameter !== undefined) {
            payload['lookup_parameter'] = input.lookup_parameter;
        }
        if (input.social_handler !== undefined) {
            payload['social_handler'] = input.social_handler;
        }

        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_contact
            endpoint: '/api/v2/contacts',
            data: payload,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- POST create is non-idempotent; retries must be 0
            retries: 0
        });

        const providerContact = ProviderContactSchema.parse(response.data);

        return {
            id: providerContact.id,
            name: providerContact.name,
            email: providerContact.email ?? undefined,
            phone: providerContact.phone ?? undefined,
            mobile: providerContact.mobile ?? undefined,
            twitter_id: providerContact.twitter_id ?? undefined,
            unique_external_id: providerContact.unique_external_id ?? undefined,
            other_emails: providerContact.other_emails ?? undefined,
            company_id: providerContact.company_id ?? undefined,
            view_all_tickets: providerContact.view_all_tickets ?? undefined,
            other_companies: providerContact.other_companies ?? undefined,
            address: providerContact.address ?? undefined,
            description: providerContact.description ?? undefined,
            job_title: providerContact.job_title ?? undefined,
            language: providerContact.language ?? undefined,
            tags: providerContact.tags ?? undefined,
            time_zone: providerContact.time_zone ?? undefined,
            active: providerContact.active ?? undefined,
            deleted: providerContact.deleted ?? undefined,
            contact_type: providerContact.contact_type ?? undefined,
            created_at: providerContact.created_at,
            updated_at: providerContact.updated_at,
            social_handler: providerContact.social_handler ?? undefined,
            avatar: providerContact.avatar ?? undefined,
            custom_fields: providerContact.custom_fields ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
