import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordId: z.string().describe('Zoho internal record ID of the employee. Example: "972601000000306098"'),
    fields: z
        .record(z.string(), z.string())
        .describe('Fields to update. Use internal API field names (case-sensitive). Date fields must use dd-MMM-yyyy format.')
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z
            .object({
                pkId: z.string(),
                message: z.string()
            })
            .optional(),
        message: z.string(),
        uri: z.string(),
        status: z.number(),
        errors: z
            .object({
                code: z.number(),
                message: z.string()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    recordId: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Update an employee record',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZOHOPEOPLE.forms.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const formData = [`recordId=${encodeURIComponent(input.recordId)}`, `inputData=${encodeURIComponent(JSON.stringify(input.fields))}`].join('&');

        const response = await nango.post({
            // https://www.zoho.com/people/api/update-records.html
            endpoint: '/people/api/forms/json/employee/updateRecord',
            data: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        if (providerResponse.response.status !== 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: providerResponse.response.message,
                error_code: providerResponse.response.errors?.code,
                error_message: providerResponse.response.errors?.message
            });
        }

        if (!providerResponse.response.result) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Update succeeded but result was missing in the response'
            });
        }

        return {
            recordId: providerResponse.response.result.pkId,
            message: providerResponse.response.result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
