import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    applicationId: z.string().min(1).describe('The unique identifier for the application object. Example: "cc67332f-dfd9-43f0-af0f-bc0ff5334965"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    applicationId: z.string()
});

const action = createAction({
    description: 'Delete or archive an application in Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/application-delete
        await nango.delete({
            endpoint: `/v1.0/applications/${encodeURIComponent(input.applicationId)}`,
            retries: 3
        });

        return {
            success: true,
            applicationId: input.applicationId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
