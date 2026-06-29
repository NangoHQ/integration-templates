import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Item ID. Example: "1c0a1580-8e05-4c9d-a898-0148d213d8ec"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const action = createAction({
    description: 'Delete an item/product by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const meResponse = await nango.get({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapibusinessexample
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const currentDivision = meData.d.results[0]?.CurrentDivision;

        if (currentDivision === undefined) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from Me endpoint.'
            });
        }

        const deleteResponse = await nango.delete({
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapibusinessexample
            endpoint: `/api/v1/${currentDivision}/logistics/Items(guid'${encodeURIComponent(input.id)}')`,
            retries: 3
        });

        if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Item deletion failed.',
                status: deleteResponse.status,
                id: input.id
            });
        }

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
