import { createSync } from 'nango';
import { z } from 'zod';

const JobSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        confidential: z.boolean().optional(),
        status: z.string().optional(),
        employmentType: z.string().optional(),
        locationId: z.string().optional(),
        departmentId: z.string().optional(),
        defaultInterviewPlanId: z.string().optional(),
        interviewPlanIds: z.array(z.string()).optional(),
        jobPostingIds: z.array(z.string()).optional(),
        customFields: z.array(z.unknown()).optional(),
        hiringTeam: z.array(z.unknown()).optional(),
        customRequisitionId: z.string().nullable().optional(),
        brandId: z.string().optional(),
        author: z.object({}).passthrough().optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
        openedAt: z.string().nullable().optional(),
        closedAt: z.string().nullable().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    sync_token: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync jobs from Ashby',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Job: JobSchema
    },
    endpoints: [
        {
            path: '/syncs/jobs',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let syncToken: string | undefined = checkpoint?.sync_token || undefined;
        let nextCursor: string | null = checkpoint?.cursor || null;

        while (true) {
            const response = await nango.post<{
                success: boolean;
                results: unknown[];
                moreDataAvailable: boolean;
                nextCursor?: string;
                syncToken?: string;
                errors?: string[];
            }>({
                // https://developers.ashbyhq.com/reference/joblist
                endpoint: '/job.list',
                data: {
                    limit: 100,
                    ...(syncToken && { syncToken }),
                    ...(nextCursor && { cursor: nextCursor })
                },
                retries: 3
            });

            const responseData = response.data;

            if (!responseData.success) {
                let errorMessage = 'There was an error when running the script';
                if (responseData.errors && responseData.errors.length > 0) {
                    errorMessage += `: ${responseData.errors.join(', ')}`;
                }
                throw new Error(errorMessage);
            }

            if (responseData.syncToken) {
                syncToken = responseData.syncToken;
            }
            nextCursor = responseData.nextCursor ?? null;

            const jobs = responseData.results.map((item) => JobSchema.parse(item));
            if (jobs.length > 0) {
                await nango.batchSave(jobs, 'Job');
            }

            await nango.saveCheckpoint({
                sync_token: syncToken ?? '',
                cursor: nextCursor ?? ''
            });

            if (!responseData.moreDataAvailable) break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
