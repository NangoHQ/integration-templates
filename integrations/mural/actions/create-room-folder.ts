import { z } from 'zod';
import { createAction } from 'nango';

type FolderNode = {
    id: string;
    name: string;
    children: FolderNode[];
};

const FolderNodeSchema: z.ZodType<FolderNode> = z.lazy(() =>
    z
        .object({
            id: z.string().describe('Unique identifier (UUID) of the folder. Example: "3bbfb790-1b07-42da-965d-876cb7bb161b"'),
            name: z.string().describe('Name of the folder. Example: "Project Assets"'),
            children: z.array(FolderNodeSchema).describe('Nested folders contained in this folder, if any.')
        })
        .describe('A folder inside a room, including any nested child folders.')
);

const InputSchema = z
    .object({
        roomId: z.string().describe('ID of the room to create the folder in. Example: "1791984264781658"'),
        name: z.string().describe('Name of the folder to create. Example: "Project Assets"')
    })
    .describe('Parameters needed to create a folder inside a room.');

const ProviderResponseSchema = z.object({
    value: FolderNodeSchema
});

/**
 * @tags: [write]
 * @tagReason: Creates a new folder inside a room, which is a provider mutation.
 */
const action = createAction({
    description: 'Create a folder inside a room, to further organize murals.',
    version: '1.0.0',
    scopes: ['rooms:write'],
    input: InputSchema,
    output: FolderNodeSchema,

    exec: async (nango, input): Promise<z.infer<typeof FolderNodeSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/createfolder
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(input.roomId)}/folders`,
            data: {
                name: input.name
            },
            // Creating a folder is not idempotent: a retry after a lost response would create a duplicate folder.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 for this non-idempotent create
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
