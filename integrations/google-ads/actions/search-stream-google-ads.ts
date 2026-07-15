import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    query: z.string().describe('GAQL query string. Example: "SELECT campaign.id, campaign.name FROM campaign LIMIT 10"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through a manager hierarchy. Example: "3608201627"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderBatchSchema = z
    .object({
        results: z.array(z.record(z.string(), z.unknown())).optional(),
        fieldMask: z.string().optional(),
        summaryRow: z.record(z.string(), z.unknown()).optional(),
        requestId: z.string().optional(),
        nextPageToken: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    rows: z.array(z.record(z.string(), z.unknown())).describe('Flattened array of GoogleAdsRow objects from all batches'),
    fieldMask: z.string().optional().describe('Field mask from the last batch'),
    summaryRow: z.record(z.string(), z.unknown()).optional().describe('Summary row from the last batch'),
    requestId: z.string().optional().describe('Request ID from the last batch'),
    nextPageToken: z.string().optional().describe('Pagination token for subsequent requests')
});

const action = createAction({
    description: 'Run a GAQL query with streamed results',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            endpoint: `/v21/customers/${encodeURIComponent(input.customerId)}/googleAds:searchStream`,
            data: {
                query: input.query
            },
            retries: 3,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId !== undefined && { 'login-customer-id': input.loginCustomerId })
            }
        });

        const batches = parseBatches(response.data);

        const rows: Record<string, unknown>[] = [];
        let fieldMask: string | undefined;
        let summaryRow: Record<string, unknown> | undefined;
        let requestId: string | undefined;
        let nextPageToken: string | undefined;

        for (const batch of batches) {
            if (batch.results) {
                rows.push(...batch.results);
            }
            if (batch.fieldMask) {
                fieldMask = batch.fieldMask;
            }
            if (batch.summaryRow) {
                summaryRow = batch.summaryRow;
            }
            if (batch.requestId) {
                requestId = batch.requestId;
            }
            if (batch.nextPageToken) {
                nextPageToken = batch.nextPageToken;
            }
        }

        return {
            rows,
            ...(fieldMask !== undefined && { fieldMask }),
            ...(summaryRow !== undefined && { summaryRow }),
            ...(requestId !== undefined && { requestId }),
            ...(nextPageToken !== undefined && { nextPageToken })
        };
    }
});

function parseBatches(data: unknown): z.infer<typeof ProviderBatchSchema>[] {
    if (Array.isArray(data)) {
        return data.map((item) => ProviderBatchSchema.parse(item));
    }

    if (data !== null && typeof data === 'object') {
        return [ProviderBatchSchema.parse(data)];
    }

    return [];
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
