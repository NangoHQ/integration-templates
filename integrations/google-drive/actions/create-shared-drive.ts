import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the shared drive. Example: "Project Resources"'),
    requestId: z
        .string()
        .describe(
            'A unique ID (such as a random UUID) that uniquely identifies this request for idempotent creation. A repeated request with the same request ID will not create duplicates.'
        )
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    kind: z.string().optional(),
    colorRgb: z.string().optional(),
    backgroundImageLink: z.string().optional(),
    capabilities: z.any().optional(),
    themeId: z.string().optional(),
    createdTime: z.string().optional(),
    hidden: z.boolean().optional(),
    restrictions: z.any().optional(),
    orgUnitId: z.string().optional()
});

const action = createAction({
    description: 'Create a shared drive',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-shared-drive',
        group: 'Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/create
        const response = await nango.post({
            endpoint: '/drive/v3/drives',
            params: {
                requestId: input.requestId
            },
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create shared drive'
            });
        }

        const drive = response.data;

        return {
            id: drive.id,
            name: drive.name,
            kind: drive.kind ?? undefined,
            colorRgb: drive.colorRgb ?? undefined,
            backgroundImageLink: drive.backgroundImageLink ?? undefined,
            capabilities: drive.capabilities ?? undefined,
            themeId: drive.themeId ?? undefined,
            createdTime: drive.createdTime ?? undefined,
            hidden: drive.hidden ?? undefined,
            restrictions: drive.restrictions ?? undefined,
            orgUnitId: drive.orgUnitId ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
