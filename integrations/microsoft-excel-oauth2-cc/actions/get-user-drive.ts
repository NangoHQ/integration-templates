import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID or user principal name. Example: "api@nango.dev"')
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
    description: "Get a user's personal OneDrive (drive).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['User.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/resources/drive
            endpoint: `/v1.0/users/${encodeURIComponent(input.userId)}/drive`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive not found for the given user',
                userId: input.userId
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
