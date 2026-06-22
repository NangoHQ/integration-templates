import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Unique identifier for the Tag. Example: 2733978'),
    name: z.string().optional().describe('Name of the tag. Must be unique. Example: "Tier 2 Customer"'),
    color: z.string().optional().describe('Color of the tag in hexadecimal format. Example: "#00B388"'),
    description: z.string().nullable().optional().describe('Description of the tag. Set to null to clear. Example: "High priority clients"')
});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Update a user-created tag in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Fetch the existing tag so we can merge omitted fields (PUT is full replace).
        // https://developer.aircall.io/api-references/#retrieve-a-tag
        const getResponse = await nango.get({
            endpoint: `/v1/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const rawGetData = getResponse.data;
        if (!rawGetData || typeof rawGetData !== 'object' || !('tag' in rawGetData)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tag not found or provider returned an unexpected response.'
            });
        }

        const existingTag = ProviderTagSchema.parse(rawGetData.tag);

        const updateBody = {
            name: input.name !== undefined ? input.name : existingTag.name,
            color: input.color !== undefined ? input.color : existingTag.color,
            description: input.description !== undefined ? input.description : existingTag.description
        };

        // https://developer.aircall.io/api-references/#update-a-tag
        const putResponse = await nango.put({
            endpoint: `/v1/tags/${encodeURIComponent(input.id)}`,
            data: updateBody,
            retries: 3
        });

        const rawPutData = putResponse.data;
        if (!rawPutData || typeof rawPutData !== 'object' || !('tag' in rawPutData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response after updating the tag.'
            });
        }

        const updatedTag = ProviderTagSchema.parse(rawPutData.tag);

        return {
            id: updatedTag.id,
            name: updatedTag.name,
            color: updatedTag.color,
            ...(updatedTag.description != null && { description: updatedTag.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
