import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID or user principal name. Example: "test_api@nango.dev"')
});

const ProviderDriveSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional(),
    owner: z
        .object({
            user: z
                .object({
                    displayName: z.string().optional(),
                    id: z.string().optional()
                })
                .optional()
        })
        .optional(),
    quota: z
        .object({
            total: z.number().optional(),
            used: z.number().optional(),
            remaining: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional(),
    ownerName: z.string().optional(),
    ownerId: z.string().optional(),
    quotaTotal: z.number().optional(),
    quotaUsed: z.number().optional(),
    quotaRemaining: z.number().optional()
});

const action = createAction({
    description: "Get a user's personal OneDrive (drive).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/drive-get
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}/drive`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive not found for user',
                userId: input.userId
            });
        }

        const drive = ProviderDriveSchema.parse(response.data);

        return {
            id: drive.id,
            ...(drive.name != null && { name: drive.name }),
            ...(drive.driveType != null && { driveType: drive.driveType }),
            ...(drive.webUrl != null && { webUrl: drive.webUrl }),
            ...(drive.owner?.user?.displayName != null && { ownerName: drive.owner.user.displayName }),
            ...(drive.owner?.user?.id != null && { ownerId: drive.owner.user.id }),
            ...(drive.quota?.total != null && { quotaTotal: drive.quota.total }),
            ...(drive.quota?.used != null && { quotaUsed: drive.quota.used }),
            ...(drive.quota?.remaining != null && { quotaRemaining: drive.quota.remaining })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
