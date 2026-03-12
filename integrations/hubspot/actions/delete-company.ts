import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('HubSpot Company ID to delete. Example: "123456789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete a company record',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-company',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-companies-v3/basic/delete-crm-v3-objects-companies-companyId
        await nango.delete({
            endpoint: `/crm/v3/objects/companies/${input.id}`,
            retries: 10
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
