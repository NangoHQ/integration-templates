import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCampaignSchema = z.object({
    type: z.string().optional(),
    id: z.string().describe('e.g. 01KWGH6P9PERJ0AHGNBJQMH55G'),
    attributes: z
        .object({
            name: z.string().optional(),
            status: z.string().optional(),
            created_at: z.string().optional().describe('e.g. 2024-01-15T10:00:00Z'),
            updated_at: z.string().optional().describe('e.g. 2024-01-15T10:00:00Z'),
            archived: z.boolean().optional()
        })
        .optional(),
    relationships: z.unknown().optional()
});

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    channel: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    archived: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string().describe('e.g. 2024-01-15T10:00:00Z')
});

const sync = createSync({
    description: 'Sync campaigns.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            updatedAfter = parsedCheckpoint.data.updated_after;
        }

        let maxUpdatedAt: string | undefined;

        for (const channel of ['email', 'sms']) {
            const filter = updatedAfter
                ? `and(equals(messages.channel,'${channel}'),greater-or-equal(updated_at,'${updatedAfter}'))`
                : `equals(messages.channel,'${channel}')`;

            const proxyConfig: ProxyConfiguration = {
                // https://developers.klaviyo.com/en/reference/get_campaigns
                endpoint: '/api/campaigns',
                params: {
                    filter
                },
                headers: {
                    revision: '2026-04-15'
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'links.next',
                    response_path: 'data',
                    limit_name_in_request: 'page[size]',
                    limit: 100
                },
                retries: 3
            };

            for await (const campaigns of nango.paginate(proxyConfig)) {
                const parsed = z.array(ProviderCampaignSchema).safeParse(campaigns);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaigns: ${parsed.error.message}`);
                }

                const records = parsed.data
                    .filter((campaign) => campaign.id != null)
                    .map((campaign) => ({
                        id: campaign.id,
                        ...(campaign.attributes?.name != null && { name: campaign.attributes.name }),
                        ...(campaign.attributes?.status != null && { status: campaign.attributes.status }),
                        channel,
                        ...(campaign.attributes?.created_at != null && { created_at: campaign.attributes.created_at }),
                        ...(campaign.attributes?.updated_at != null && { updated_at: campaign.attributes.updated_at }),
                        ...(campaign.attributes?.archived != null && { archived: campaign.attributes.archived })
                    }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Campaign');

                    for (const record of records) {
                        if (record.updated_at != null && (maxUpdatedAt === undefined || record.updated_at > maxUpdatedAt)) {
                            maxUpdatedAt = record.updated_at;
                        }
                    }
                }
            }
        }

        if (maxUpdatedAt != null) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
