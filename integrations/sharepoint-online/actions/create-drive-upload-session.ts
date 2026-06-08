import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,1234abc"'),
    driveId: z.string().describe('Drive ID. Example: "b!1234567890"'),
    parentItemId: z.string().describe('Parent drive item ID. Example: "01ABC123DEF"'),
    fileName: z.string().describe('Name of the file to upload. Example: "document.pdf"'),
    conflictBehavior: z.enum(['fail', 'replace', 'rename']).optional().describe('Conflict behavior if the file already exists. Default: "fail"'),
    deferCommit: z.boolean().optional().describe('If true, the final creation requires an explicit completion request. Default: false'),
    fileSize: z.number().optional().describe('Size of the file in bytes. Only available for OneDrive personal.'),
    description: z.string().optional().describe('Description of the file. Only available for OneDrive personal.')
});

const OutputSchema = z.object({
    uploadUrl: z.string(),
    expirationDateTime: z.string(),
    nextExpectedRanges: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Start a large file upload session in a site drive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-drive-upload-session',
        group: 'Drives'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        const item: Record<string, unknown> = {
            name: input.fileName
        };

        if (input.conflictBehavior !== undefined) {
            item['@microsoft.graph.conflictBehavior'] = input.conflictBehavior;
        }

        if (input.fileSize !== undefined) {
            item['fileSize'] = input.fileSize;
        }

        if (input.description !== undefined) {
            item['description'] = input.description;
        }

        body['item'] = item;

        if (input.deferCommit !== undefined) {
            body['deferCommit'] = input.deferCommit;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/driveitem-createuploadsession
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentItemId)}:/${encodeURIComponent(input.fileName)}:/createUploadSession`,
            data: body,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
