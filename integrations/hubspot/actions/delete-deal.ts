import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealId: z.string().describe('The ID of the deal to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a deal record',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-deal',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm/deals
        await nango.delete({
            endpoint: `/crm/v3/objects/deals/${input.dealId}`,
            retries: 3
        });

        return {
            success: true,
            message: `Deal ${input.dealId} deleted successfully`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
