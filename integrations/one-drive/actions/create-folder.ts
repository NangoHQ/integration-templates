import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parentItemId: z.string().describe('The ID of the parent item where the folder will be created. Use "root" to create in the root.'),
    name: z.string().describe('The name of the new folder.'),
    conflictBehavior: z.enum(['fail', 'replace', 'rename']).optional().describe('The conflict resolution behavior.')
});

const FolderSchema = z.object({
    childCount: z.number().optional()
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    folder: FolderSchema.optional(),
    createdDateTime: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a folder in OneDrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-folder',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/driveitem-post-children
        const response = await nango.post({
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.parentItemId)}/children`,
            data: {
                name: input.name,
                folder: {},
                '@microsoft.graph.conflictBehavior': input.conflictBehavior ?? 'rename'
            },
            retries: 3
        });

        if (response.status !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Unexpected status code: ${response.status}`,
                status: response.status
            });
        }

        const driveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: driveItem.id,
            name: driveItem.name,
            ...(driveItem.webUrl !== undefined && { webUrl: driveItem.webUrl }),
            ...(driveItem.createdDateTime !== undefined && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.parentReference !== undefined && { parentReference: driveItem.parentReference })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
