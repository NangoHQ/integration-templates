import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the list to update. Example: "UgA2kN"'),
    name: z.string().describe('The new name for the list. Example: "Updated List Name"')
});

const ProviderListSchema = z.object({
    data: z
        .object({
            type: z.string(),
            id: z.string(),
            attributes: z
                .object({
                    name: z.string().optional()
                })
                .optional(),
            relationships: z.unknown().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Update a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/update_list
        const response = await nango.patch({
            endpoint: `/api/lists/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'list',
                    id: input.id,
                    attributes: {
                        name: input.name
                    }
                }
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        if (!providerList.data) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The API response did not contain the expected list data.'
            });
        }

        return {
            id: providerList.data.id,
            ...(providerList.data.attributes?.name != null && { name: providerList.data.attributes.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
