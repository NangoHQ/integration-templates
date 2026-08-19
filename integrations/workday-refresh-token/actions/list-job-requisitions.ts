import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return per page. Defaults to 20.')
    })
    .describe('Input for listing job requisitions.');

const LocationSchema = z
    .object({
        id: z.string().describe('Workday ID of the location.'),
        descriptor: z.string().describe('Human-readable name of the location.'),
        country: z
            .object({
                descriptor: z.string().describe('Country name.'),
                alpha3Code: z.string().describe('ISO 3166-1 alpha-3 country code.')
            })
            .optional()
            .describe('Country information for the location.'),
        region: z
            .object({
                descriptor: z.string().describe('Region name.'),
                code: z.string().describe('Region code.')
            })
            .optional()
            .describe('Region information for the location.')
    })
    .describe('A geographic location associated with a job requisition.');

const ReferenceSchema = z
    .object({
        id: z.string().describe('Workday ID of the referenced entity.'),
        descriptor: z.string().describe('Human-readable name of the referenced entity.')
    })
    .describe('A Workday reference object.');

const JobRequisitionSchema = z
    .object({
        id: z.string().describe('Workday ID of the job requisition.'),
        title: z.string().describe('Job title.'),
        url: z.string().describe('Public job posting URL.'),
        startDate: z.string().describe('Start date of the job posting (YYYY-MM-DD).'),
        endDate: z.string().optional().describe('End date of the job posting (YYYY-MM-DD).'),
        primaryLocation: LocationSchema.optional().describe('Primary work location.'),
        additionalLocations: z.array(LocationSchema).optional().describe('Additional work locations.'),
        jobSite: ReferenceSchema.optional().describe('Job site where the posting is published.'),
        jobType: ReferenceSchema.optional().describe('Job type classification.'),
        timeType: ReferenceSchema.optional().describe('Time type classification (e.g., Full time).'),
        company: ReferenceSchema.optional().describe('Company or cost center associated with the requisition.'),
        spotlightJob: z.boolean().optional().describe('Whether the job is spotlighted.'),
        jobDescription: z.string().optional().describe('HTML job description.'),
        categories: z.array(ReferenceSchema).optional().describe('Job categories or departments.')
    })
    .describe('A single job requisition record.');

const OutputSchema = z
    .object({
        items: z.array(JobRequisitionSchema).describe('List of job requisitions.'),
        nextCursor: z.string().optional().describe('Cursor to fetch the next page. Omit when there are no more results.'),
        total: z.number().optional().describe('Total number of job requisitions available.')
    })
    .describe('Output for listing job requisitions.');

/**
 * @tags: [read]
 * @tagReason: Retrieves job requisition data from the Workday recruiting API.
 * @pitfalls: The provider ignores status filters and returns all job postings, including evergreen, filled and closed requisitions.
 */
const action = createAction({
    description: 'List open/filled job requisitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const configSchema = z.object({
            tenant: z.string()
        });
        const parsedConfig = configSchema.safeParse(connection.connection_config);
        if (!parsedConfig.success) {
            throw new nango.ActionError({
                type: 'invalid_connection_config',
                message: 'Missing tenant in connection config.'
            });
        }
        const tenant = parsedConfig.data.tenant;

        const limit = input.limit ?? 20;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string.'
            });
        }

        const response = await nango.get({
            // https://community.workday.com/api
            endpoint: `recruiting/v4/${encodeURIComponent(tenant)}/jobPostings`,
            params: {
                limit: limit,
                offset: offset
            },
            retries: 3
        });

        const providerResponseSchema = z.object({
            total: z.number(),
            data: z.array(JobRequisitionSchema)
        });
        const providerResponse = providerResponseSchema.parse(response.data);

        const hasMore = offset + providerResponse.data.length < providerResponse.total;
        const nextCursor = hasMore ? String(offset + providerResponse.data.length) : undefined;

        return {
            items: providerResponse.data,
            ...(nextCursor !== undefined && { nextCursor: nextCursor }),
            total: providerResponse.total
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
