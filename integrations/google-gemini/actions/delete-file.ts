import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('File name. Example: "files/abc123"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Delete an uploaded file from the Gemini Files API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fileId = input.name.startsWith('files/') ? input.name.slice('files/'.length) : input.name;

        // https://ai.google.dev/api/files#delete
        await nango.delete({
            endpoint: `/v1beta/files/${encodeURIComponent(fileId)}`,
            retries: 10
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
