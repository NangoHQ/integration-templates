import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { AshbyJob, AshbyJobMetadata } from '../models.js';

import { z } from 'zod';

const CheckpointSchema = z.object({
    sync_token: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all jobs from your ashby account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/jobs',
            group: 'Jobs'
        }
    ],

    scopes: ['jobslastsyncToken'],

    models: {
        AshbyJob: AshbyJob
    },

    metadata: AshbyJobMetadata,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const metadata = (await nango.getMetadata()) || {};
        const jobslastsyncToken = checkpoint?.sync_token ?? (metadata['jobslastsyncToken'] ? String(metadata['jobslastsyncToken']) : '');

        await saveAllJobs(nango, jobslastsyncToken, checkpoint?.cursor);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function saveAllJobs(nango: NangoSyncLocal, jobslastsyncToken: string, checkpointCursor?: string) {
    let totalRecords = 0;
    let cursor: string | null = checkpointCursor || null;

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const payload: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/joblist
            endpoint: '/job.list',
            data: {
                ...(jobslastsyncToken && { syncToken: jobslastsyncToken }),
                cursor,
                limit: 100
            },
            retries: 10
        };
        const response = await nango.post(payload);
        const pageData = response.data.results;
        const mappedJobs: AshbyJob[] = mapJob(pageData);
        if (mappedJobs.length > 0) {
            const batchSize: number = mappedJobs.length;
            totalRecords += batchSize;
            await nango.batchSave(mappedJobs, 'AshbyJob');
            await nango.log(`Saving batch of ${batchSize} job(s) (total jobs(s): ${totalRecords})`);
        }
        if (response.data.moreDataAvailable) {
            cursor = response.data.nextCursor;
            await nango.saveCheckpoint({ sync_token: jobslastsyncToken, cursor: cursor ?? '' });
        } else {
            jobslastsyncToken = response.data.syncToken;
            await nango.saveCheckpoint({ sync_token: jobslastsyncToken, cursor: '' });
            break;
        }
    }
}

function mapJob(jobs: any[]): AshbyJob[] {
    return jobs.map((job) => ({
        id: job.id,
        title: job.title,
        confidential: job.confidential,
        status: job.status,
        employmentType: job.employmentType,
        locationId: job.locationId,
        departmentId: job.departmentId,
        defaultInterviewPlanId: job.defaultInterviewPlanId,
        interviewPlanIds: job.interviewPlanIds,
        customFields: job.customFields,
        jobPostingIds: job.jobPostingIds,
        customRequisitionId: job.customRequisitionId,
        hiringTeam: job.hiringTeam,
        updatedAt: job.updatedAt,
        location: job.location,
        openings: job.openings
    }));
}
