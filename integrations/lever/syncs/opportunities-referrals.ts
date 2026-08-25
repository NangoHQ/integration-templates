import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RawOpportunitySchema = z.object({
    id: z.string()
});

const RawReferralSchema = z.object({
    id: z.string(),
    type: z.string().nullable().optional(),
    text: z.string().nullable().optional(),
    instructions: z.string().nullable().optional(),
    baseTemplateId: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    user: z.string().nullable().optional(),
    stage: z.string().nullable().optional(),
    createdAt: z.number().nullable().optional(),
    completedAt: z.number().nullable().optional(),
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

const ReferralPageSchema = z.object({
    data: z.array(z.unknown()),
    next: z.string().optional()
});

const CheckpointSchema = z.object({
    opportunityOffset: z.string(),
    opportunityId: z.string(),
    referralOffset: z.string()
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
        const checkpoint = await nango.getCheckpoint();

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Referral');

        const batch: z.infer<typeof ReferralSchema>[] = [];
        let opportunityOffset: string | undefined = checkpoint?.['opportunityOffset'] || undefined;
        const resumeOpportunityId = checkpoint?.['opportunityId'] || undefined;
        const resumeReferralOffset = checkpoint?.['referralOffset'] || undefined;

        while (true) {
            const page = await fetchOpportunityPage(nango, opportunityOffset);

            const opportunities = page.data;
            let startFromIndex = 0;

            if (resumeOpportunityId) {
                const resumeIndex = opportunities.findIndex((o) => o.id === resumeOpportunityId);
                if (resumeIndex !== -1) {
                    startFromIndex = resumeIndex;
                    if (!resumeReferralOffset) {
                        startFromIndex = resumeIndex + 1;
                    }
                }
            }

            let isFirstOpportunity = true;
            for (const opportunity of opportunities.slice(startFromIndex)) {
                let referralOffset: string | undefined;
                if (isFirstOpportunity && resumeOpportunityId === opportunity.id && resumeReferralOffset) {
                    referralOffset = resumeReferralOffset;
                }
                isFirstOpportunity = false;

                while (true) {
                    const config: ProxyConfiguration = {
                        // https://hire.lever.co/developer/documentation#list-all-referrals
                        endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/referrals`,
                        params: {
                            limit: '100',
                            ...(referralOffset !== undefined && { offset: referralOffset })
                        },
                        retries: 3
                    };

                    const response = await nango.get(config);
                    const parsed = ReferralPageSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Lever referrals response did not match expected schema: ${parsed.error.message}`);
                    }

                    for (const referralRaw of parsed.data.data) {
                        const referral = RawReferralSchema.safeParse(referralRaw);
                        if (!referral.success) {
                            throw new Error(`Lever referral response did not match expected schema: ${referral.error.message}`);
                        }

                        batch.push({
                            id: referral.data.id,
                            opportunityId: opportunity.id,
                            ...(referral.data.type !== undefined && referral.data.type !== null && { type: referral.data.type }),
                            ...(referral.data.text !== undefined && referral.data.text !== null && { text: referral.data.text }),
                            ...(referral.data.instructions !== undefined &&
                                referral.data.instructions !== null && { instructions: referral.data.instructions }),
                            ...(referral.data.baseTemplateId !== undefined &&
                                referral.data.baseTemplateId !== null && { baseTemplateId: referral.data.baseTemplateId }),
                            ...(referral.data.referrer !== undefined && referral.data.referrer !== null && { referrer: referral.data.referrer }),
                            ...(referral.data.user !== undefined && referral.data.user !== null && { user: referral.data.user }),
                            ...(referral.data.stage !== undefined && referral.data.stage !== null && { stage: referral.data.stage }),
                            ...(referral.data.createdAt !== undefined && referral.data.createdAt !== null && { createdAt: referral.data.createdAt }),
                            ...(referral.data.completedAt !== undefined && referral.data.completedAt !== null && { completedAt: referral.data.completedAt }),
                            ...(referral.data.fields !== undefined && { fields: referral.data.fields })
                        });
                    }

                    if (batch.length >= 100) {
                        await nango.batchSave(batch.splice(0, batch.length), 'Referral');
                    }

                    const nextCursor = parsed.data.next;
                    if (batch.length > 0) {
                        await nango.batchSave(batch.splice(0, batch.length), 'Referral');
                    }
                    await nango.saveCheckpoint({
                        opportunityOffset: opportunityOffset ?? '',
                        opportunityId: opportunity.id,
                        referralOffset: nextCursor ?? ''
                    });

                    if (!nextCursor) {
                        break;
                    }
                    referralOffset = nextCursor;
                }
            }

            if (!page.next) {
                break;
            }
            opportunityOffset = page.next;

            await nango.saveCheckpoint({
                opportunityOffset: opportunityOffset ?? '',
                opportunityId: '',
                referralOffset: ''
            });
        }

        if (batch.length > 0) {
            await nango.batchSave(batch.splice(0, batch.length), 'Referral');
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Referral');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchOpportunityPage(nango: NangoSyncLocal, offset: string | undefined): Promise<z.infer<typeof OpportunityPageSchema>> {
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
}
