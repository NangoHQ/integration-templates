import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional(),
    title: z.string().optional()
});

const ProviderUserResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z
            .object({
                name: z.string().nullable().optional(),
                title: z.string().nullable().optional()
            })
            .passthrough()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    title: z.string().optional()
});

const action = createAction({
    description: 'Update the profile of the user this connection authenticates as (name/title).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/users/#get-current-user
        const getResponse = await nango.get({
            endpoint: 'v2/current_user',
            retries: 10
        });

        const getData = ProviderUserResponseSchema.parse(getResponse.data);
        const userId = getData.data.id;

        const attributes: { name?: string; title?: string } = {};
        if (input.name !== undefined) {
            attributes.name = input.name;
        }
        if (input.title !== undefined) {
            attributes.title = input.title;
        }

        // https://docs.datadoghq.com/api/latest/users/#update-current-user
        const patchResponse = await nango.patch({
            endpoint: 'v2/current_user',
            data: {
                data: {
                    type: 'users',
                    id: userId,
                    attributes
                }
            },
            retries: 10
        });

        const patchData = ProviderUserResponseSchema.parse(patchResponse.data);

        return {
            id: patchData.data.id,
            ...(patchData.data.attributes.name != null && { name: patchData.data.attributes.name }),
            ...(patchData.data.attributes.title != null && { title: patchData.data.attributes.title })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
