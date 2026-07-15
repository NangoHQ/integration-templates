import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    query: z.string().describe('GAQL query string. Example: "SELECT campaign.id, campaign.name FROM campaign LIMIT 10"'),
    pageToken: z.string().optional().describe('Pagination token from the previous response. Omit for the first page.'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through a manager hierarchy. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const SearchResponseSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())).optional(),
    nextPageToken: z.string().optional(),
    fieldMask: z.string().optional()
});

const OutputSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())).optional(),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'Run a GAQL query and return paged Google Ads rows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://developers.google.com/google-ads/api/docs/reporting/streaming
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/googleAds:search`,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId !== undefined && { 'login-customer-id': input.loginCustomerId })
            },
            data: {
                query: input.query,
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const searchResponse = SearchResponseSchema.parse(response.data);

        return {
            ...(searchResponse.results !== undefined && { results: searchResponse.results }),
            ...(searchResponse.nextPageToken !== undefined && { nextPageToken: searchResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
