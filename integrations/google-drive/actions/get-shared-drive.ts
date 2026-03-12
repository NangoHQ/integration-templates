import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the shared drive to retrieve. Example: "0ACo-2dj5Ql07Uk9PVA"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    kind: z.union([z.string(), z.null()]),
    themeId: z.union([z.string(), z.null()]),
    colorRgb: z.union([z.string(), z.null()]),
    backgroundImageFile: z.union([z.object({}).passthrough(), z.null()]),
    capabilities: z.union([z.object({}).passthrough(), z.null()]),
    restrictions: z.union([z.object({}).passthrough(), z.null()]),
    hidden: z.union([z.boolean(), z.null()]),
    createdTime: z.union([z.string(), z.null()]),
    orgUnitId: z.union([z.string(), z.null()])
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
            name: drive.name ?? null,
            kind: drive.kind ?? null,
            themeId: drive.themeId ?? null,
            colorRgb: drive.colorRgb ?? null,
            backgroundImageFile: drive.backgroundImageFile ?? null,
            capabilities: drive.capabilities ?? null,
            restrictions: drive.restrictions ?? null,
            hidden: drive.hidden ?? null,
            createdTime: drive.createdTime ?? null,
            orgUnitId: drive.orgUnitId ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
