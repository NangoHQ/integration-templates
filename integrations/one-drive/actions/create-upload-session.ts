import { z } from 'zod';
import { createAction } from 'nango';

// https://learn.microsoft.com/graph/api/driveitem-createuploadsession

const InputSchema = z.object({
    parentItemId: z.string().describe('The ID of the parent folder where the file will be uploaded. Example: "0123456789abc"'),
    fileName: z.string().describe('The name of the file to upload. Example: "document.pdf"')
});

const ProviderUploadSessionSchema = z.object({
    uploadUrl: z.string(),
    expirationDateTime: z.string(),
    nextExpectedRanges: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    uploadUrl: z.string(),
    expirationDateTime: z.string(),
    nextExpectedRanges: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Start a resumable upload for a large file.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-upload-session',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/driveitem-createuploadsession
        const response = await nango.post({
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.parentItemId)}:/${encodeURIComponent(input.fileName)}:/createUploadSession`,
            retries: 3
        });

        const uploadSession = ProviderUploadSessionSchema.parse(response.data);

        return {
            uploadUrl: uploadSession.uploadUrl,
            expirationDateTime: uploadSession.expirationDateTime,
            ...(uploadSession.nextExpectedRanges !== undefined && {
                nextExpectedRanges: uploadSession.nextExpectedRanges
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
