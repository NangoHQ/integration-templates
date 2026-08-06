import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ExportInputSchema = z
    .object({
        emails: z.array(z.string().email()).min(1).max(10),
        request_type: z.literal('EXPORT'),
        start_date: z.string().describe('Start date in ISO 8601 format. Example: 2024-01-01T00:00:00Z'),
        end_date: z.string().describe('End date in ISO 8601 format. Must be strictly after start_date. Example: 2024-12-31T23:59:59Z')
    })
    .refine((data) => data.end_date > data.start_date, {
        message: 'end_date must be strictly after start_date',
        path: ['end_date']
    });

const DeleteInputSchema = z.object({
    emails: z.array(z.string().email()).min(1).max(10),
    request_type: z.literal('DELETE')
});

const InputSchema = z.discriminatedUnion('request_type', [ExportInputSchema, DeleteInputSchema]);

const ProviderResponseItemSchema = z.object({
    email: z.string(),
    request_id: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResponseItemSchema)
});

const OutputSchema = z.object({
    data: z.array(
        z.object({
            email: z.string(),
            request_id: z.string()
        })
    )
});

const action = createAction({
    description: 'File a GDPR-style data export or deletion request for a specific internal user by email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data_request:write:data_request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            emails: input.emails,
            request_type: input.request_type
        };

        if (input.request_type === 'EXPORT') {
            body['start_date'] = input.start_date;
            body['end_date'] = input.end_date;
        }

        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#tag/data-compliance/operation/createDataRequest
            endpoint: '/v2/data_requests/requests',
            data: body,
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return {
            data: providerResponse.data.map((item) => ({
                email: item.email,
                request_id: item.request_id
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
