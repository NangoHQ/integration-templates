import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,4c97403e-1663-4673-90fa-d2f8690b4510,29d15734-3d19-43f6-976b-43ece3ff81a8"')
});

const ProviderDriveSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    driveType: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    driveType: z.string().optional()
});

const action = createAction({
    description: 'Get the default document library (drive) for a SharePoint site.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/site-get-drive
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drive`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive not found for the given site.'
            });
        }

        const providerDrive = ProviderDriveSchema.parse(response.data);

        return {
            id: providerDrive.id,
            ...(providerDrive.name !== undefined && { name: providerDrive.name }),
            ...(providerDrive.webUrl !== undefined && { webUrl: providerDrive.webUrl }),
            ...(providerDrive.driveType !== undefined && { driveType: providerDrive.driveType })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
