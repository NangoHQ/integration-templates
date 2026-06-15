import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const PermissionDetailsSchema = z.object({
    Add: z.number(),
    Edit: z.number(),
    View: z.number()
});

const ViewDetailsSchema = z
    .object({
        view_Id: z.union([z.string(), z.number()]).optional(),
        view_Name: z.string().optional()
    })
    .passthrough();

const FormSchema = z
    .object({
        componentId: z.union([z.string(), z.number()]),
        formLinkName: z.string(),
        displayName: z.string(),
        PermissionDetails: PermissionDetailsSchema.optional(),
        viewDetails: z.union([ViewDetailsSchema, z.array(ViewDetailsSchema)]).optional(),
        iscustom: z.boolean().optional(),
        isVisible: z.boolean().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.array(FormSchema).optional(),
        message: z.string().optional(),
        status: z.number().optional()
    })
});

const OutputSchema = z.array(FormSchema);

const action = createAction({
    description: 'List all form definitions in the organisation.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-forms',
        group: 'Forms'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.forms.READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/people/api/forms-api/fetch-forms.html
            endpoint: '/people/api/forms',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.response.status !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.response.message || 'Failed to fetch forms',
                status: providerResponse.response.status
            });
        }

        const forms = providerResponse.response.result || [];

        return forms;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
