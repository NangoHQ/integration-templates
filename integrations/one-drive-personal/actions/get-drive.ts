import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const QuotaSchema = z.object({
    deleted: z.number().optional(),
    remaining: z.number().optional(),
    state: z.string().optional(),
    total: z.number().optional(),
    used: z.number().optional()
});

const DriveSchema = z.object({
    id: z.string(),
    driveType: z.string(),
    owner: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional()
        })
        .optional(),
    quota: QuotaSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    driveType: z.string(),
    owner: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional()
        })
        .optional(),
    quota: QuotaSchema.optional()
});

const action = createAction({
    description: 'Retrieve the personal drive metadata',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/drive_get
        const response = await nango.get({
            endpoint: '/v1.0/drive',
            retries: 3
        });

        const drive = DriveSchema.parse(response.data);

        return {
            id: drive.id,
            driveType: drive.driveType,
            ...(drive.owner !== undefined && { owner: drive.owner }),
            ...(drive.quota !== undefined && { quota: drive.quota })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
