import { z } from 'zod';
import { createAction } from 'nango';

const WorkdayReferenceSchema = z
    .object({
        id: z.string().optional().describe('Workday ID of the referenced resource. Example: "11111111-2222-3333-4444-555555555555"'),
        descriptor: z.string().optional().describe('Display name of the referenced resource. Example: "Senior Software Engineer"')
    })
    .passthrough();

const CountrySchema = z
    .object({
        descriptor: z.string().optional().describe('Country name'),
        alpha3Code: z.string().optional().describe('ISO 3166-1 alpha-3 country code')
    })
    .passthrough();

const RegionSchema = z
    .object({
        descriptor: z.string().optional().describe('Region or state name'),
        code: z.string().optional().describe('Region or state code')
    })
    .passthrough();

const LocationSchema = z
    .object({
        id: z.string().optional().describe('Workday ID of the location'),
        descriptor: z.string().optional().describe('Display name of the location'),
        country: CountrySchema.optional().describe('Country information'),
        region: RegionSchema.optional().describe('Region or state information')
    })
    .passthrough();

const InputSchema = z
    .object({
        id: z.string().describe('The Workday ID of the job posting. Example: "2d76b324c36510012c2e765c9e0b0000"')
    })
    .describe('Input for retrieving a single job posting');

const OutputSchema = z
    .object({
        id: z.string().optional().describe('Workday ID of the job posting'),
        title: z.string().optional().describe('Job posting title'),
        jobDescription: z.string().optional().describe('Detailed job description'),
        url: z.string().optional().describe('External career site URL for the posting'),
        startDate: z.string().optional().describe('Date the posting became active'),
        spotlightJob: z.boolean().optional().describe('Whether the posting is featured/spotlighted'),
        timeType: WorkdayReferenceSchema.optional().describe('Full-time or part-time designation'),
        jobType: WorkdayReferenceSchema.optional().describe('Job type (e.g. Regular, Temporary)'),
        primaryLocation: LocationSchema.optional().describe('Primary work location for the position'),
        categories: z.array(WorkdayReferenceSchema).optional().describe('Categories or job families for the posting'),
        jobSite: WorkdayReferenceSchema.optional().describe('Career site where the posting is published'),
        company: WorkdayReferenceSchema.optional().describe('Company or organization for the posting')
    })
    .describe('A single job posting from Workday');

const ProviderJobPostingSchema = z
    .object({
        id: z.string().optional(),
        title: z.string().optional(),
        jobDescription: z.string().optional(),
        url: z.string().optional(),
        startDate: z.string().optional(),
        spotlightJob: z.boolean().optional(),
        timeType: WorkdayReferenceSchema.optional(),
        jobType: WorkdayReferenceSchema.optional(),
        primaryLocation: LocationSchema.optional(),
        categories: z.array(WorkdayReferenceSchema).optional(),
        jobSite: WorkdayReferenceSchema.optional(),
        company: WorkdayReferenceSchema.optional()
    })
    .passthrough();

/**
 * @tags: [read]
 * @tagReason: Retrieves a single job posting by ID from the Workday recruiting API.
 * @pitfalls: Returns job posting fields (url, jobSite, spotlightJob, categories) rather than traditional requisition fields (requisitionNumber, status, hiringManager); jobDescription contains HTML markup.
 */
const action = createAction({
    description: 'Get a single job requisition by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_recruiting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenant = connection.connection_config?.['tenant'];

        if (!tenant || typeof tenant !== 'string') {
            const metadata = z.object({ tenant: z.string().optional() }).parse(await nango.getMetadata());
            tenant = metadata.tenant;
        }

        if (!tenant || typeof tenant !== 'string') {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Tenant is missing in connection configuration.'
            });
        }

        const HttpErrorSchema = z.object({ status: z.number().optional(), response: z.object({ status: z.number().optional() }).optional() }).passthrough();

        // https://community.workday.com/api/recruiting/v1/jobPostings/{id}
        let response;
        // @allowTryCatch: nango.get throws on non-2xx responses; a missing posting must be translated to a not_found ActionError.
        try {
            response = await nango.get({
                endpoint: `recruiting/v1/${encodeURIComponent(tenant)}/jobPostings/${encodeURIComponent(input.id)}`,
                retries: 3
            });
        } catch (err) {
            const parsedError = HttpErrorSchema.safeParse(err);
            const status = parsedError.success ? (parsedError.data.status ?? parsedError.data.response?.status) : undefined;
            if (status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Job posting not found for ID: ${input.id}`
                });
            }
            throw err;
        }

        const providerPosting = ProviderJobPostingSchema.parse(response.data);

        return {
            id: providerPosting.id,
            ...(providerPosting.title !== undefined && { title: providerPosting.title }),
            ...(providerPosting.jobDescription !== undefined && { jobDescription: providerPosting.jobDescription }),
            ...(providerPosting.url !== undefined && { url: providerPosting.url }),
            ...(providerPosting.startDate !== undefined && { startDate: providerPosting.startDate }),
            ...(providerPosting.spotlightJob !== undefined && { spotlightJob: providerPosting.spotlightJob }),
            ...(providerPosting.timeType !== undefined && { timeType: providerPosting.timeType }),
            ...(providerPosting.jobType !== undefined && { jobType: providerPosting.jobType }),
            ...(providerPosting.primaryLocation !== undefined && { primaryLocation: providerPosting.primaryLocation }),
            ...(providerPosting.categories !== undefined && { categories: providerPosting.categories }),
            ...(providerPosting.jobSite !== undefined && { jobSite: providerPosting.jobSite }),
            ...(providerPosting.company !== undefined && { company: providerPosting.company })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
