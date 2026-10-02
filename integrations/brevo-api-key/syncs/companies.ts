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

// Checkpoint fields must be plain ZodString/ZodNumber per the Nango SDK's
// ZodCheckpoint constraint; "no checkpoint yet" is represented by a null
// checkpoint rather than by absent fields.
const CheckpointSchema = z.object({
    modified_since: z.string(),
    runs_since_full: z.number().int()
});

// A modifiedSince-only crawl can never observe deletions, so every Nth run
// crawls the full company list inside a delete-tracking window instead.
const FULL_REFRESH_INTERVAL = 24;

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
    description: 'Sync Brevo CRM companies, incrementally via the modifiedSince filter with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const modifiedSince = checkpoint?.modified_since;
        const runsSinceFull = checkpoint?.runs_since_full ?? FULL_REFRESH_INTERVAL;
        // Full refresh on the first run (no checkpoint) and every FULL_REFRESH_INTERVAL
        // runs afterwards. A full crawl must not pass modifiedSince: unchanged companies
        // would be absent from the run and trackDeletesEnd would falsely mark them deleted.
        const isFullRefresh = checkpoint === null || runsSinceFull >= FULL_REFRESH_INTERVAL;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Company');
        }

        let maxModifiedAt = modifiedSince;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-all-companies
            endpoint: '/companies',
            params: {
                ...(!isFullRefresh && modifiedSince !== undefined ? { modifiedSince } : {})
            },
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

            for (const company of companies) {
                if (company.last_updated_at !== undefined && (maxModifiedAt === undefined || Date.parse(company.last_updated_at) > Date.parse(maxModifiedAt))) {
                    maxModifiedAt = company.last_updated_at;
                }
            }

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }
        }

        if (isFullRefresh) {
            // Persist progress only once the full scan completes: a mid-scan checkpoint
            // would make a crashed run look like a plain incremental run on retry and
            // silently skip delete tracking. Close the delete window before saving the
            // checkpoint so a crash in between forces another full refresh next time.
            await nango.trackDeletesEnd('Company');
            if (maxModifiedAt !== undefined) {
                await nango.saveCheckpoint({ modified_since: maxModifiedAt, runs_since_full: 0 });
            }
        } else if (maxModifiedAt !== undefined) {
            // Save the incremental checkpoint only after the crawl finishes. Advancing it
            // mid-run risks skipping later pages if the sync crashes before completion.
            await nango.saveCheckpoint({
                modified_since: maxModifiedAt,
                runs_since_full: runsSinceFull + 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
