import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the shared drive to retrieve. Example: "0ACo-2dj5Ql07Uk9PVA"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    kind: z.string().optional(),
    themeId: z.string().optional(),
    colorRgb: z.string().optional(),
    backgroundImageFile: z.object({}).passthrough().optional(),
    capabilities: z.object({}).passthrough().optional(),
    restrictions: z.object({}).passthrough().optional(),
    hidden: z.boolean().optional(),
    createdTime: z.string().optional(),
    orgUnitId: z.string().optional()
});

const action = createAction({
    description: 'Get a shared drive by ID',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-shared-drive',
        group: 'Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/get
        const response = await nango.get({
            endpoint: `/drive/v3/drives/${input.id}`,
            params: {
                useDomainAdminAccess: 'false'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Shared drive not found',
                id: input.id
            });
        }

        const drive = response.data;

        return {
            id: drive.id,
            name: drive.name ?? undefined,
            kind: drive.kind ?? undefined,
            themeId: drive.themeId ?? undefined,
            colorRgb: drive.colorRgb ?? undefined,
            backgroundImageFile: drive.backgroundImageFile ?? undefined,
            capabilities: drive.capabilities ?? undefined,
            restrictions: drive.restrictions ?? undefined,
            hidden: drive.hidden ?? undefined,
            createdTime: drive.createdTime ?? undefined,
            orgUnitId: drive.orgUnitId ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
