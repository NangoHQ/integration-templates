import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MemberSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const StageSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ActivitySchema = z.object({
    id: z.string(),
    action: z.string(),
    stage_name: z.string().nullable().optional(),
    action_stage: StageSchema.nullable().optional(),
    target_stage: StageSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    member: MemberSchema.nullable().optional(),
    body: z.string().nullable().optional(),
    rating: z.object({ score: z.string().optional() }).nullable().optional(),
    visibility_roles: z.array(z.string()).optional()
});

const CandidateSchema = z.object({
    id: z.string()
});

const CandidateActivitySchema = z.object({
    id: z.string(),
    candidate_id: z.string(),
    action: z.string(),
    stage_name: z.string().optional(),
    action_stage_id: z.number().optional(),
    action_stage_name: z.string().optional(),
    target_stage_id: z.number().optional(),
    target_stage_name: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    member_id: z.string().optional(),
    member_name: z.string().optional(),
    body: z.string().optional(),
    rating_score: z.string().optional(),
    visibility_roles: z.array(z.string()).optional()
});

const ActivitiesPageSchema = z.object({
    activities: z.array(ActivitySchema),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync activity streams (comments, moves, ratings, disqualifications) for each candidate',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CandidateActivity: CandidateActivitySchema
    },

    exec: async (nango) => {
        // The supplied Workable context does not document a changed-since filter for
        // candidate activities, so this sync performs a full scan each run.
        const candidateProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/job-candidates-index
            endpoint: '/spi/v3/candidates',
            params: {
                limit: 100
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'candidates',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            retryOn: [404, 429],
            retries: 3
        };

        for await (const candidatePage of nango.paginate(candidateProxyConfig)) {
            const candidates = z.array(CandidateSchema).parse(candidatePage);

            for (const candidate of candidates) {
                let nextPage: string | undefined;

                do {
                    const request = getActivitiesRequest(candidate.id, nextPage);
                    const response = await getWithReadBackoff(nango, {
                        ...request,
                        retries: 3
                    });
                    const parsedPage = ActivitiesPageSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Failed to parse activities for candidate ${candidate.id}: ${parsedPage.error.message}`);
                    }

                    const activities = parsedPage.data.activities;

                    const records = activities.map((activity) => ({
                        id: activity.id,
                        candidate_id: candidate.id,
                        action: activity.action,
                        ...(activity.stage_name != null && { stage_name: activity.stage_name }),
                        ...(activity.action_stage?.id != null && { action_stage_id: activity.action_stage.id }),
                        ...(activity.action_stage?.name != null && { action_stage_name: activity.action_stage.name }),
                        ...(activity.target_stage?.id != null && { target_stage_id: activity.target_stage.id }),
                        ...(activity.target_stage?.name != null && { target_stage_name: activity.target_stage.name }),
                        created_at: activity.created_at,
                        updated_at: activity.updated_at,
                        ...(activity.member?.id != null && { member_id: activity.member.id }),
                        ...(activity.member?.name != null && { member_name: activity.member.name }),
                        ...(activity.body != null && { body: activity.body }),
                        ...(activity.rating?.score != null && { rating_score: activity.rating.score }),
                        ...(activity.visibility_roles != null && { visibility_roles: activity.visibility_roles })
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'CandidateActivity');
                    }

                    nextPage = parsedPage.data.paging?.next;
                } while (nextPage);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        const status = error.response.status;
        return typeof status === 'number' ? status : undefined;
    }
    return undefined;
}

function getActivitiesRequest(candidateId: string, nextPage: string | undefined): Pick<ProxyConfiguration, 'endpoint' | 'params'> {
    if (!nextPage) {
        return {
            // https://workable.readme.io/reference/candidate-activities
            endpoint: `/spi/v3/candidates/${encodeURIComponent(candidateId)}/activities`,
            params: {
                limit: 100
            }
        };
    }

    const nextUrl = new URL(nextPage);
    return {
        endpoint: nextUrl.pathname,
        params: Object.fromEntries(nextUrl.searchParams.entries())
    };
}

async function getWithReadBackoff(nango: NangoSyncLocal, config: ProxyConfiguration) {
    const requestConfig: ProxyConfiguration = { ...config, retries: 3 };
    // @allowTryCatch Back off on 429 and retry spurious 404s for Workable read calls.
    try {
        const response = await nango.get(requestConfig);
        if (response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(requestConfig);
        }
        if (response.status === 404) {
            return await nango.get(requestConfig);
        }
        return response;
    } catch (error) {
        const status = getErrorStatus(error);
        if (status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(requestConfig);
        }
        if (status === 404) {
            return await nango.get(requestConfig);
        }
        throw error;
    }
}

export default sync;
