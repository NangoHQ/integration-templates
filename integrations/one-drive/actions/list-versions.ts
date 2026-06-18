import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the file to list versions for. Example: "0123456789ABC!123"')
});

const LastModifiedUserSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const LastModifiedBySchema = z.object({
    user: LastModifiedUserSchema.optional()
});

const DriveItemVersionSchema = z.object({
    id: z.string(),
    lastModifiedBy: LastModifiedBySchema.optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional()
});

const VersionsResponseSchema = z.object({
    value: z.array(DriveItemVersionSchema)
});

const VersionOutputSchema = z.object({
    id: z.string(),
    lastModifiedBy: z
        .object({
            user: z
                .object({
                    id: z.string().optional(),
                    displayName: z.string().optional()
                })
                .optional()
        })
        .optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional()
});

const OutputSchema = z.object({
    versions: z.array(VersionOutputSchema)
});

const action = createAction({
    description: 'List versions for a file.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-list-versions
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}/versions`,
            retries: 3
        });

        const parsed = VersionsResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API',
                details: parsed.error.issues
            });
        }

        return {
            versions: parsed.data.value.map((version) => ({
                id: version.id,
                ...(version.lastModifiedBy !== undefined && {
                    lastModifiedBy: {
                        ...(version.lastModifiedBy.user !== undefined && {
                            user: {
                                ...(version.lastModifiedBy.user.id !== undefined && {
                                    id: version.lastModifiedBy.user.id
                                }),
                                ...(version.lastModifiedBy.user.displayName !== undefined && {
                                    displayName: version.lastModifiedBy.user.displayName
                                })
                            }
                        })
                    }
                }),
                ...(version.lastModifiedDateTime !== undefined && {
                    lastModifiedDateTime: version.lastModifiedDateTime
                }),
                ...(version.size !== undefined && { size: version.size })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
