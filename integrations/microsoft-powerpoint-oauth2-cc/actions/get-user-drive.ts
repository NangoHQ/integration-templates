import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z
        .string()
        .optional()
        .describe('User ID or user principal name. Omit to get the connected user\'s drive. Example: "test_api@nango.dev"')
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
    description: "Get the connected user's OneDrive, or another user's drive when a user ID is provided.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = input.userId ? `/v1.0/users/${encodeURIComponent(input.userId)}/drive` : '/v1.0/me/drive';
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/drive-get
            // Docs list Application as unsupported for the /users route, but it works with app-only auth given Files.Read.All (verified against a live CC connection).
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: input.userId ? 'Drive not found for user' : 'Drive not found for connected user',
                ...(input.userId && { userId: input.userId })
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
