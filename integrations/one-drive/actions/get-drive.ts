import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderDriveSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        driveType: z.string().optional(),
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
            .optional(),
        quota: z
            .object({
                deleted: z.number().optional(),
                remaining: z.number().optional(),
                state: z.string().optional(),
                total: z.number().optional(),
                used: z.number().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    driveType: z.string().optional(),
    webUrl: z.string().optional(),
    owner: z
        .object({
            userId: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    quota: z
        .object({
            deleted: z.number().optional(),
            remaining: z.number().optional(),
            state: z.string().optional(),
            total: z.number().optional(),
            used: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve the user drive metadata.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-drive',
        group: 'Drives'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['openid', 'profile', 'Files.Read', 'offline_access'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/resources/onedrive
        const response = await nango.get({
            endpoint: '/v1.0/me/drive',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User drive not found'
            });
        }

        const providerDrive = ProviderDriveSchema.parse(response.data);

        return {
            id: providerDrive.id,
            ...(providerDrive.name !== undefined && { name: providerDrive.name }),
            ...(providerDrive.description !== undefined && {
                description: providerDrive.description
            }),
            ...(providerDrive.driveType !== undefined && {
                driveType: providerDrive.driveType
            }),
            ...(providerDrive.webUrl !== undefined && { webUrl: providerDrive.webUrl }),
            ...(providerDrive.owner !== undefined && {
                owner:
                    providerDrive.owner.user !== undefined
                        ? {
                              ...(providerDrive.owner.user.id !== undefined && {
                                  userId: providerDrive.owner.user.id
                              }),
                              ...(providerDrive.owner.user.displayName !== undefined && {
                                  displayName: providerDrive.owner.user.displayName
                              })
                          }
                        : undefined
            }),
            ...(providerDrive.quota !== undefined && {
                quota: {
                    ...(providerDrive.quota.deleted !== undefined && {
                        deleted: providerDrive.quota.deleted
                    }),
                    ...(providerDrive.quota.remaining !== undefined && {
                        remaining: providerDrive.quota.remaining
                    }),
                    ...(providerDrive.quota.state !== undefined && {
                        state: providerDrive.quota.state
                    }),
                    ...(providerDrive.quota.total !== undefined && {
                        total: providerDrive.quota.total
                    }),
                    ...(providerDrive.quota.used !== undefined && {
                        used: providerDrive.quota.used
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
