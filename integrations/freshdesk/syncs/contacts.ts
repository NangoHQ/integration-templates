import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderContactSchema = z.object({
    id: z.number(),
    active: z.boolean().optional(),
    address: z.string().nullable().optional(),
    avatar: z.record(z.string(), z.unknown()).nullable().optional(),
    company_id: z.number().nullable().optional(),
    view_all_tickets: z.boolean().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    deleted: z.boolean().optional(),
    description: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    contact_type: z.string().optional(),
    job_title: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    other_emails: z.array(z.string()).nullable().optional(),
    phone: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    time_zone: z.string().nullable().optional(),
    twitter_id: z.string().nullable().optional(),
    social_handler: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    unique_external_id: z.string().nullable().optional(),
    other_companies: z.array(z.unknown()).nullable().optional(),
    devices: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const ContactSchema = z
    .object({
        id: z.string().describe('Unique identifier of the contact.'),
        active: z.boolean().optional().describe('Whether the contact has been verified.'),
        address: z.string().optional().describe('Address of the contact.'),
        avatar: z.record(z.string(), z.unknown()).optional().describe('Avatar metadata of the contact.'),
        company_id: z.number().optional().describe('ID of the primary company to which this contact belongs.'),
        view_all_tickets: z.boolean().optional().describe('Whether the contact can see all tickets associated with the primary company.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom fields for the contact.'),
        deleted: z.boolean().optional().describe('Whether the contact has been deleted.'),
        description: z.string().optional().describe('Short description of the contact.'),
        email: z.string().optional().describe('Primary email address of the contact.'),
        contact_type: z.string().optional().describe('Type of the contact, such as Visitor or Contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        name: z.string().optional().describe('Name of the contact.'),
        other_emails: z.array(z.string()).optional().describe('Additional email addresses associated with the contact.'),
        phone: z.string().optional().describe('Telephone number of the contact.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the contact.'),
        time_zone: z.string().optional().describe('Time zone in which the contact resides.'),
        twitter_id: z.string().optional().describe('Twitter handle of the contact.'),
        social_handler: z.array(z.record(z.string(), z.unknown())).optional().describe('Social media handles of the contact.'),
        unique_external_id: z.string().optional().describe('External ID of the contact.'),
        other_companies: z.array(z.unknown()).optional().describe('Additional companies associated with the contact.'),
        devices: z.array(z.record(z.string(), z.unknown())).optional().describe('Devices associated with the contact.'),
        created_at: z.string().describe('Timestamp when the contact was created, in UTC ISO 8601 format.'),
        updated_at: z.string().describe('Timestamp when the contact was last updated, in UTC ISO 8601 format.')
    })
    .describe('A Freshdesk contact representing a customer or potential customer.');

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync contacts from Freshdesk.',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter = checkpoint?.updated_after;
        let page: number | undefined = checkpoint?.page ?? 1;
        let lastProcessedUpdatedAt: string | undefined;

        const params: Record<string, string | number> = {
            per_page: 100
        };
        if (updatedAfter) {
            params['updated_since'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_contacts
            endpoint: '/api/v2/contacts',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            if (!Array.isArray(pageResults)) {
                throw new Error('Expected array response from contacts endpoint');
            }

            let pageMaxUpdatedAt: string | undefined;
            const contacts = pageResults.map((item: unknown) => {
                const parsed = ProviderContactSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact: ${parsed.error.message}`);
                }
                const r = parsed.data;
                if (pageMaxUpdatedAt === undefined || r.updated_at > pageMaxUpdatedAt) {
                    pageMaxUpdatedAt = r.updated_at;
                }
                return {
                    id: String(r.id),
                    ...(r.active !== undefined && { active: r.active }),
                    ...(r.address != null && { address: r.address }),
                    ...(r.avatar != null && { avatar: r.avatar }),
                    ...(r.company_id != null && { company_id: r.company_id }),
                    ...(r.view_all_tickets !== undefined && { view_all_tickets: r.view_all_tickets }),
                    ...(r.custom_fields != null && { custom_fields: r.custom_fields }),
                    ...(r.deleted !== undefined && { deleted: r.deleted }),
                    ...(r.description != null && { description: r.description }),
                    ...(r.email != null && { email: r.email }),
                    ...(r.contact_type != null && { contact_type: r.contact_type }),
                    ...(r.job_title != null && { job_title: r.job_title }),
                    ...(r.language != null && { language: r.language }),
                    ...(r.mobile != null && { mobile: r.mobile }),
                    ...(r.name != null && { name: r.name }),
                    ...(r.other_emails != null && { other_emails: r.other_emails }),
                    ...(r.phone != null && { phone: r.phone }),
                    ...(r.tags != null && { tags: r.tags }),
                    ...(r.time_zone != null && { time_zone: r.time_zone }),
                    ...(r.twitter_id != null && { twitter_id: r.twitter_id }),
                    ...(r.social_handler != null && { social_handler: r.social_handler }),
                    ...(r.unique_external_id != null && { unique_external_id: r.unique_external_id }),
                    ...(r.other_companies != null && { other_companies: r.other_companies }),
                    ...(r.devices != null && { devices: r.devices }),
                    created_at: r.created_at,
                    updated_at: r.updated_at
                };
            });

            if (contacts.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            if (!pageMaxUpdatedAt) {
                throw new Error('Expected pageMaxUpdatedAt to be defined after processing non-empty page');
            }

            await nango.batchSave(contacts, 'Contact');
            lastProcessedUpdatedAt = pageMaxUpdatedAt;

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? lastProcessedUpdatedAt,
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedUpdatedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
