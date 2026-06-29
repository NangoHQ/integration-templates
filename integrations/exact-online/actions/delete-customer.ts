import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Exact Online Account ID (GUID). Example: "2a64d87a-5e60-442a-84f0-2dff86e9d706"')
});

const MeResponseSchema = z.object({
    d: z.union([
        z.object({
            CurrentDivision: z.number()
        }),
        z.object({
            results: z.array(
                z.object({
                    CurrentDivision: z.number()
                })
            )
        })
    ])
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a customer/account by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Crm.Accounts'],
    endpoint: {
        path: '/actions/delete-customer',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.fr/docs/services/ExactOnlineRESTAPIv1/Operations/Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            params: {
                $select: 'CurrentDivision'
            },
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        let currentDivision: number;
        if ('CurrentDivision' in meData.d) {
            currentDivision = meData.d.CurrentDivision;
        } else {
            const first = meData.d.results[0];
            if (!first) {
                throw new nango.ActionError({
                    type: 'missing_division',
                    message: 'Could not determine current division from Me endpoint.'
                });
            }
            currentDivision = first.CurrentDivision;
        }

        // https://start.exactonline.fr/docs/services/ExactOnlineRESTAPIv1/Operations/Accounts
        await nango.delete({
            endpoint: `/api/v1/${currentDivision}/crm/Accounts(guid'${encodeURIComponent(input.id)}')`,
            retries: 1
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
