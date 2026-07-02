import { createSync } from 'nango';
import { z } from 'zod';

const RawOpportunitySchema = z.object({
    id: z.string(),
    updatedAt: z.number().optional()
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

const CheckpointSchema = z.object({
    opportunity_next: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all referrals for every single opportunity',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Referral: ReferralSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Referral');

        let opportunityNext: string | undefined;

        const batch: z.infer<typeof ReferralSchema>[] = [];

        // https://hire.lever.co/developer/documentation#list-all-opportunities
        for await (const page of nango.paginate({
            endpoint: '/v1/opportunities',
            params: {
                limit: '100'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    opportunityNext = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            for (const raw of page) {
                const opportunity = RawOpportunitySchema.safeParse(raw);
                if (!opportunity.success || !opportunity.data.id) {
                    continue;
                }

                // https://hire.lever.co/developer/documentation#list-all-referrals
                for await (const referralPage of nango.paginate({
                    endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.data.id)}/referrals`,
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
                        if (!referral.success || !referral.data.id) {
                            continue;
                        }

                        batch.push({
                            id: referral.data.id,
                            opportunityId: opportunity.data.id,
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

            if (batch.length > 0) {
                await nango.batchSave(batch, 'Referral');
                batch.length = 0;
            }

            if (opportunityNext) {
                await nango.saveCheckpoint({
                    opportunity_next: opportunityNext
                });
            }
        }

        await nango.trackDeletesEnd('Referral');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
