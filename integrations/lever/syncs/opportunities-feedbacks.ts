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

const sync = createSync({
    description: 'Fetches a list of all feedback forms for a candidate for every single opportunity',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['feedback:read:admin'],
    models: {
        LeverOpportunityFeedback: LeverOpportunityFeedbackSchema
    },

    exec: async (nango) => {
        let totalRecords = 0;

        await nango.trackDeletesStart('LeverOpportunityFeedback');

        const opportunities = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-feedback
                endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/feedback`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                },
                retries: 3
            };

            for await (const feedbackBatch of nango.paginate<z.infer<typeof ProviderFeedbackSchema>>(config)) {
                const parsed = z.array(ProviderFeedbackSchema).safeParse(feedbackBatch);
                if (!parsed.success) {
                    throw new Error(`Invalid feedback batch: ${parsed.error.message}`);
                }

                const mappedFeedback = parsed.data.map(mapFeedback);
                const batchSize = mappedFeedback.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} feedback(s) for opportunity ${opportunity.id} (total feedback(s): ${totalRecords})`);
                await nango.batchSave(mappedFeedback, 'LeverOpportunityFeedback');
            }
        }

        await nango.trackDeletesEnd('LeverOpportunityFeedback');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: Array<z.infer<typeof ProviderOpportunitySchema>> = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        },
        retries: 3
    };

    for await (const recordBatch of nango.paginate<z.infer<typeof ProviderOpportunitySchema>>(config)) {
        const parsed = z.array(ProviderOpportunitySchema).safeParse(recordBatch);
        if (!parsed.success) {
            throw new Error(`Invalid opportunity batch: ${parsed.error.message}`);
        }
        records.push(...parsed.data);
    }

    return records;
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
