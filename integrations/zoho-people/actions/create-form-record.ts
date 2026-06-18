import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    formLinkName: z.string().describe('The form link name. Example: "employee", "department", "designation"'),
    fields: z.record(z.string(), z.string()).describe('Field name to value mapping. Date fields must use dd-MMM-yyyy format.')
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z
            .object({
                pkId: z.string().optional()
            })
            .optional(),
        message: z.string().optional(),
        status: z.number().optional()
    })
});

const OutputSchema = z.object({
    recordId: z.string().optional(),
    message: z.string().optional(),
    status: z.number().optional()
});

const action = createAction({
    description: 'Create a record in any form',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/people/api/overview.html
            endpoint: `/people/api/forms/json/${encodeURIComponent(input.formLinkName)}/insertRecord`,
            params: {
                inputData: JSON.stringify(input.fields)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const responseStatus = providerResponse.response.status;
        const responseMessage = providerResponse.response.message;

        if (responseStatus !== 0) {
            throw new nango.ActionError({
                type: 'form_insert_failed',
                message: responseMessage || 'Form record creation failed',
                status: responseStatus,
                formLinkName: input.formLinkName
            });
        }

        const recordId = providerResponse.response.result?.pkId;

        return {
            recordId: recordId,
            message: responseMessage,
            status: responseStatus
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
