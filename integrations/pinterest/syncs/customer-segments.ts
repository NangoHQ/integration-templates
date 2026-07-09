import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSegmentSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().optional(),
    audience_ids: z.array(z.string()).optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    status: z.string().optional()
});

const AdAccountItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
    owner: z
        .object({
            id: z.string().optional()
        })
        .optional(),
    permissions: z.array(z.string()).optional(),
    time_zone: z.string().optional(),
    created_time: z.number().nullable().optional(),
    updated_time: z.number().nullable().optional()
});

const CustomerSegmentItemSchema = z.object({
    ad_account_id: z.string().optional(),
    audience_ids: z.array(z.string()).optional(),
    created_time: z.number().optional(),
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    updated_time: z.number().optional()
});

const CheckpointSchema = z.object({
    ad_account_id: z.string(),
    bookmark: z.string()
});

const sync = createSync({
    description: 'Sync customer segments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CustomerSegment: CustomerSegmentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { ad_account_id: '', bookmark: '' });
        const checkpoint = checkpointResult.success ? checkpointResult.data : { ad_account_id: '', bookmark: '' };

        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts/operation/ad_accounts/list
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

        await nango.trackDeletesStart('CustomerSegment');

        const adAccounts: Array<{ id: string }> = [];

        for await (const page of nango.paginate(adAccountProxyConfig)) {
            const parsed = z.array(AdAccountItemSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse ad accounts page: ${parsed.error.message}`);
            }

            for (const account of parsed.data) {
                adAccounts.push(account);
            }
        }

        // Sort by a stable key so checkpoint resume position is consistent even if the
        // provider returns ad accounts in a different order across runs.
        adAccounts.sort((a, b) => a.id.localeCompare(b.id));

        // Customer segments are archived via status rather than hard-deleted, so a saved
        // bookmark is safe to use as a resumable checkpoint between failed runs.
        let startIndex = 0;
        let resumeBookmark: string | undefined;
        if (checkpoint.ad_account_id !== '') {
            const foundIndex = adAccounts.findIndex((account) => account.id === checkpoint.ad_account_id);
            if (foundIndex >= 0) {
                startIndex = foundIndex;
                resumeBookmark = checkpoint.bookmark !== '' ? checkpoint.bookmark : undefined;
            }
        }

        for (let i = startIndex; i < adAccounts.length; i++) {
            const account = adAccounts[i];
            if (!account) {
                break;
            }

            let nextBookmark = resumeBookmark;
            resumeBookmark = undefined;

            const segmentProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/customer_segments/operation/customer_segment/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(account.id)}/customer_segments`,
                params: {
                    ...(nextBookmark && { bookmark: nextBookmark })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextBookmark = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate(segmentProxyConfig)) {
                const parsed = z.array(CustomerSegmentItemSchema).safeParse(page);
                if (!parsed.success) {
                    throw new Error(`Failed to parse customer segments page: ${parsed.error.message}`);
                }

                const segments = parsed.data.map((segment) => ({
                    id: segment.id,
                    ...(segment.ad_account_id !== undefined && { ad_account_id: segment.ad_account_id }),
                    ...(segment.name !== undefined && { name: segment.name }),
                    ...(segment.audience_ids !== undefined && { audience_ids: segment.audience_ids }),
                    ...(segment.created_time !== undefined && { created_time: segment.created_time }),
                    ...(segment.updated_time !== undefined && { updated_time: segment.updated_time }),
                    ...(segment.status !== undefined && { status: segment.status })
                }));

                if (segments.length > 0) {
                    await nango.batchSave(segments, 'CustomerSegment');
                }

                await nango.saveCheckpoint({
                    ad_account_id: account.id,
                    bookmark: nextBookmark ?? ''
                });
            }

            const nextAccount = adAccounts[i + 1];
            if (nextAccount) {
                await nango.saveCheckpoint({
                    ad_account_id: nextAccount.id,
                    bookmark: ''
                });
            }
        }

        await nango.trackDeletesEnd('CustomerSegment');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
