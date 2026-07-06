import { createSync } from 'nango';
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

const sync = createSync({
    description: 'Fetches a list of all referrals for every single opportunity',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Referral: ReferralSchema
    },

    exec: async (nango) => {
        // Fetch and validate all opportunities before opening the delete-tracking window, so a
        // failure here never leaves LeverReferral's tracking started without a matching end.
        const opportunities: z.infer<typeof RawOpportunitySchema>[] = [];
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
                limit: 100
            },
            retries: 3
        })) {
            for (const raw of page) {
                const opportunity = RawOpportunitySchema.safeParse(raw);
                if (!opportunity.success) {
                    throw new Error(`Lever opportunity response did not match expected schema: ${opportunity.error.message}`);
                }
                opportunities.push(opportunity.data);
            }
        }

        await nango.trackDeletesStart('Referral');

        const batch: z.infer<typeof ReferralSchema>[] = [];

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

        if (batch.length > 0) {
            await nango.batchSave(batch, 'Referral');
            batch.length = 0;
        }

        await nango.trackDeletesEnd('Referral');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
