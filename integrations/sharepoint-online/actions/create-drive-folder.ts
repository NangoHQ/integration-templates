import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,site-id,web-id"'),
    driveId: z.string().describe('Drive (document library) ID. Example: "b!1234567890abcdef"'),
    parentItemId: z.string().describe('Parent item ID where the folder will be created. Example: "0123456789abcdef"'),
    name: z.string().describe('Name of the new folder. Example: "New Folder"'),
    conflictBehavior: z
        .enum(['rename', 'fail', 'replace'])
        .optional()
        .describe('Conflict behavior if a folder with the same name exists. Defaults to "rename".')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a folder in a SharePoint document library.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-drive-folder',
        group: 'Drives'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/driveitem-post-children
        const response = await nango.post({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentItemId)}/children`,
            data: {
                name: input.name,
                folder: {},
                '@microsoft.graph.conflictBehavior': input.conflictBehavior ?? 'rename'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from Microsoft Graph API'
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
