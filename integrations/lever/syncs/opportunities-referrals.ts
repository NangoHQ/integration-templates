import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawOpportunitySchema = z.object({
    id: z.string()
});

const RawReferralSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    text: z.string().optional(),
    instructions: z.string().optional(),
    baseTemplateId: z.string().optional(),
    referrer: z.string().optional(),
    user: z.string().optional(),
    stage: z.string().optional(),
    createdAt: z.number().optional(),
    completedAt: z.number().optional(),
    fields: z.array(z.object({}).passthrough()).optional()
});

const ReferralSchema = z.object({
    id: z.string(),
    opportunityId: z.string(),
    type: z.string().optional(),
    text: z.string().optional(),
    instructions: z.string().optional(),
    baseTemplateId: z.string().optional(),
    referrer: z.string().optional(),
    user: z.string().optional(),
    stage: z.string().optional(),
    createdAt: z.number().optional(),
    completedAt: z.number().optional(),
    fields: z.array(z.object({}).passthrough()).optional()
});

const OpportunityPageSchema = z.object({
    data: z.array(RawOpportunitySchema),
    next: z.string().optional()
});

const sync = createSync({
    description: 'Fetches a list of all referrals for every single opportunity',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Referral: ReferralSchema
    },

    exec: async (nango) => {
        const batch: z.infer<typeof ReferralSchema>[] = [];

        const fetchOpportunityPage = async (offset: string | undefined) => {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-opportunities
                endpoint: '/v1/opportunities',
                params: {
                    limit: '100',
                    ...(offset !== undefined && { offset })
                },
                retries: 3
            };
            const response = await nango.get(config);
            const parsed = OpportunityPageSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Lever opportunities response did not match expected schema: ${parsed.error.message}`);
            }
            return parsed.data;
        };

        // Fetch and validate only the first page before opening the delete-tracking window, so a
        // failure here never leaves Referral's tracking started without a matching end. Subsequent
        // pages are streamed and processed immediately to keep memory bounded on large accounts.
        const firstPage = await fetchOpportunityPage(undefined);

        await nango.trackDeletesStart('Referral');

        const processOpportunities = async (opportunities: z.infer<typeof RawOpportunitySchema>[]) => {
            for (const opportunity of opportunities) {
                // https://hire.lever.co/developer/documentation#list-all-referrals
                for await (const referralPage of nango.paginate({
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/referrals`,
                    params: {
                        limit: '100'
                    },
                    paginate: {
                        type: 'cursor',
                        cursor_name_in_request: 'offset',
                        cursor_path_in_response: 'next',
                        response_path: 'data',
                        limit_name_in_request: 'limit',
                        limit: 100
                    },
                    retries: 3
                })) {
                    for (const referralRaw of referralPage) {
                        const referral = RawReferralSchema.safeParse(referralRaw);
                        if (!referral.success) {
                            throw new Error(`Lever referral response did not match expected schema: ${referral.error.message}`);
                        }

                        batch.push({
                            id: referral.data.id,
                            opportunityId: opportunity.id,
                            type: referral.data.type,
                            text: referral.data.text,
                            instructions: referral.data.instructions,
                            baseTemplateId: referral.data.baseTemplateId,
                            referrer: referral.data.referrer,
                            user: referral.data.user,
                            stage: referral.data.stage,
                            createdAt: referral.data.createdAt,
                            completedAt: referral.data.completedAt,
                            fields: referral.data.fields
                        });
                    }
                }

                if (batch.length >= 100) {
                    await nango.batchSave(batch, 'Referral');
                    batch.length = 0;
                }
            }
        };

        await processOpportunities(firstPage.data);
        let cursor = firstPage.next;
        while (cursor) {
            const page = await fetchOpportunityPage(cursor);
            await processOpportunities(page.data);
            cursor = page.next;
        }

        if (batch.length > 0) {
            await nango.batchSave(batch, 'Referral');
            batch.length = 0;
        }

        await nango.trackDeletesEnd('Referral');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
