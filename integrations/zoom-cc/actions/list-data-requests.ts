import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_size: z.number().optional().describe('Number of records returned per page. Example: 10'),
    next_page_token: z.string().optional().describe('Pagination token from the previous response. Omit for the first page.')
});

const ProviderRecordSchema = z.object({
    request_id: z.string(),
    request_type: z.string(),
    created_at: z.string(),
    start_at: z.string(),
    end_at: z.string(),
    requestor_user_id: z.string(),
    requestor_name: z.string(),
    account_id: z.string(),
    user_identifier: z.string(),
    data_type: z.array(z.string()),
    state: z.string(),
    files_count: z.coerce.number(),
    failed_reason: z.string().optional(),
    is_current_user: z.boolean()
});

const OutputSchema = z.object({
    total_records: z.number(),
    records: z.array(ProviderRecordSchema),
    next_page_token: z.string().optional()
});

const action = createAction({
    description: 'List the history of data export/deletion requests filed on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data_request:read:list_data_requests'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/#tag/Data-Compliance/GET/data_requests/requests
        const response = await nango.get({
            endpoint: '/v2/data_requests/requests',
            params: {
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.next_page_token !== undefined && { next_page_token: input.next_page_token })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                total_records: z.number(),
                records: z.array(z.unknown()).optional(),
                next_page_token: z.string().optional()
            })
            .parse(response.data);

        const records = (providerResponse.records || []).map((record) => {
            return ProviderRecordSchema.parse(record);
        });

        return {
            total_records: providerResponse.total_records,
            records,
            ...(providerResponse.next_page_token !== undefined && { next_page_token: providerResponse.next_page_token })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
