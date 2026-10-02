import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Internal schema for the company object returned by GET /companies.
 * Standard CRM attributes live under `attributes`; accounts can also define
 * custom attributes, so only the standard set is mapped into the public model.
 */
const BrevoCompanySchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional(),
            domain: z.string().optional(),
            industry: z.string().optional(),
            website: z.string().optional(),
            linkedin: z.string().optional(),
            phone_number: z.union([z.string(), z.number()]).optional(),
            revenue: z.number().optional(),
            number_of_employees: z.number().optional(),
            number_of_contacts: z.number().optional(),
            number_of_activities: z.number().optional(),
            owner: z.string().optional(),
            owner_assign_date: z.string().optional(),
            created_at: z.string().optional(),
            last_updated_at: z.string().optional()
        })
        .optional(),
    linkedContactsIds: z.array(z.number()).optional(),
    linkedDealsIds: z.array(z.string()).optional(),
    createdBy: z.string().optional()
});

const CompanySchema = z
    .object({
        id: z.string().describe('Unique Brevo company ID (24-character hex string). Example: "629475917295261d9b1f4403"'),
        name: z.string().optional().describe('Company name. Example: "Acme Inc."'),
        domain: z.string().optional().describe('Company domain. Example: "acme.com"'),
        industry: z.string().optional().describe('Industry of the company. Example: "Software"'),
        website: z.string().optional().describe('Website URL of the company. Example: "https://acme.com"'),
        linkedin: z.string().optional().describe('LinkedIn URL of the company. Example: "https://linkedin.com/company/acme"'),
        phone_number: z
            .union([z.string(), z.number()])
            .optional()
            .describe(
                'Phone number of the company. Returned as a string or a number depending on the account attribute configuration. Example: "+14155552671"'
            ),
        revenue: z.number().optional().describe('Annual revenue of the company. Example: 1000000'),
        number_of_employees: z.number().optional().describe('Number of employees of the company. Example: 42'),
        number_of_contacts: z.number().optional().describe('Number of contacts linked to the company. Example: 3'),
        number_of_activities: z.number().optional().describe('Number of CRM activities linked to the company. Example: 5'),
        owner: z.string().optional().describe('User ID of the company owner. Example: "6abbf6c2ce2b3e2509040bd6"'),
        owner_assign_date: z.string().optional().describe('ISO 8601 timestamp of when the owner was assigned. Example: "2026-10-01T23:05:52.577Z"'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the company was created. Example: "2026-10-01T23:05:52.577Z"'),
        last_updated_at: z.string().optional().describe('ISO 8601 timestamp of when the company was last updated. Example: "2026-10-01T23:05:52.577Z"'),
        linkedContactsIds: z.array(z.number()).optional().describe('Numeric IDs of the contacts linked to this company. Example: [1, 2, 3]'),
        linkedDealsIds: z
            .array(z.string())
            .optional()
            .describe('IDs of the deals linked to this company (24-character hex strings). Example: ["61a5ce58c5d4795761045990"]'),
        createdBy: z.string().optional().describe('User ID that created the company. Example: "6abbf6c2ce2b3e2509040bd6"')
    })
    .describe('Brevo CRM company record');

type Company = z.infer<typeof CompanySchema>;

function toCompany(raw: z.infer<typeof BrevoCompanySchema>): Company {
    const attributes = raw.attributes ?? {};

    return {
        id: raw.id,
        ...(attributes.name !== undefined && { name: attributes.name }),
        ...(attributes.domain !== undefined && { domain: attributes.domain }),
        ...(attributes.industry !== undefined && { industry: attributes.industry }),
        ...(attributes.website !== undefined && { website: attributes.website }),
        ...(attributes.linkedin !== undefined && { linkedin: attributes.linkedin }),
        ...(attributes.phone_number !== undefined && { phone_number: attributes.phone_number }),
        ...(attributes.revenue !== undefined && { revenue: attributes.revenue }),
        ...(attributes.number_of_employees !== undefined && { number_of_employees: attributes.number_of_employees }),
        ...(attributes.number_of_contacts !== undefined && { number_of_contacts: attributes.number_of_contacts }),
        ...(attributes.number_of_activities !== undefined && { number_of_activities: attributes.number_of_activities }),
        ...(attributes.owner !== undefined && { owner: attributes.owner }),
        ...(attributes.owner_assign_date !== undefined && { owner_assign_date: attributes.owner_assign_date }),
        ...(attributes.created_at !== undefined && { created_at: attributes.created_at }),
        ...(attributes.last_updated_at !== undefined && { last_updated_at: attributes.last_updated_at }),
        ...(raw.linkedContactsIds !== undefined && { linkedContactsIds: raw.linkedContactsIds }),
        ...(raw.linkedDealsIds !== undefined && { linkedDealsIds: raw.linkedDealsIds }),
        ...(raw.createdBy !== undefined && { createdBy: raw.createdBy })
    };
}

const sync = createSync({
    description:
        'Full refresh of Brevo CRM companies. GET /companies has no confirmed incremental filter, so every run re-fetches all companies and removes records that no longer exist.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        // Full refresh: GET /companies supports exact-match filters[...] but no
        // confirmed modifiedSince/incremental filter, so deletion detection via
        // trackDeletesStart/trackDeletesEnd around a complete crawl from page 1.
        await nango.trackDeletesStart('Company');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-all-companies
            endpoint: '/companies',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            // Parse failures throw on purpose: skipping a record inside a
            // delete-tracked crawl would mark it as deleted.
            const companies = page.map((item) => toCompany(BrevoCompanySchema.parse(item)));

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }
        }

        await nango.trackDeletesEnd('Company');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
