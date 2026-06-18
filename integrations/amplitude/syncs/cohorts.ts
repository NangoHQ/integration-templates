import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCohortSchema = z.object({
    id: z.string(),
    appId: z.number().nullish(),
    archived: z.boolean().nullish(),
    chart_id: z.string().nullish(),
    createdAt: z.number().nullish(),
    definition: z.record(z.string(), z.unknown()).nullish(),
    description: z.string().nullish(),
    edit_id: z.string().nullish(),
    finished: z.boolean().nullish(),
    hidden: z.boolean().nullish(),
    is_official_content: z.boolean().nullish(),
    is_predictive: z.boolean().nullish(),
    lastComputed: z.number().nullish(),
    lastMod: z.number().nullish(),
    last_viewed: z.number().nullish(),
    location_id: z.string().nullish(),
    metadata: z.array(z.string()).nullish(),
    name: z.string(),
    owners: z.array(z.string()).nullish(),
    popularity: z.number().nullish(),
    published: z.boolean().nullish(),
    shortcut_ids: z.array(z.string()).nullish(),
    size: z.number().nullish(),
    syncMetadata: z.array(z.record(z.string(), z.unknown())).nullish(),
    type: z.string().nullish(),
    view_count: z.number().nullish(),
    viewers: z.array(z.string()).nullish()
});

const CohortSchema = z.object({
    id: z.string(),
    appId: z.number().optional(),
    archived: z.boolean().optional(),
    chart_id: z.string().optional(),
    createdAt: z.number().optional(),
    definition: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    edit_id: z.string().optional(),
    finished: z.boolean().optional(),
    hidden: z.boolean().optional(),
    is_official_content: z.boolean().optional(),
    is_predictive: z.boolean().optional(),
    lastComputed: z.number().optional(),
    lastMod: z.number().optional(),
    last_viewed: z.number().optional(),
    location_id: z.string().optional(),
    metadata: z.array(z.string()).optional(),
    name: z.string(),
    owners: z.array(z.string()).optional(),
    popularity: z.number().optional(),
    published: z.boolean().optional(),
    shortcut_ids: z.array(z.string()).optional(),
    size: z.number().optional(),
    syncMetadata: z.array(z.record(z.string(), z.unknown())).optional(),
    type: z.string().optional(),
    view_count: z.number().optional(),
    viewers: z.array(z.string()).optional()
});

const CohortsListResponseSchema = z.object({
    cohorts: z.array(z.unknown())
});

type Cohort = z.infer<typeof CohortSchema>;

function normalizeCohort(raw: z.infer<typeof ProviderCohortSchema>): Cohort {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value !== null) {
            normalized[key] = value;
        }
    }
    return CohortSchema.parse(normalized);
}

const sync = createSync({
    description: 'Sync cohorts.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/cohorts',
            method: 'GET'
        }
    ],
    models: {
        Cohort: CohortSchema
    },

    exec: async (nango) => {
        // https://amplitude.com/docs/apis/analytics/behavioral-cohorts
        const response = await nango.get({
            endpoint: '/api/3/cohorts',
            retries: 3
        });

        const parsedResponse = CohortsListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new Error(`Failed to parse cohorts list response: ${parsedResponse.error.message}`);
        }

        const cohorts: Cohort[] = [];
        for (const item of parsedResponse.data.cohorts) {
            const parsedCohort = ProviderCohortSchema.safeParse(item);
            if (!parsedCohort.success) {
                throw new Error(`Failed to parse cohort: ${parsedCohort.error.message}`);
            }
            cohorts.push(normalizeCohort(parsedCohort.data));
        }

        await nango.trackDeletesStart('Cohort');
        if (cohorts.length > 0) {
            await nango.batchSave(cohorts, 'Cohort');
        }
        await nango.trackDeletesEnd('Cohort');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
