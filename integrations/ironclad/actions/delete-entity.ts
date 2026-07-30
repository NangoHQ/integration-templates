import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityId: z.string().describe('The unique identifier of the entity to delete. Example: "9bb40d70-5e85-4894-b2fe-e945d9fb2f11"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an entity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/entities/${encodeURIComponent(input.entityId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
