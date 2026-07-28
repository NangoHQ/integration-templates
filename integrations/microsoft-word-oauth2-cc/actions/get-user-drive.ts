import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "aea0ba47-35e8-4a85-92bb-03ea32f9d3f6"')
});

const ProviderDriveSchema = z.object({
    id: z.string(),
    driveType: z.string().nullish(),
    name: z.string().nullish(),
    webUrl: z.string().nullish(),
    owner: z
        .object({
            user: z
                .object({
                    id: z.string().nullish(),
                    displayName: z.string().nullish()
                })
                .nullish()
        })
        .nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    driveType: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    owner: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: "Get a user's personal OneDrive (drive).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/drive-get
        const response = await nango.get({
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}/drive`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User drive not found',
                userId: input.userId
            });
        }

        const providerDrive = ProviderDriveSchema.parse(response.data);
        const ownerUser = providerDrive.owner?.user;

        return {
            id: providerDrive.id,
            ...(providerDrive.driveType != null && { driveType: providerDrive.driveType }),
            ...(providerDrive.name != null && { name: providerDrive.name }),
            ...(providerDrive.webUrl != null && { webUrl: providerDrive.webUrl }),
            ...(ownerUser != null && {
                owner: {
                    user: {
                        ...(ownerUser.id != null && { id: ownerUser.id }),
                        ...(ownerUser.displayName != null && { displayName: ownerUser.displayName })
                    }
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
