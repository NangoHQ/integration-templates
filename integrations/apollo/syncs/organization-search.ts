import { createSync } from 'nango';
import { z } from 'zod';

// Apollo Mixed Companies Search API response types
// https://docs.apollo.io/reference/mixedcompanies_search

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    website_url: z.string().optional(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    annual_revenue: z.number().optional(),
    estimated_num_employees: z.number().optional(),
    phone: z.string().optional(),
    linkedin_url: z.string().optional(),
    twitter_url: z.string().optional(),
    facebook_url: z.string().optional(),
    primary_geo: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    updated_at: z.string().optional()
});

const ApiOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    website_url: z.string().nullish(),
    domain: z.string().nullish(),
    industry: z.string().nullish(),
    annual_revenue: z.number().nullish(),
    estimated_num_employees: z.number().nullish(),
    phone: z.string().nullish(),
    linkedin_url: z.string().nullish(),
    twitter_url: z.string().nullish(),
    facebook_url: z.string().nullish(),
    primary_geo: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    updated_at: z.string().nullish()
});

const ResponseSchema = z.object({
    organizations: z.array(ApiOrganizationSchema).optional(),
    pagination: z
        .object({
            page: z.number().optional(),
            total_pages: z.number().optional()
        })
        .optional()
});

// Metadata schema for filters passed by user
const MetadataSchema = z.object({
    q_keywords: z.string().optional(),
    organization_ids: z.array(z.string()).optional(),
    page: z.number().int().positive().optional()
});

type MetadataType = z.infer<typeof MetadataSchema>;

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync organizations matching saved Apollo filters',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/organization-search'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        let metadata: MetadataType = {};

        try {
            const rawMetadata = (await nango.getMetadata<MetadataType>()) ?? {};
            const parsedMetadata = MetadataSchema.safeParse(rawMetadata);
            if (parsedMetadata.success) {
                metadata = parsedMetadata.data;
            } else {
                await nango.log('Warning: Metadata schema validation failed, using defaults', { error: parsedMetadata.error });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }

        const startPage = metadata.page ?? 1;
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const currentPage = checkpoint.success ? checkpoint.data.page : startPage;

        // Apollo organization search only exposes page-based pagination for the current
        // filter set. We persist the next page to continue the crawl across runs.
        const response = await nango.post({
            endpoint: '/v1/mixed_companies/search',
            data: {
                ...(metadata.q_keywords !== undefined && { q_keywords: metadata.q_keywords }),
                ...(metadata.organization_ids !== undefined && { organization_ids: metadata.organization_ids }),
                page: currentPage,
                per_page: 100
            },
            retries: 3
        });

        const data = ResponseSchema.parse(response.data);
        const organizations = data.organizations ?? [];
        const normalizedOrganizations = organizations.map((org) => ({
            id: org.id,
            ...(org.name != null && { name: org.name }),
            ...(org.website_url != null && { website_url: org.website_url }),
            ...(org.domain != null && { domain: org.domain }),
            ...(org.industry != null && { industry: org.industry }),
            ...(org.annual_revenue != null && { annual_revenue: org.annual_revenue }),
            ...(org.estimated_num_employees != null && {
                estimated_num_employees: org.estimated_num_employees
            }),
            ...(org.phone != null && { phone: org.phone }),
            ...(org.linkedin_url != null && { linkedin_url: org.linkedin_url }),
            ...(org.twitter_url != null && { twitter_url: org.twitter_url }),
            ...(org.facebook_url != null && { facebook_url: org.facebook_url }),
            ...(org.primary_geo != null && { primary_geo: org.primary_geo }),
            ...(org.city != null && { city: org.city }),
            ...(org.state != null && { state: org.state }),
            ...(org.country != null && { country: org.country }),
            ...(org.updated_at != null && { updated_at: org.updated_at })
        }));

        if (normalizedOrganizations.length > 0) {
            await nango.batchSave(normalizedOrganizations, 'Organization');
        }

        const responsePage = typeof data.pagination?.page === 'number' ? data.pagination.page : currentPage;
        const totalPages = typeof data.pagination?.total_pages === 'number' ? data.pagination.total_pages : responsePage;
        const nextPage = responsePage < totalPages ? responsePage + 1 : startPage;

        await nango.saveCheckpoint({ page: nextPage });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
