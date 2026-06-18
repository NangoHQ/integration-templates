import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the note to delete. Example: 123')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a note in Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full', 'contacts:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Notes#deleteNote
        const response = await nango.delete({
            endpoint: `/v1/notes/${input.id}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                success: z.boolean(),
                data: z.boolean()
            })
            .parse(response.data);

        return {
            success: providerResponse.success,
            deleted: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
