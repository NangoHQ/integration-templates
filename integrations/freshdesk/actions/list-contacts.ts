import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of contacts to return per page. Maximum is 100.'),
        email: z.string().optional().describe('Filter by primary email address of the contact.'),
        mobile: z.string().optional().describe('Filter by mobile number of the contact.'),
        phone: z.string().optional().describe('Filter by phone number of the contact.'),
        company_id: z.number().int().optional().describe('Filter by primary company ID.'),
        state: z.enum(['blocked', 'deleted', 'unverified', 'verified']).optional().describe('Filter by contact state.'),
        contact_type: z.enum(['contact', 'visitor']).optional().describe('Filter by contact type.'),
        updated_since: z.string().optional().describe('Filter contacts updated after this ISO 8601 timestamp.')
    })
    .describe('Input for listing Freshdesk contacts with optional filters and pagination.');

const ProviderContactSchema = z.object({
    id: z.number(),
    active: z.boolean().nullish(),
    address: z.string().nullish(),
    avatar: z.record(z.string(), z.unknown()).nullish(),
    company_id: z.number().nullish(),
    view_all_tickets: z.boolean().nullish(),
    custom_fields: z.record(z.string(), z.unknown()).nullish(),
    deleted: z.boolean().nullish(),
    description: z.string().nullish(),
    email: z.string().nullish(),
    contact_type: z.string().nullish(),
    job_title: z.string().nullish(),
    language: z.string().nullish(),
    mobile: z.string().nullish(),
    name: z.string().nullish(),
    other_emails: z.array(z.string()).nullish(),
    phone: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    time_zone: z.string().nullish(),
    twitter_id: z.string().nullish(),
    social_handler: z.array(z.record(z.string(), z.unknown())).nullish(),
    unique_external_id: z.string().nullish(),
    other_companies: z.array(z.record(z.string(), z.unknown())).nullish(),
    devices: z.array(z.record(z.string(), z.unknown())).nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const ContactSchema = z.object({
    id: z.number().describe('Unique ID of the contact.'),
    name: z.string().optional().describe('Name of the contact.'),
    email: z.string().optional().describe('Primary email address of the contact.'),
    other_emails: z.array(z.string()).optional().describe('Additional emails associated with the contact.'),
    phone: z.string().optional().describe('Telephone number of the contact.'),
    mobile: z.string().optional().describe('Mobile number of the contact.'),
    address: z.string().optional().describe('Address of the contact.'),
    job_title: z.string().optional().describe('Job title of the contact.'),
    language: z.string().optional().describe('Language of the contact.'),
    time_zone: z.string().optional().describe('Time zone in which the contact resides.'),
    description: z.string().optional().describe('A short description of the contact.'),
    company_id: z.number().optional().describe('ID of the primary company to which this contact belongs.'),
    other_companies: z.array(z.record(z.string(), z.unknown())).optional().describe('Additional companies associated with the contact.'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom fields.'),
    tags: z.array(z.string()).optional().describe('Tags associated with this contact.'),
    twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
    unique_external_id: z.string().optional().describe('External ID of the contact.'),
    active: z.boolean().optional().describe('Set to true if the contact has been verified.'),
    deleted: z.boolean().optional().describe('Set to true if the contact has been deleted.'),
    contact_type: z.string().optional().describe('Type of the contact (Visitor / Contact).'),
    social_handler: z.array(z.record(z.string(), z.unknown())).optional().describe('Social handles of the contact.'),
    devices: z.array(z.record(z.string(), z.unknown())).optional().describe('Devices associated with the contact.'),
    avatar: z.record(z.string(), z.unknown()).optional().describe('Avatar of the contact.'),
    view_all_tickets: z.boolean().optional().describe('Set to true if the contact can see all tickets associated with the company to which they belong.'),
    created_at: z.string().optional().describe('Contact creation timestamp (ISO 8601).'),
    updated_at: z.string().optional().describe('Contact updated timestamp (ISO 8601).')
});

const OutputSchema = z
    .object({
        items: z.array(ContactSchema).describe('List of contacts matching the query.'),
        next_page: z.string().optional().describe('Page number for the next page of results, if available.')
    })
    .describe('Output containing a list of Freshdesk contacts and an optional next page cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads contact records from the Freshdesk provider API.
 * @pitfalls: Email filters return at most one contact because email is unique. By default only unblocked and undeleted contacts are returned, and the deleted field is only present for deleted contacts.
 */
const action = createAction({
    description: 'List contacts from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number string'
            });
        }

        const params: Record<string, string | number> = {
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.mobile !== undefined) {
            params['mobile'] = input.mobile;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.company_id !== undefined) {
            params['company_id'] = input.company_id;
        }
        if (input.state !== undefined) {
            params['state'] = input.state;
        }
        if (input.contact_type !== undefined) {
            params['contact_type'] = input.contact_type;
        }
        if (input.updated_since !== undefined) {
            params['updated_since'] = input.updated_since;
        }

        // https://developers.freshdesk.com/api/#list_all_contacts
        const response = await nango.get({
            endpoint: '/api/v2/contacts',
            params,
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from Freshdesk contacts API.'
            });
        }

        const providerContacts = z.array(ProviderContactSchema).parse(response.data);

        const items = providerContacts.map((contact) => {
            return {
                id: contact.id,
                ...(contact.name != null && { name: contact.name }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.other_emails != null && { other_emails: contact.other_emails }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.mobile != null && { mobile: contact.mobile }),
                ...(contact.address != null && { address: contact.address }),
                ...(contact.job_title != null && { job_title: contact.job_title }),
                ...(contact.language != null && { language: contact.language }),
                ...(contact.time_zone != null && { time_zone: contact.time_zone }),
                ...(contact.description != null && { description: contact.description }),
                ...(contact.company_id != null && { company_id: contact.company_id }),
                ...(contact.other_companies != null && { other_companies: contact.other_companies }),
                ...(contact.custom_fields != null && { custom_fields: contact.custom_fields }),
                ...(contact.tags != null && { tags: contact.tags }),
                ...(contact.twitter_id != null && { twitter_id: contact.twitter_id }),
                ...(contact.unique_external_id != null && { unique_external_id: contact.unique_external_id }),
                ...(contact.active != null && { active: contact.active }),
                ...(contact.deleted != null && { deleted: contact.deleted }),
                ...(contact.contact_type != null && { contact_type: contact.contact_type }),
                ...(contact.social_handler != null && { social_handler: contact.social_handler }),
                ...(contact.devices != null && { devices: contact.devices }),
                ...(contact.avatar != null && { avatar: contact.avatar }),
                ...(contact.view_all_tickets != null && { view_all_tickets: contact.view_all_tickets }),
                ...(contact.created_at != null && { created_at: contact.created_at }),
                ...(contact.updated_at != null && { updated_at: contact.updated_at })
            };
        });

        let next_page: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string' && linkHeader.includes('rel="next"')) {
            const match = linkHeader.match(/page=(\d+)/);
            if (match && match[1]) {
                next_page = match[1];
            }
        }

        return {
            items,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
