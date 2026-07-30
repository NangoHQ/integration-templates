import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset. Omit for the first page.')
});

const JobProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    reference_id: z.string().optional(),
    inactive: z.boolean(),
    description: z.string().optional(),
    effective_date: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(JobProfileSchema),
    next_cursor: z.string().optional()
});

const ProviderJobProfileSummarySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderJobProfileSummarySchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List job profiles from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/jobProfiles
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/jobProfiles`,
            params: {
                limit: PAGE_SIZE,
                offset,
                includeInactive: 'true'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = (providerResponse.data ?? []).map((profile) => ({
            id: profile.id,
            name: profile.name ?? '',
            inactive: profile.inactive ?? false
        }));

        const total = providerResponse.total ?? offset + items.length;
        const hasMoreData = offset + items.length < total;

        return {
            items,
            ...(hasMoreData && { next_cursor: String(offset + PAGE_SIZE) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
