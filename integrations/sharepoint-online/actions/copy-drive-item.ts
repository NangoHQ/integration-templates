import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,4c97403e-1663-4673-90fa-d2f8690b4510,29d15734-3d19-43f6-976b-43ece3ff81a8"'),
    driveId: z.string().describe('Source drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Source drive item ID. Example: "01RFYLAYAB3LJFGWGL6NFZAM6DHUS3QPWZ"'),
    parentDriveId: z.string().describe('Destination drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    parentItemId: z.string().describe('Destination parent folder item ID. Example: "01RFYLAYF6Y2GOVW7725BZO354PWSELRRZ"'),
    name: z.string().optional().describe('Optional new name for the copy. Example: "nango-copy-test-copy.txt"'),
    childrenOnly: z.boolean().optional().describe('If true, only copy children of a folder.'),
    includeAllVersionHistory: z.boolean().optional().describe('If true, preserve all version history.'),
    conflictBehavior: z.enum(['fail', 'replace', 'rename']).optional().describe('How to handle name conflicts.')
});

const OutputSchema = z.object({
    status: z.string(),
    monitorUrl: z.string().optional(),
    operationId: z.string().optional()
});

const action = createAction({
    description: 'Copy a file or folder to another location in a site drive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/copy-drive-item',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            parentReference: {
                driveId: input.parentDriveId,
                id: input.parentItemId
            }
        };

        if (input.name !== undefined) {
            requestBody['name'] = input.name;
        }

        if (input.childrenOnly !== undefined) {
            requestBody['childrenOnly'] = input.childrenOnly;
        }

        if (input.includeAllVersionHistory !== undefined) {
            requestBody['includeAllVersionHistory'] = input.includeAllVersionHistory;
        }

        const postConfig: {
            endpoint: string;
            data: Record<string, unknown>;
            params?: Record<string, string>;
            retries: number;
        } = {
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/copy`,
            data: requestBody,
            retries: 3
        };

        if (input.conflictBehavior !== undefined) {
            postConfig.params = {
                '@microsoft.graph.conflictBehavior': input.conflictBehavior
            };
        }

        // https://learn.microsoft.com/graph/api/driveitem-copy
        const response = await nango.post(postConfig);

        if (response.status !== 202 && response.status !== 200) {
            throw new nango.ActionError({
                type: 'copy_failed',
                message: `Copy request failed with status ${response.status}`,
                status: response.status
            });
        }

        const locationHeader = response.headers['location'];
        const monitorUrl = typeof locationHeader === 'string' ? locationHeader : undefined;

        let operationId: string | undefined;
        if (monitorUrl) {
            const match = monitorUrl.match(/\/monitor\/([^/]+)$/);
            if (match) {
                operationId = match[1];
            }
        }

        return {
            status: 'accepted',
            monitorUrl,
            operationId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
