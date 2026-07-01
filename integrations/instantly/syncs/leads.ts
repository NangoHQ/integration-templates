import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderLeadSchema = z
    .object({
        id: z.string().describe('Unique identifier for the lead. Example: 019f1a45-4df8-7ff8-ac9e-4f7279a8c68c'),
        email: z.string().nullable().optional().describe('Email address of the lead. Example: example@example.com'),
        first_name: z.string().nullable().optional().describe('First name of the lead. Example: John'),
        last_name: z.string().nullable().optional().describe('Last name of the lead. Example: Doe'),
        company_name: z.string().nullable().optional().describe('Company name of the lead. Example: Example Inc.'),
        job_title: z.string().nullable().optional().describe('Job title of the lead. Example: Head of Growth'),
        phone: z.string().nullable().optional().describe('Phone number of the lead. Example: +1234567890'),
        website: z.string().nullable().optional().describe('Website of the lead. Example: https://example.com'),
        status: z.number().optional().describe('Status of the lead. Example: 1'),
        timestamp_created: z.string().optional().describe('Timestamp when the lead was created. Example: 2026-06-30T20:42:57.402Z'),
        timestamp_updated: z.string().optional().describe('Timestamp when the lead was last updated. Example: 2026-06-30T20:42:57.403Z'),
        campaign: z.string().nullable().optional().describe('Campaign ID associated with the lead. Example: 019f1a45-4dfb-7da4-b68b-0eaad1f324ea'),
        list_id: z.string().nullable().optional().describe('List ID associated with the lead. Example: 019f1a45-4dfb-7da4-b68b-0eaf57f6b3a6')
    })
    .passthrough();

const LeadSchema = z.object({
    id: z.string().describe('Unique identifier for the lead. Example: 019f1a45-4df8-7ff8-ac9e-4f7279a8c68c'),
    email: z.string().optional().describe('Email address of the lead. Example: example@example.com'),
    first_name: z.string().optional().describe('First name of the lead. Example: John'),
    last_name: z.string().optional().describe('Last name of the lead. Example: Doe'),
    company_name: z.string().optional().describe('Company name of the lead. Example: Example Inc.'),
    job_title: z.string().optional().describe('Job title of the lead. Example: Head of Growth'),
    phone: z.string().optional().describe('Phone number of the lead. Example: +1234567890'),
    website: z.string().optional().describe('Website of the lead. Example: https://example.com'),
    status: z.number().optional().describe('Status of the lead. Example: 1'),
    timestamp_created: z.string().optional().describe('Timestamp when the lead was created. Example: 2026-06-30T20:42:57.402Z'),
    timestamp_updated: z.string().optional().describe('Timestamp when the lead was last updated. Example: 2026-06-30T20:42:57.403Z'),
    campaign: z.string().optional().describe('Campaign ID associated with the lead. Example: 019f1a45-4dfb-7da4-b68b-0eaad1f324ea'),
    list_id: z.string().optional().describe('List ID associated with the lead. Example: 019f1a45-4dfb-7da4-b68b-0eaf57f6b3a6')
});

const CheckpointSchema = z.object({
    starting_after: z.string().describe('Pagination cursor for the next page of leads. Example: 019f1a45-a71e-78ad-9775-17282f370974')
});

const MetadataSchema = z.object({
    list_id: z.string().optional().describe('Optional list ID to scope the leads sync. Example: 019f1a45-4dfb-7da4-b68b-0eaf57f6b3a6'),
    campaign_id: z.string().optional().describe('Optional campaign ID to scope the leads sync. Example: 019f1a45-4dfb-7da4-b68b-0eaad1f324ea')
});

const ListLeadsResponseSchema = z.object({
    items: z.array(z.unknown()),
    next_starting_after: z.string().optional().describe('Pagination cursor for the next page of leads. Example: 019f1a45-a71e-78ad-9775-17282f370974')
});

const sync = createSync({
    description: 'Sync leads.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Lead: LeadSchema
    },
    endpoints: [
        {
            path: '/syncs/leads',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let startingAfter: string | undefined;
        if (rawCheckpoint) {
            const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpoint.success) {
                throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
            }
            startingAfter = checkpoint.data.starting_after;
        }

        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata ?? {});
        if (!metadata.success) {
            throw new Error(`Invalid metadata: ${metadata.error.message}`);
        }

        let hasMore = true;
        const filter = {
            ...(metadata.data.list_id && { list_id: metadata.data.list_id }),
            ...(metadata.data.campaign_id && { campaign_id: metadata.data.campaign_id })
        };
        const serializedFilter = Object.keys(filter).length > 0 ? JSON.stringify(filter) : undefined;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.instantly.ai/api-reference/lead/list-leads.md
                endpoint: '/v2/leads/list',
                method: 'POST',
                data: {
                    limit: 100,
                    ...(startingAfter && { starting_after: startingAfter }),
                    ...(serializedFilter && { filter: serializedFilter })
                },
                retries: 3
            };

            const response = await nango.post(proxyConfig);

            const parsed = ListLeadsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse leads list response: ${parsed.error.message}`);
            }

            const items = parsed.data.items;
            const nextCursor = parsed.data.next_starting_after;

            const leads = items.map((record) => {
                const leadParsed = ProviderLeadSchema.safeParse(record);
                if (!leadParsed.success) {
                    throw new Error(`Failed to parse lead: ${leadParsed.error.message}`);
                }
                const lead = leadParsed.data;
                return {
                    id: lead.id,
                    ...(lead.email !== undefined && lead.email !== null && { email: lead.email }),
                    ...(lead.first_name !== undefined && lead.first_name !== null && { first_name: lead.first_name }),
                    ...(lead.last_name !== undefined && lead.last_name !== null && { last_name: lead.last_name }),
                    ...(lead.company_name !== undefined && lead.company_name !== null && { company_name: lead.company_name }),
                    ...(lead.job_title !== undefined && lead.job_title !== null && { job_title: lead.job_title }),
                    ...(lead.phone !== undefined && lead.phone !== null && { phone: lead.phone }),
                    ...(lead.website !== undefined && lead.website !== null && { website: lead.website }),
                    ...(lead.status !== undefined && { status: lead.status }),
                    ...(lead.timestamp_created !== undefined && { timestamp_created: lead.timestamp_created }),
                    ...(lead.timestamp_updated !== undefined && { timestamp_updated: lead.timestamp_updated }),
                    ...(lead.campaign !== undefined && lead.campaign !== null && { campaign: lead.campaign }),
                    ...(lead.list_id !== undefined && lead.list_id !== null && { list_id: lead.list_id })
                };
            });

            if (leads.length > 0) {
                await nango.batchSave(leads, 'Lead');
            }

            if (nextCursor) {
                startingAfter = nextCursor;
                await nango.saveCheckpoint({ starting_after: nextCursor });
            } else {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
