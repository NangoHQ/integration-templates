import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    integrationId: z.union([z.string(), z.number()]).describe('Integration ID generated when creating the integration. Example: "5517027188234206000"'),
    clientRequestId: z.string().describe('The client request ID used in the asynchronous endpoint you want to get a status for. Example: abc-123')
});

const LineErrorSchema = z.object({
    line: z.number().optional(),
    description: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference ID, generated for this request.'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'FAILED']).describe('Request status.'),
    errors: z.array(LineErrorSchema).optional().describe('List of errors when status is FAILED.'),
    totalErrorCount: z.number().optional().describe('Number of objects that failed parsing.'),
    totalSuccessCount: z.number().optional().describe('Number of valid objects.')
});

const ErrorResponseSchema = z.object({
    requestId: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Check the status of an async CRM upload request.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-crm-request-status',
        group: 'CRM'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:crm:upload'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/apidocs/get-request-status-v2crmrequest-status
            endpoint: '/v2/crm/request-status',
            params: {
                integrationId: String(input.integrationId),
                clientRequestId: input.clientRequestId
            },
            retries: 3
        });

        if (response.status !== 200) {
            const errorData = ErrorResponseSchema.parse(response.data);
            throw new nango.ActionError({
                type: 'api_error',
                message: `Gong API returned status ${response.status}`,
                requestId: errorData.requestId,
                errors: errorData.errors
            });
        }

        const data = OutputSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
