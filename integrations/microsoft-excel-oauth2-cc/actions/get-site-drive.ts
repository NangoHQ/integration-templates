import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe(
            'The unique identifier for the SharePoint site. Example: "nangodevelopers.sharepoint.com,4c97403e-1663-4673-90fa-d2f8690b4510,29d15734-3d19-43f6-976b-43ece3ff81a8"'
        )
});

const ProviderDriveSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        driveType: z.string().nullable().optional(),
        webUrl: z.string().nullable().optional(),
        createdDateTime: z.string().nullable().optional(),
        lastModifiedDateTime: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Get the default document library (drive) for a SharePoint site.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/site-get-drive
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drive`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Site drive not found',
                siteId: input.siteId
            });
        }

        const providerDrive = ProviderDriveSchema.parse(response.data);

        return {
            id: providerDrive.id,
            ...(providerDrive.name != null && { name: providerDrive.name }),
            ...(providerDrive.driveType != null && { driveType: providerDrive.driveType }),
            ...(providerDrive.webUrl != null && { webUrl: providerDrive.webUrl }),
            ...(providerDrive.createdDateTime != null && { createdDateTime: providerDrive.createdDateTime }),
            ...(providerDrive.lastModifiedDateTime != null && { lastModifiedDateTime: providerDrive.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
