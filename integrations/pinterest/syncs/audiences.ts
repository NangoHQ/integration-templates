import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawAdAccountSchema = z.object({
    id: z.string()
});

const RawAudienceSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    audience_type: z.string().optional(),
    created_by_company_name: z.string().nullable().optional(),
    created_timestamp: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    is_nca: z.boolean().optional(),
    name: z.string().optional(),
    size: z.number().nullable().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_timestamp: z.number().nullable().optional()
});

const AudienceModelSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    audience_type: z.string().optional(),
    created_by_company_name: z.string().optional(),
    created_timestamp: z.number().optional(),
    description: z.string().optional(),
    is_nca: z.boolean().optional(),
    name: z.string().optional(),
    size: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_timestamp: z.number().optional()
});

const CheckpointSchema = z.object({
    current_ad_account_id: z.string(),
    bookmark: z.string()
});

interface AudienceRecord {
    id: string;
    ad_account_id?: string;
    audience_type?: string;
    created_by_company_name?: string;
    created_timestamp?: number;
    description?: string;
    is_nca?: boolean;
    name?: string;
    size?: number;
    status?: string;
    type?: string;
    updated_timestamp?: number;
    [key: string]: unknown;
}

const sync = createSync({
    description: 'Sync audiences.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Audience: AudienceModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let resumeAdAccountId = checkpoint?.['current_ad_account_id'] || undefined;
        let resumeBookmark = checkpoint?.['bookmark'] || undefined;

        const adAccounts: Array<{ id: string }> = [];

        const adAccountsProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(adAccountsProxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected ad accounts page to be an array');
            }

            for (const raw of page) {
                const parsed = RawAdAccountSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ad account: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        for (const adAccount of adAccounts) {
            const adAccountId = adAccount.id;

            let audienceBookmark: string | undefined;

            if (resumeAdAccountId === adAccountId) {
                audienceBookmark = resumeBookmark;
                resumeAdAccountId = undefined;
                resumeBookmark = undefined;
            }

            const audiencesProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/audiences
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/audiences`,
                params: {
                    ...(audienceBookmark && { bookmark: audienceBookmark })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        audienceBookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(audiencesProxyConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Expected audiences page to be an array');
                }

                const upserts: AudienceRecord[] = [];
                const deletions: Array<{ id: string }> = [];

                for (const raw of page) {
                    const parsed = RawAudienceSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse audience: ${parsed.error.message}`);
                    }

                    const audience = parsed.data;

                    if (audience.status === 'ARCHIVED') {
                        deletions.push({ id: audience.id });
                        continue;
                    }

                    upserts.push({
                        id: audience.id,
                        ...(audience.ad_account_id != null && { ad_account_id: audience.ad_account_id }),
                        ...(audience.audience_type != null && { audience_type: audience.audience_type }),
                        ...(audience.created_by_company_name != null && { created_by_company_name: audience.created_by_company_name }),
                        ...(audience.created_timestamp != null && { created_timestamp: audience.created_timestamp }),
                        ...(audience.description != null && { description: audience.description }),
                        ...(audience.is_nca != null && { is_nca: audience.is_nca }),
                        ...(audience.name != null && { name: audience.name }),
                        ...(audience.size != null && { size: audience.size }),
                        ...(audience.status != null && { status: audience.status }),
                        ...(audience.type != null && { type: audience.type }),
                        ...(audience.updated_timestamp != null && { updated_timestamp: audience.updated_timestamp })
                    });
                }

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'Audience');
                }

                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'Audience');
                }

                await nango.saveCheckpoint({
                    current_ad_account_id: adAccountId,
                    bookmark: audienceBookmark ?? ''
                });
            }

            await nango.saveCheckpoint({
                current_ad_account_id: '',
                bookmark: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
