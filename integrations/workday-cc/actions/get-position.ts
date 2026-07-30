import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';

const InputSchema = z.object({
    id: z.string().describe('Job (position) ID. Example: "21001_JR1"')
});

// Workday's Staffing REST API models a filled/vacant position as a "Job" resource. It doesn't
// expose a separate effective-date or open/closed status field the way the SOAP Position resource did.
const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    position_code: z.string().optional(),
    effective_date: z.string().optional(),
    status: z.string().optional(),
    inactive: z.boolean().optional(),
    job_profile: z.string().optional(),
    location: z.string().optional(),
    worker: z.string().optional()
});

const ProviderRelatedViewSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderJobSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional(),
    businessTitle: z.string().optional(),
    location: ProviderRelatedViewSchema.optional(),
    worker: ProviderRelatedViewSchema.optional(),
    jobProfile: ProviderRelatedViewSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single position from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/jobs
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/jobs/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ type: 'not_found', message: `Position not found: ${input.id}` });
        }

        const job = ProviderJobSchema.parse(response.data);

        return {
            id: job.id,
            name: job.businessTitle ?? job.descriptor ?? '',
            position_code: job.id,
            job_profile: job.jobProfile?.descriptor ?? job.jobProfile?.id,
            location: job.location?.descriptor ?? job.location?.id,
            worker: job.worker?.descriptor ?? job.worker?.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
