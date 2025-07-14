import type { AshbyJob, NangoSync, ProxyConfiguration } from '../../models.js';

let nextCursor: string | null = null;

export default async function fetchData(nango: NangoSync) {
    const metadata = (await nango.getMetadata()) || {};
    const jobslastsyncToken = metadata['jobslastsyncToken'] ? String(metadata['jobslastsyncToken']) : '';

    await saveAllJobs(nango, jobslastsyncToken);
}

async function saveAllJobs(nango: NangoSync, jobslastsyncToken: string) {
    let totalRecords = 0;

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const payload: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/joblist
            endpoint: '/job.list',
            data: {
                ...(jobslastsyncToken && { syncToken: jobslastsyncToken }),
                cursor: nextCursor,
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
            await nango.batchSave<AshbyJob>(mappedJobs, 'AshbyJob');
            await nango.log(`Saving batch of ${batchSize} job(s) (total jobs(s): ${totalRecords})`);
        }
        if (response.data.moreDataAvailable) {
            nextCursor = response.data.nextCursor;
        } else {
            jobslastsyncToken = response.data.syncToken;
            break;
        }
    }

    const metadata = (await nango.getMetadata()) || {};
    metadata['jobslastsyncToken'] = jobslastsyncToken;
    await nango.setMetadata(metadata);
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
