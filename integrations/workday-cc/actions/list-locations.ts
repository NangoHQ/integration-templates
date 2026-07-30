import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset. Omit for the first page.')
});

const LocationOutputSchema = z.object({
    id: z.string(),
    reference_id: z.string().optional(),
    name: z.string(),
    location_usage: z.string().optional(),
    country: z.string().optional(),
    inactive: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(LocationOutputSchema),
    next_page: z.string().optional().describe('Next page offset for pagination.')
});

// Workday's Staffing REST API has no dedicated Location master-data resource; the "prompt values"
// endpoint used for job-change location pickers is the closest available substitute (id/descriptor only).
const ProviderLocationValueSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLocationValueSchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List locations from Workday with pagination support.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/values~jobChangesGroup~locations
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/values/jobChangesGroup/locations`,
            params: { limit: PAGE_SIZE, offset },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = (providerResponse.data ?? []).map((location) => ({
            id: location.id,
            name: location.descriptor ?? ''
        }));

        const total = providerResponse.total ?? offset + items.length;
        const hasMoreData = offset + items.length < total;

        return {
            items,
            ...(hasMoreData && { next_page: String(offset + PAGE_SIZE) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
