import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const ProviderFeedbackSchema = z.object({
    id: z.string(),
    type: z.string(),
    text: z.string().nullable().optional(),
    instructions: z.string().nullable().optional(),
    fields: z.unknown().array().optional(),
    baseTemplateId: z.string().nullable().optional(),
    interview: z.string().nullable().optional(),
    panel: z.string().nullable().optional(),
    user: z.string().nullable().optional(),
    createdAt: z.number().nullable().optional(),
    completedAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    deletedAt: z.number().nullable().optional()
});

const ProviderOpportunitySchema = z.object({
    id: z.string()
});

const OpportunityPageSchema = z.object({
    data: z.array(ProviderOpportunitySchema),
    next: z.string().optional()
});

const FeedbackPageSchema = z.object({
    data: z.array(ProviderFeedbackSchema),
    next: z.string().optional()
});

const LeverOpportunityFeedbackSchema = z.object({
    id: z.string(),
    type: z.string(),
    text: z.string().optional(),
    instructions: z.string().optional(),
    fields: z.unknown().array().optional(),
    baseTemplateId: z.string().optional(),
    interview: z.string().optional(),
    panel: z.string().optional(),
    user: z.string().optional(),
    createdAt: z.number().optional(),
    completedAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedAt: z.number().optional()
});

const CheckpointSchema = z.object({
    opportunityOffset: z.string(),
    opportunityId: z.string(),
    feedbackOffset: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all feedback forms for a candidate for every single opportunity',
    version: '2.0.1',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['feedback:read:admin'],
    checkpoint: CheckpointSchema,
    models: {
        LeverOpportunityFeedback: LeverOpportunityFeedbackSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let totalRecords = 0;

        await nango.trackDeletesStart('LeverOpportunityFeedback');

        let opportunityOffset = checkpoint?.['opportunityOffset'] || undefined;
        const resumeOpportunityId = checkpoint?.['opportunityId'] || undefined;
        const resumeFeedbackOffset = checkpoint?.['feedbackOffset'] || undefined;

        while (true) {
            const page = await fetchOpportunityPage(nango, opportunityOffset);

            const opportunities = page.data;
            let startFromIndex = 0;

            if (resumeOpportunityId) {
                const resumeIndex = opportunities.findIndex((o) => o.id === resumeOpportunityId);
                if (resumeIndex !== -1) {
                    startFromIndex = resumeIndex;
                    if (!resumeFeedbackOffset) {
                        startFromIndex = resumeIndex + 1;
                    }
                }
            }

            let isFirstOpportunity = true;
            for (const opportunity of opportunities.slice(startFromIndex)) {
                let feedbackOffset: string | undefined;
                if (isFirstOpportunity && resumeOpportunityId === opportunity.id && resumeFeedbackOffset) {
                    feedbackOffset = resumeFeedbackOffset;
                }
                isFirstOpportunity = false;

                while (true) {
                    const config: ProxyConfiguration = {
                        // https://hire.lever.co/developer/documentation#list-all-feedback
                        endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/feedback`,
                        params: {
                            limit: String(LIMIT),
                            ...(feedbackOffset !== undefined && { offset: feedbackOffset })
                        },
                        retries: 3
                    };

                    const response = await nango.get(config);
                    const parsed = FeedbackPageSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Invalid feedback page: ${parsed.error.message}`);
                    }

                    const feedbackBatch = parsed.data.data;
                    if (feedbackBatch.length > 0) {
                        const mappedFeedback = feedbackBatch.map(mapFeedback);
                        const batchSize = mappedFeedback.length;
                        totalRecords += batchSize;
                        await nango.log(`Saving batch of ${batchSize} feedback(s) for opportunity ${opportunity.id} (total feedback(s): ${totalRecords})`);
                        await nango.batchSave(mappedFeedback, 'LeverOpportunityFeedback');
                    }

                    const nextCursor = parsed.data.next;
                    await nango.saveCheckpoint({
                        opportunityOffset: opportunityOffset ?? '',
                        opportunityId: opportunity.id,
                        feedbackOffset: nextCursor ?? ''
                    });

                    if (!nextCursor) {
                        break;
                    }
                    feedbackOffset = nextCursor;
                }
            }

            if (!page.next) {
                break;
            }
            opportunityOffset = page.next;

            await nango.saveCheckpoint({
                opportunityOffset: opportunityOffset ?? '',
                opportunityId: '',
                feedbackOffset: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LeverOpportunityFeedback');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchOpportunityPage(nango: NangoSyncLocal, offset: string | undefined): Promise<z.infer<typeof OpportunityPageSchema>> {
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        params: {
            limit: String(LIMIT),
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

function mapFeedback(feedback: z.infer<typeof ProviderFeedbackSchema>): z.infer<typeof LeverOpportunityFeedbackSchema> {
    return {
        id: feedback.id,
        type: feedback.type,
        ...(feedback.text !== undefined && feedback.text !== null && { text: feedback.text }),
        ...(feedback.instructions !== undefined && feedback.instructions !== null && { instructions: feedback.instructions }),
        ...(feedback.fields !== undefined && { fields: feedback.fields }),
        ...(feedback.baseTemplateId !== undefined && feedback.baseTemplateId !== null && { baseTemplateId: feedback.baseTemplateId }),
        ...(feedback.interview !== undefined && feedback.interview !== null && { interview: feedback.interview }),
        ...(feedback.panel !== undefined && feedback.panel !== null && { panel: feedback.panel }),
        ...(feedback.user !== undefined && feedback.user !== null && { user: feedback.user }),
        ...(feedback.createdAt !== undefined && feedback.createdAt !== null && { createdAt: feedback.createdAt }),
        ...(feedback.completedAt !== undefined && feedback.completedAt !== null && { completedAt: feedback.completedAt }),
        ...(feedback.updatedAt !== undefined && feedback.updatedAt !== null && { updatedAt: feedback.updatedAt }),
        ...(feedback.deletedAt !== undefined && feedback.deletedAt !== null && { deletedAt: feedback.deletedAt })
    };
}
