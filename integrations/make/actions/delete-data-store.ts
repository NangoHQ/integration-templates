import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        teamId: z.number().describe('The unique ID of the team from which the data store will be deleted. Example: 2066772'),
        ids: z.array(z.number()).optional().describe('The IDs of data stores to delete. Use this or `all`, not both.'),
        all: z.boolean().optional().describe('If set to true, all data stores will be deleted. Use this or `ids`, not both.'),
        exceptIds: z.array(z.number()).optional().describe('The IDs of data stores to be excluded from deleting. Can only be used together with `all: true`.'),
        confirmed: z.boolean().optional().describe('Confirms the deletion if a data store is included in at least one scenario.')
    })
    .refine(
        (data) => {
            const hasIds = data.ids !== undefined && data.ids.length > 0;
            const hasAll = data.all === true;
            return hasIds || hasAll;
        },
        {
            message: 'Either `ids` (non-empty array) or `all: true` must be provided.'
        }
    )
    .refine(
        (data) => {
            const hasIds = data.ids !== undefined && data.ids.length > 0;
            const hasAll = data.all === true;
            return !(hasIds && hasAll);
        },
        {
            message: '`ids` and `all` cannot be used together.'
        }
    )
    .refine(
        (data) => {
            if (data.exceptIds !== undefined) {
                return data.all === true;
            }
            return true;
        },
        {
            message: '`exceptIds` can only be used when `all` is `true`.'
        }
    );

const ProviderResponseSchema = z.object({
    dataStores: z.array(z.number())
});

const OutputSchema = z.object({
    dataStores: z.array(z.number()).describe('The IDs of the deleted data stores.')
});

const action = createAction({
    description: 'Delete one or more data stores from a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {
            teamId: input['teamId']
        };
        if (input['confirmed'] !== undefined) {
            params['confirmed'] = String(input['confirmed']);
        }

        const data: Record<string, unknown> = {};
        if (input['ids'] !== undefined) {
            data['ids'] = input['ids'];
        }
        if (input['all'] !== undefined) {
            data['all'] = input['all'];
        }
        if (input['exceptIds'] !== undefined) {
            data['exceptIds'] = input['exceptIds'];
        }

        // https://developers.make.com/api-documentation/api-reference/data-stores.md
        const response = await nango.delete({
            endpoint: '/data-stores',
            params,
            data,
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            dataStores: providerResponse.dataStores
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
