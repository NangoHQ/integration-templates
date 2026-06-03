import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,4c97403e-1663-4673-90fa-d2f8690b4510,29d15734-3d19-43f6-976b-43ece3ff81a8"'),
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('Drive item ID. Example: "01RFYLAYF2MHKA54O4TZDL5SKCE4MJLIUJ"'),
    versionId: z.string().describe('Version ID to restore. Example: "1.0"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Restore a previous version of a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/restore-drive-item-version',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitemversion-restoreversion?view=graph-rest-1.0
        const response = await nango.post({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/versions/${encodeURIComponent(input.versionId)}/restoreVersion`,
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'restore_failed',
                message: `Expected 204 No Content, but received ${response.status}.`,
                siteId: input.siteId,
                driveId: input.driveId,
                itemId: input.itemId,
                versionId: input.versionId
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
