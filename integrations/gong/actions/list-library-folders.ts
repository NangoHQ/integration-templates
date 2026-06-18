import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().optional().describe('Workspace identifier to filter folders by workspace. Example: "7273476131570014205"')
});

const ProviderFolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    parentFolderId: z.string().nullable().optional(),
    createdBy: z.string(),
    updated: z.string()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    folders: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    folders: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            parentFolderId: z.string().optional(),
            createdBy: z.string(),
            updated: z.string()
        })
    )
});

const action = createAction({
    description: 'Retrieve all Gong library folders.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:library:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch Library folders endpoint is plan-gated and returns 401 or 404 on standard accounts.
        // We treat these as a valid empty result instead of a hard failure.
        try {
            // https://help.gong.io/apidocs/retrieve-library-folders-v2libraryfolders
            const response = await nango.get({
                endpoint: '/v2/library/folders',
                params: {
                    ...(input.workspaceId !== undefined && { workspaceId: input.workspaceId })
                },
                retries: 3
            });

            if (response.status && (response.status === 401 || response.status === 404)) {
                return {
                    folders: []
                };
            }

            const parsed = ProviderResponseSchema.parse(response.data);

            const folders = [];
            for (const item of parsed.folders ?? []) {
                const folderResult = ProviderFolderSchema.safeParse(item);
                if (folderResult.success) {
                    folders.push({
                        id: folderResult.data.id,
                        name: folderResult.data.name,
                        ...(folderResult.data.parentFolderId != null && { parentFolderId: folderResult.data.parentFolderId }),
                        createdBy: folderResult.data.createdBy,
                        updated: folderResult.data.updated
                    });
                }
            }

            return {
                folders,
                ...(parsed.requestId != null && { requestId: parsed.requestId })
            };
        } catch (err) {
            if (err instanceof nango.ActionError) {
                throw err;
            }
            if (err && typeof err === 'object' && 'status' in err && (err.status === 404 || err.status === 401)) {
                return {
                    folders: []
                };
            }
            throw new nango.ActionError({
                type: 'provider_error',
                message:
                    err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
                        ? err.message
                        : 'Unknown error retrieving library folders'
            });
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
