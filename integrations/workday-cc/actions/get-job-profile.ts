import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';

const InputSchema = z.object({
    id: z.string().describe('Job_Profile_ID. Example: "JOB_PROFILE_001"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    inactive: z.boolean().optional(),
    job_family: z.string().optional(),
    management_level: z.string().optional(),
    job_category: z.string().optional(),
    reference_id: z.string().optional()
});

const ProviderRelatedViewSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderJobFamilySchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderJobProfileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    summary: z.string().optional(),
    inactive: z.boolean().optional(),
    jobFamilies: z.array(ProviderJobFamilySchema).optional(),
    managementLevel: ProviderRelatedViewSchema.optional(),
    jobCategory: ProviderRelatedViewSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single job profile from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/jobProfiles
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/jobProfiles/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ type: 'not_found', message: `Job Profile not found: ${input.id}` });
        }

        const jobProfile = ProviderJobProfileSchema.parse(response.data);

        return {
            id: jobProfile.id,
            name: jobProfile.name ?? '',
            description: jobProfile.summary,
            inactive: jobProfile.inactive,
            job_family: jobProfile.jobFamilies?.[0]?.name ?? jobProfile.jobFamilies?.[0]?.descriptor,
            management_level: jobProfile.managementLevel?.descriptor,
            job_category: jobProfile.jobCategory?.descriptor,
            reference_id: jobProfile.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
