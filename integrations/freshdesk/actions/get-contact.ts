import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Freshdesk contact ID. Example: 434')
    })
    .describe('Input for retrieving a Freshdesk contact by ID.');

const OtherCompanySchema = z.object({
    company_id: z.number().describe('ID of the additional company associated with the contact.'),
    view_all_tickets: z.boolean().describe('Whether the contact can view all tickets for this company.')
});

const AvatarSchema = z.object({
    avatar_url: z.string().describe('URL of the contact avatar image.'),
    content_type: z.string().describe('MIME type of the avatar file.'),
    id: z.number().describe('ID of the avatar file.'),
    name: z.string().describe('Name of the avatar file.'),
    size: z.number().describe('Size of the avatar file in bytes.'),
    created_at: z.string().describe('Timestamp when the avatar was created.'),
    updated_at: z.string().describe('Timestamp when the avatar was last updated.')
});

const DeviceSchema = z.object({
    device_type: z.string().describe('Type of device (e.g., web, android, ios).'),
    device_make: z.string().describe('Make of the device (e.g., Apple, Samsung).'),
    device_model: z.string().describe('Model of the device or browser (e.g., Chrome, Safari).'),
    app_version: z.string().describe('Version of the application or browser.'),
    os: z.string().describe('Operating system of the device (e.g., Mac OS, Windows, Android).'),
    os_version: z.string().describe('Version of the operating system.')
});

const ProviderContactSchema = z.object({
    active: z.boolean(),
    address: z.string().nullable().optional(),
    avatar: z
        .object({
            avatar_url: z.string(),
            content_type: z.string(),
            id: z.number(),
            name: z.string(),
            size: z.number(),
            created_at: z.string(),
            updated_at: z.string()
        })
        .nullable()
        .optional(),
    company_id: z.number().nullable().optional(),
    contact_type: z.string().nullable().optional(),
    created_at: z.string(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    devices: z
        .array(
            z.object({
                device_type: z.string(),
                device_make: z.string(),
                device_model: z.string(),
                app_version: z.string(),
                os: z.string(),
                os_version: z.string()
            })
        )
        .nullable()
        .optional(),
    email: z.string().nullable().optional(),
    id: z.number(),
    job_title: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    name: z.string(),
    other_companies: z
        .array(z.object({ company_id: z.number(), view_all_tickets: z.boolean() }))
        .nullable()
        .optional(),
    other_emails: z.array(z.string()).nullable().optional(),
    phone: z.string().nullable().optional(),
    social_handler: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    time_zone: z.string().nullable().optional(),
    twitter_id: z.string().nullable().optional(),
    unique_external_id: z.string().nullable().optional(),
    updated_at: z.string(),
    view_all_tickets: z.boolean().nullable().optional()
});

const OutputSchema = z
    .object({
        active: z.boolean().describe('Whether the contact is active.'),
        address: z.string().optional().describe('Address of the contact.'),
        avatar: AvatarSchema.optional().describe('Avatar metadata for the contact.'),
        company_id: z.number().optional().describe('ID of the primary company associated with the contact.'),
        contact_type: z.string().optional().describe('Type of the contact (e.g., Visitor or Contact).'),
        created_at: z.string().describe('Timestamp when the contact was created.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields set on the contact.'),
        deleted: z.boolean().optional().describe('Whether the contact has been deleted. Only present for deleted contacts.'),
        description: z.string().optional().describe('Description or notes about the contact.'),
        devices: z.array(DeviceSchema).optional().describe('Devices associated with the contact.'),
        email: z.string().optional().describe('Primary email address of the contact.'),
        id: z.number().describe('Unique identifier of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language preference of the contact.'),
        mobile: z.string().optional().describe('Mobile phone number of the contact.'),
        name: z.string().describe('Name of the contact.'),
        other_companies: z.array(OtherCompanySchema).optional().describe('Additional companies associated with the contact.'),
        other_emails: z.array(z.string()).optional().describe('Additional email addresses associated with the contact.'),
        phone: z.string().optional().describe('Phone number of the contact.'),
        social_handler: z.array(z.record(z.string(), z.unknown())).optional().describe('Social handles of the contact.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the contact.'),
        time_zone: z.string().optional().describe('Time zone in which the contact resides.'),
        twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
        unique_external_id: z.string().optional().describe('External ID of the contact.'),
        updated_at: z.string().describe('Timestamp when the contact was last updated.'),
        view_all_tickets: z.boolean().optional().describe('Whether the contact can view all tickets associated with their company.')
    })
    .describe('A Freshdesk contact resource.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single contact by ID using a GET request.
 * @pitfalls: Blank custom field values are returned as null inside custom_fields, and fields such as contact_type, social_handler, devices, and unique_external_id are only available for accounts on newer plans or upgraded after June 2022.
 */
const action = createAction({
    description: 'Retrieve a single contact from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#view_contact
            endpoint: `/api/v2/contacts/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                id: input.id
            });
        }

        const contact = ProviderContactSchema.parse(response.data);

        return {
            active: contact.active,
            ...(contact.address != null && { address: contact.address }),
            ...(contact.avatar != null && { avatar: contact.avatar }),
            ...(contact.company_id != null && { company_id: contact.company_id }),
            ...(contact.contact_type != null && { contact_type: contact.contact_type }),
            created_at: contact.created_at,
            ...(contact.custom_fields != null && { custom_fields: contact.custom_fields }),
            ...(contact.deleted != null && { deleted: contact.deleted }),
            ...(contact.description != null && { description: contact.description }),
            ...(contact.devices != null && { devices: contact.devices }),
            ...(contact.email != null && { email: contact.email }),
            id: contact.id,
            ...(contact.job_title != null && { job_title: contact.job_title }),
            ...(contact.language != null && { language: contact.language }),
            ...(contact.mobile != null && { mobile: contact.mobile }),
            name: contact.name,
            ...(contact.other_companies != null && { other_companies: contact.other_companies }),
            ...(contact.other_emails != null && { other_emails: contact.other_emails }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.social_handler != null && { social_handler: contact.social_handler }),
            ...(contact.tags != null && { tags: contact.tags }),
            ...(contact.time_zone != null && { time_zone: contact.time_zone }),
            ...(contact.twitter_id != null && { twitter_id: contact.twitter_id }),
            ...(contact.unique_external_id != null && { unique_external_id: contact.unique_external_id }),
            updated_at: contact.updated_at,
            ...(contact.view_all_tickets != null && { view_all_tickets: contact.view_all_tickets })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
