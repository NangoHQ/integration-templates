import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    kind: z.string(),
    user: z
        .object({
            kind: z.string(),
            displayName: z.string().optional(),
            photoLink: z.string().optional(),
            me: z.boolean().optional(),
            permissionId: z.string().optional(),
            emailAddress: z.string().optional()
        })
        .passthrough(),
    storageQuota: z
        .object({
            limit: z.string().optional(),
            usage: z.string().optional(),
            usageInDrive: z.string().optional(),
            usageInDriveTrash: z.string().optional()
        })
        .passthrough()
        .optional(),
    importFormats: z.record(z.string(), z.array(z.string())).optional(),
    exportFormats: z.record(z.string(), z.array(z.string())).optional(),
    maxImportSizes: z.record(z.string(), z.string()).optional(),
    maxUploadSize: z.string().optional(),
    appInstalled: z.boolean().optional(),
    folderColorPalette: z.array(z.string()).optional(),
    teamDriveThemes: z
        .array(
            z.object({
                id: z.string(),
                backgroundImageLink: z.string(),
                colorRgb: z.string()
            })
        )
        .optional(),
    driveThemes: z
        .array(
            z.object({
                id: z.string(),
                backgroundImageLink: z.string(),
                colorRgb: z.string()
            })
        )
        .optional(),
    canCreateTeamDrives: z.boolean().optional(),
    canCreateDrives: z.boolean().optional()
});

const action = createAction({
    description: "Get the user's drive info and storage quota",
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-about',
        group: 'Drive'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get
        const response = await nango.get({
            endpoint: '/drive/v3/about',
            params: {
                fields: '*'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive info not found'
            });
        }

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
