import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the tag. Example: "Priority"'),
    color: z.string().optional().describe('The hex color of the tag. Example: "#FF5733"'),
    description: z.string().optional().describe('The description of the tag.')
});

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    tag: ProviderTagSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create a tag in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { name: string; color?: string; description?: string } = {
            name: input.name
        };

        if (input.color !== undefined) {
            body.color = input.color;
        }

        if (input.description !== undefined) {
            body.description = input.description;
        }

        // https://developer.aircall.io/api-references/#create-a-tag
        const response = await nango.post({
            endpoint: '/v1/tags',
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Aircall API',
                details: parsed.error.issues
            });
        }

        const tag = parsed.data.tag;
        const output: z.infer<typeof OutputSchema> = {
            id: tag.id,
            name: tag.name
        };

        if (tag.color != null) {
            output.color = tag.color;
        }

        if (tag.description != null) {
            output.description = tag.description;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
