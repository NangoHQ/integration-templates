import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('The ID of the draft envelope to move to the recycle bin. Example: "acdc2f1a-fba9-871d-8159-abe4af6518ef"')
});

const FolderSchema = z.object({
    folderId: z.string(),
    type: z.string().optional()
});

const FoldersResponseSchema = z.object({
    folders: z.array(FolderSchema).optional()
});

const MoveEnvelopeResponseSchema = z.object({
    envelopes: z
        .array(
            z.object({
                envelopeId: z.string().optional(),
                errorDetails: z
                    .object({
                        errorCode: z.string(),
                        message: z.string()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    envelopeId: z.string(),
    folderId: z.string()
});

const action = createAction({
    description: 'Move a draft envelope to the recycle bin (soft delete).',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/delete-envelope' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        let accountId: string | undefined =
            metadata !== null && typeof metadata === 'object' && 'accountId' in metadata && typeof metadata['accountId'] === 'string'
                ? metadata['accountId']
                : undefined;

        if (!accountId) {
            const connection = await nango.getConnection();
            const connectionConfig = connection.connection_config;
            accountId =
                connectionConfig !== null &&
                typeof connectionConfig === 'object' &&
                'accountId' in connectionConfig &&
                typeof connectionConfig['accountId'] === 'string'
                    ? connectionConfig['accountId']
                    : undefined;
        }

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/folders/folders/list/
        const foldersResponse = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/folders`,
            retries: 3
        });

        const parsedFolders = FoldersResponseSchema.parse(foldersResponse.data);
        const folders = parsedFolders.folders ?? [];
        const recycleBinFolder = folders.find((f) => f.type === 'recyclebin');

        if (!recycleBinFolder) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Recycle bin folder not found.'
            });
        }

        const folderId = recycleBinFolder.folderId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/folders/folders/moveenvelopes/
        const moveResponse = await nango.put({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(folderId)}`,
            data: {
                envelopeIds: [input.envelopeId]
            },
            retries: 10
        });

        const parsedMove = MoveEnvelopeResponseSchema.parse(moveResponse.data);
        const envelopeResult = parsedMove.envelopes?.find((e) => e.envelopeId === input.envelopeId || e.envelopeId === undefined);

        if (envelopeResult && envelopeResult.errorDetails) {
            const errorCode = envelopeResult.errorDetails.errorCode;
            const errorMessage = envelopeResult.errorDetails.message;

            if (errorCode === 'INVALID_FOLDER_ID' && errorMessage.includes('must not be the same id')) {
                return {
                    success: true,
                    envelopeId: input.envelopeId,
                    folderId
                };
            }

            throw new nango.ActionError({
                type: 'move_failed',
                message: errorMessage,
                errorCode
            });
        }

        return {
            success: true,
            envelopeId: input.envelopeId,
            folderId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
