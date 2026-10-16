import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z
        .string()
        .optional()
        .describe('User ID or user principal name. Omit to get the connected user\'s drive. Example: "api@nango.dev"')
});

const ProviderDriveSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional()
});

const action = createAction({
    description: "Get the connected user's OneDrive, or another user's drive when a user ID is provided.",
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = input.userId ? `/v1.0/users/${encodeURIComponent(input.userId)}/drive` : '/v1.0/me/drive';
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/drive-get
            endpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: input.userId ? 'Drive not found for the given user' : 'Drive not found for the connected user',
                ...(input.userId && { userId: input.userId })
            });
        }

        const providerDrive = ProviderDriveSchema.parse(response.data);

        return {
            id: providerDrive.id,
            ...(providerDrive.name !== undefined && { name: providerDrive.name }),
            ...(providerDrive.driveType !== undefined && { driveType: providerDrive.driveType }),
            ...(providerDrive.webUrl !== undefined && { webUrl: providerDrive.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
