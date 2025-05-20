import type { NangoSync, RecruiterFlowJob } from '../../models';
import type { RecruiterFlowJobResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/job/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const jobs = response.data as RecruiterFlowJobResponse[];

    await nango.batchSave(jobs.map(toJob), 'RecruiterFlowJob');
}

function toJob(record: RecruiterFlowJobResponse): RecruiterFlowJob {
    return {
        id: record.id,
        title: record.title,
        department: record.department,
        location: record.location,
        employment_type: record.employment_type,
        status: record.status,
        remote_status: record.remote_status,
        created_at: record.created_at,
        updated_at: record.updated_at,
        description: record.description,
        requirements: record.requirements,
        custom_fields: record.custom_fields
    };
} 