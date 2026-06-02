import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('ID of the job. Example: "job_0000000000000001"')
});

const JobImportUserErrorSchema = z
    .object({
        code: z.string().optional(),
        message: z.string().optional(),
        path: z.string().optional()
    })
    .passthrough();

const JobErrorEntrySchema = z
    .object({
        user: z.record(z.string(), z.unknown()).optional(),
        errors: z.array(JobImportUserErrorSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    errors: z.array(JobErrorEntrySchema)
});

const action = createAction({
    description: 'Retrieve the error details for a completed import job in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-job-errors',
        group: 'Jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:users', 'read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/jobs/get-errors
        const response = await nango.get({
            endpoint: `/api/v2/jobs/${encodeURIComponent(input.id)}/errors`,
            retries: 3
        });

        if (!response.data) {
            return { errors: [] };
        }

        if (Array.isArray(response.data)) {
            const parsed = response.data.map((entry: unknown) => JobErrorEntrySchema.parse(entry));
            return { errors: parsed };
        }

        // If the API returns a generic job object instead of an error array, there are no per-record errors
        return { errors: [] };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
