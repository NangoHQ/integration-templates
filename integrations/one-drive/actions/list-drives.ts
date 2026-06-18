import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderDriveSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    driveType: z.string().nullable().optional(),
    owner: z
        .object({
            user: z
                .object({
                    id: z.string().nullable().optional(),
                    displayName: z.string().nullable().optional()
                })
                .optional()
        })
        .optional(),
    quota: z
        .object({
            deleted: z.number().nullable().optional(),
            remaining: z.number().nullable().optional(),
            state: z.string().nullable().optional(),
            total: z.number().nullable().optional(),
            used: z.number().nullable().optional()
        })
        .optional()
});

const ProviderDrivesResponseSchema = z.object({
    value: z.array(ProviderDriveSchema)
});

const DriveSchema = z.object({
    id: z.string().describe('The unique identifier of the drive.'),
    name: z.string().optional().describe('The name of the drive.'),
    driveType: z.string().optional().describe('The type of drive (personal, business, or documentLibrary).'),
    ownerId: z.string().optional().describe('The ID of the drive owner.'),
    ownerName: z.string().optional().describe('The display name of the drive owner.')
});

const OutputSchema = z.object({
    drives: z.array(DriveSchema).describe('List of drives available to the authenticated user.')
});

const action = createAction({
    description: 'List drives available to the authenticated user.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'Files.Read.All', 'offline_access'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/drive-list
        const response = await nango.get({
            endpoint: '/v1.0/me/drives',
            retries: 3
        });

        const parsedResponse = ProviderDrivesResponseSchema.parse(response.data);

        const drives = parsedResponse.value.map((drive) => {
            const ownerUser = drive.owner?.user;
            return {
                id: drive.id,
                ...(drive.name != null && { name: drive.name }),
                ...(drive.driveType != null && { driveType: drive.driveType }),
                ...(ownerUser?.id != null && { ownerId: ownerUser.id }),
                ...(ownerUser?.displayName != null && { ownerName: ownerUser.displayName })
            };
        });

        return { drives };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
