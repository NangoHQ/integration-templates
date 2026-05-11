import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the company. Example: "5a250dd6"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    company_id: z.string().optional(),
    app_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Delete a company by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'DELETE',
        path: '/actions/delete-company',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Companies/deleteCompany
        const response = await nango.delete({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found or already deleted',
                id: input.id
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.name !== undefined && { name: providerData.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
