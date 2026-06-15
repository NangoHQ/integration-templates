import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('Zoho internal record ID. Example: "972601000000306098"')
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.array(z.record(z.string(), z.unknown())),
        message: z.string().optional(),
        status: z.number().optional(),
        uri: z.string().optional()
    })
});

const OutputSchema = z.object({
    recordId: z.string(),
    sections: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Retrieve a single employee by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-employee',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.forms.ALL', 'ZohoPeople.employees.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/people/api/forms/employee/getRecordByID',
            params: {
                recordId: input.recordId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho People API',
                details: providerResponse.error.message
            });
        }

        const envelope = providerResponse.data.response;

        if (envelope.status !== undefined && envelope.status !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: envelope.message || 'Zoho People API returned an error',
                status: envelope.status
            });
        }

        if (!envelope.result || envelope.result.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                recordId: input.recordId
            });
        }

        const sections = envelope.result[0];
        if (!sections) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                recordId: input.recordId
            });
        }

        return {
            recordId: input.recordId,
            sections
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
