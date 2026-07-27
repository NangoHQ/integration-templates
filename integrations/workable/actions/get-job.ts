import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('Job shortcode identifier. Example: "9CD658E13E"')
});

const ProviderLocationSchema = z
    .object({
        location_str: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        country_code: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        region_code: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        zip_code: z.string().nullable().optional(),
        telecommuting: z.boolean().nullable().optional()
    })
    .passthrough();

const ProviderSalarySchema = z
    .object({
        salary_from: z.number().nullable().optional(),
        salary_to: z.number().nullable().optional(),
        salary_currency: z.string().nullable().optional()
    })
    .passthrough();

const ProviderJobSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        full_title: z.string().nullable().optional(),
        shortcode: z.string(),
        code: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        confidential: z.boolean().nullable().optional(),
        department: z.string().nullable().optional(),
        department_hierarchy: z.array(z.object({}).passthrough()).nullable().optional(),
        url: z.string().nullable().optional(),
        application_url: z.string().nullable().optional(),
        shortlink: z.string().nullable().optional(),
        workplace_type: z.string().nullable().optional(),
        employment_type: z.string().nullable().optional(),
        telecommuting: z.boolean().nullable().optional(),
        location: ProviderLocationSchema.nullable().optional(),
        locations: z.array(z.object({}).passthrough()).nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        published_at: z.string().nullable().optional(),
        full_description: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        requirements: z.string().nullable().optional(),
        benefits: z.string().nullable().optional(),
        industry: z.string().nullable().optional(),
        function: z.string().nullable().optional(),
        experience: z.string().nullable().optional(),
        education: z.string().nullable().optional(),
        keywords: z.string().nullable().optional(),
        salary: ProviderSalarySchema.nullable().optional()
    })
    .passthrough();

const OutputLocationSchema = z
    .object({
        location_str: z.string().optional(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        region: z.string().optional(),
        region_code: z.string().optional(),
        city: z.string().optional(),
        zip_code: z.string().optional(),
        telecommuting: z.boolean().optional()
    })
    .passthrough();

const OutputSalarySchema = z
    .object({
        salary_from: z.number().optional(),
        salary_to: z.number().optional(),
        salary_currency: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        full_title: z.string().optional(),
        shortcode: z.string(),
        code: z.string().optional(),
        state: z.string().optional(),
        confidential: z.boolean().optional(),
        department: z.string().optional(),
        department_hierarchy: z.array(z.object({}).passthrough()).optional(),
        url: z.string().optional(),
        application_url: z.string().optional(),
        shortlink: z.string().optional(),
        workplace_type: z.string().optional(),
        employment_type: z.string().optional(),
        telecommuting: z.boolean().optional(),
        location: OutputLocationSchema.optional(),
        locations: z.array(z.object({}).passthrough()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        published_at: z.string().optional(),
        full_description: z.string().optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        benefits: z.string().optional(),
        industry: z.string().optional(),
        function: z.string().optional(),
        experience: z.string().optional(),
        education: z.string().optional(),
        keywords: z.string().optional(),
        salary: OutputSalarySchema.optional()
    })
    .passthrough();

function mapLocation(location: z.infer<typeof ProviderLocationSchema> | null | undefined): z.infer<typeof OutputLocationSchema> | undefined {
    if (!location) {
        return undefined;
    }

    return {
        ...(location.location_str != null && { location_str: location.location_str }),
        ...(location.country != null && { country: location.country }),
        ...(location.country_code != null && { country_code: location.country_code }),
        ...(location.region != null && { region: location.region }),
        ...(location.region_code != null && { region_code: location.region_code }),
        ...(location.city != null && { city: location.city }),
        ...(location.zip_code != null && { zip_code: location.zip_code }),
        ...(location.telecommuting != null && { telecommuting: location.telecommuting })
    };
}

function mapSalary(salary: z.infer<typeof ProviderSalarySchema> | null | undefined): z.infer<typeof OutputSalarySchema> | undefined {
    if (!salary) {
        return undefined;
    }

    return {
        ...(salary.salary_from != null && { salary_from: salary.salary_from }),
        ...(salary.salary_to != null && { salary_to: salary.salary_to }),
        ...(salary.salary_currency != null && { salary_currency: salary.salary_currency })
    };
}

const action = createAction({
    description: 'Retrieve a single job by shortcode',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/get-job
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Job not found',
                shortcode: input.shortcode
            });
        }

        const providerJob = ProviderJobSchema.parse(response.data);

        const result: z.infer<typeof OutputSchema> = {
            id: providerJob.id,
            title: providerJob.title,
            shortcode: providerJob.shortcode,
            ...(providerJob.full_title != null && { full_title: providerJob.full_title }),
            ...(providerJob.code != null && { code: providerJob.code }),
            ...(providerJob.state != null && { state: providerJob.state }),
            ...(providerJob.confidential != null && { confidential: providerJob.confidential }),
            ...(providerJob.department != null && { department: providerJob.department }),
            ...(providerJob.department_hierarchy != null && { department_hierarchy: providerJob.department_hierarchy }),
            ...(providerJob.url != null && { url: providerJob.url }),
            ...(providerJob.application_url != null && { application_url: providerJob.application_url }),
            ...(providerJob.shortlink != null && { shortlink: providerJob.shortlink }),
            ...(providerJob.workplace_type != null && { workplace_type: providerJob.workplace_type }),
            ...(providerJob.employment_type != null && { employment_type: providerJob.employment_type }),
            ...(providerJob.telecommuting != null && { telecommuting: providerJob.telecommuting }),
            ...(providerJob.location != null && { location: mapLocation(providerJob.location) }),
            ...(providerJob.locations != null && { locations: providerJob.locations }),
            ...(providerJob.created_at != null && { created_at: providerJob.created_at }),
            ...(providerJob.updated_at != null && { updated_at: providerJob.updated_at }),
            ...(providerJob.published_at != null && { published_at: providerJob.published_at }),
            ...(providerJob.full_description != null && { full_description: providerJob.full_description }),
            ...(providerJob.description != null && { description: providerJob.description }),
            ...(providerJob.requirements != null && { requirements: providerJob.requirements }),
            ...(providerJob.benefits != null && { benefits: providerJob.benefits }),
            ...(providerJob.industry != null && { industry: providerJob.industry }),
            ...(providerJob.function != null && { function: providerJob.function }),
            ...(providerJob.experience != null && { experience: providerJob.experience }),
            ...(providerJob.education != null && { education: providerJob.education }),
            ...(providerJob.keywords != null && { keywords: providerJob.keywords }),
            ...(providerJob.salary != null && { salary: mapSalary(providerJob.salary) })
        };

        for (const key of Object.keys(providerJob)) {
            if (key in result) {
                continue;
            }
            const value = providerJob[key];
            if (value !== null && value !== undefined) {
                result[key] = value;
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
