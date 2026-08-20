import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string().describe('ISO 8601 timestamp of the last processed company updated_at'),
    page: z.number().describe('Page number to resume pagination within the same updated_since window')
});

const CompanySchema = z
    .object({
        id: z.string().describe('Unique identifier of the company'),
        name: z.string().describe('Name of the company'),
        description: z.string().optional().describe('Description of the company'),
        domains: z.array(z.string()).describe('Domains associated with the company'),
        note: z.string().optional().describe('Any specific note about the company'),
        health_score: z.string().optional().describe('The strength of the relationship with the company'),
        account_tier: z.string().optional().describe('Classification based on the value the company brings to the business'),
        renewal_date: z.string().optional().describe('Contract or relationship renewal date'),
        industry: z.string().optional().describe('Industry the company serves in'),
        created_at: z.string().describe('Company creation timestamp in UTC format'),
        updated_at: z.string().describe('Company last updated timestamp in UTC format'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom field names and values')
    })
    .describe('A Freshdesk company representing a customer organization');

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    domains: z.array(z.string()).nullable(),
    note: z.string().nullable(),
    health_score: z.string().nullable(),
    account_tier: z.string().nullable(),
    renewal_date: z.string().nullable(),
    industry: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    custom_fields: z.record(z.string(), z.unknown()).nullable()
});

const sync = createSync({
    description: 'Sync companies from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || undefined;
        let page: number | undefined = checkpoint?.page ?? 1;
        let lastProcessedUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_companies
            // Note: /api/v2/companies does not support order_by, so pages are not guaranteed
            // to be sorted by updated_at; the max updated_at seen is tracked explicitly below.
            endpoint: '/api/v2/companies',
            params: updatedAfter ? { updated_since: updatedAfter } : {},
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
            const validated = z.array(ProviderCompanySchema).safeParse(pageResults);
            if (!validated.success) {
                throw new Error(`Provider response validation failed: ${validated.error.message}`);
            }

            let pageMaxUpdatedAt: string | undefined;
            const companies = validated.data.map((record) => {
                if (pageMaxUpdatedAt === undefined || record.updated_at > pageMaxUpdatedAt) {
                    pageMaxUpdatedAt = record.updated_at;
                }
                return {
                    id: String(record.id),
                    name: record.name,
                    ...(record.description != null && { description: record.description }),
                    domains: record.domains ?? [],
                    ...(record.note != null && { note: record.note }),
                    ...(record.health_score != null && { health_score: record.health_score }),
                    ...(record.account_tier != null && { account_tier: record.account_tier }),
                    ...(record.renewal_date != null && { renewal_date: record.renewal_date }),
                    ...(record.industry != null && { industry: record.industry }),
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    ...(record.custom_fields != null && { custom_fields: record.custom_fields })
                };
            });

            if (companies.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(companies, 'Company');
            if (pageMaxUpdatedAt && (lastProcessedUpdatedAt === undefined || pageMaxUpdatedAt > lastProcessedUpdatedAt)) {
                lastProcessedUpdatedAt = pageMaxUpdatedAt;
            }

            if (page !== undefined) {
                // Preserve the window boundary that was active when this pass started so that
                // resuming at a later page re-requests the same filtered set instead of shifting it.
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page
                });
                continue;
            }

            await nango.saveCheckpoint({
                updated_after: lastProcessedUpdatedAt ?? '',
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
