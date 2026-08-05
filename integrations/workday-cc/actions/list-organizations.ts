import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';
const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset. Omit for the first page.')
});

// Workday's Staffing REST API only exposes Supervisory Organizations, unlike the SOAP Human
// Resources API which covered every organization type (company, cost center, matrix, etc.).
const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    description: z.string().optional(),
    inactive: z.boolean(),
    external_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OrganizationSchema),
    next_cursor: z.string().optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    inactive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderOrganizationSchema).optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'List organizations from Workday.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/supervisoryOrganizations
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/supervisoryOrganizations`,
            params: {
                limit: PAGE_SIZE,
                offset,
                includeInactive: 'true'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const items = (providerResponse.data ?? []).map((org) => ({
            id: org.id,
            name: org.name ?? '',
            type: 'Supervisory',
            inactive: org.inactive ?? false,
            external_id: org.code
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
