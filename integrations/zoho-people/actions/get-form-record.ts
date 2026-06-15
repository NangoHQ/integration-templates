import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    formLinkName: z.string().describe('The form link name. Example: "employee"'),
    recordId: z.string().describe('The Zoho internal record ID. Example: "972601000000306098"')
});

const RecordSchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.union([z.array(RecordSchema), RecordSchema]).optional(),
        message: z.string().optional(),
        status: z.number(),
        uri: z.string().optional()
    })
});

const OutputSchema = z.object({
    recordId: z.string(),
    record: RecordSchema.optional(),
    status: z.number(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single record from any form by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-form-record',
        group: 'Forms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/people/api/overview.html
            endpoint: `/people/api/forms/${encodeURIComponent(input.formLinkName)}/getRecordByID`,
            params: {
                recordId: input.recordId
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const responseBody = parsedResponse.response;

        if (responseBody.status !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: responseBody.message || 'Failed to fetch record',
                status: responseBody.status
            });
        }

        const result = responseBody.result;

        if (result === undefined || result === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found',
                recordId: input.recordId,
                formLinkName: input.formLinkName
            });
        }

        let record: z.infer<typeof RecordSchema>;
        if (Array.isArray(result)) {
            if (result.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Record not found',
                    recordId: input.recordId,
                    formLinkName: input.formLinkName
                });
            }

            const first = result[0];
            if (first === null || typeof first !== 'object' || Array.isArray(first)) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Unexpected response format from provider',
                    recordId: input.recordId,
                    formLinkName: input.formLinkName
                });
            }

            record = first;
        } else {
            record = result;
        }

        return {
            recordId: input.recordId,
            record: record,
            status: responseBody.status,
            ...(responseBody.message != null && { message: responseBody.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
