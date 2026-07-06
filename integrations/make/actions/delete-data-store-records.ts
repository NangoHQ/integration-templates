import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        dataStoreId: z.number().describe('The ID of the data store. Example: 141641'),
        keys: z.array(z.string()).optional().describe('The keys of data store records to delete.'),
        all: z.boolean().optional().describe('Set to true to delete all records in the data store.'),
        exceptKeys: z.array(z.string()).optional().describe('Keys of records to keep when deleting all records.')
    })
    .refine(
        (data) => {
            const hasKeys = data.keys !== undefined && data.keys.length > 0;
            const hasAll = data.all === true;
            if (hasKeys) {
                return !hasAll && data.exceptKeys === undefined;
            }
            if (hasAll) {
                return true;
            }
            return false;
        },
        {
            message: 'Provide either keys (without all or exceptKeys) or all=true (with optional exceptKeys).'
        }
    );

const OutputSchema = z.object({
    keys: z.array(z.string()).describe('Keys of the deleted records.')
});

const action = createAction({
    description: 'Delete one or more records from a data store.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['datastores:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            keys?: string[];
            all?: boolean;
            exceptKeys?: string[];
        } = {};
        if (input.keys !== undefined && input.keys.length > 0) {
            body.keys = input.keys;
        } else if (input.all === true) {
            body.all = true;
            if (input.exceptKeys !== undefined && input.exceptKeys.length > 0) {
                body.exceptKeys = input.exceptKeys;
            }
        }

        // https://developers.make.com/api-documentation/
        const response = await nango.delete({
            endpoint: `/data-stores/${encodeURIComponent(String(input.dataStoreId))}/data`,
            params: {
                confirmed: 'true'
            },
            data: body,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'The API returned an empty response.'
            });
        }

        const result = z
            .object({
                keys: z.array(z.string())
            })
            .parse(response.data);

        return {
            keys: result.keys
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
