import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.number().describe('The ID of the company file to delete. Example: 123')
});

const OutputSchema = z.object({
    success: z.boolean(),
    fileId: z.number()
});

const action = createAction({
    description: 'Permanently delete a company file in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-company-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/delete-company-file
        await nango.delete({
            endpoint: `/v1/files/${encodeURIComponent(String(input.fileId))}`,
            retries: 3
        });

        return {
            success: true,
            fileId: input.fileId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
