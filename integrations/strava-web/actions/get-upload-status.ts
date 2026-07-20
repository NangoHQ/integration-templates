import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    upload_id: z.string().describe('The identifier of the upload. Example: "123456789"')
});

const ProviderUploadSchema = z.object({
    id: z.number(),
    id_str: z.string().optional(),
    external_id: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    activity_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    id_str: z.string().optional(),
    external_id: z.string().optional(),
    error: z.string().optional(),
    status: z.string().optional(),
    activity_id: z.number().optional()
});

const action = createAction({
    description: 'Check the processing status of an activity file upload.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Strava returns 404 for missing uploads; convert to a typed ActionError.
        try {
            response = await nango.get({
                // https://developers.strava.com/docs/reference/#api-Uploads-getUploadById
                endpoint: `/api/v3/uploads/${encodeURIComponent(input.upload_id)}`,
                retries: 3
            });
        } catch (error) {
            if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Upload not found',
                    upload_id: input.upload_id
                });
            }
            throw error;
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Upload not found',
                upload_id: input.upload_id
            });
        }

        const providerUpload = ProviderUploadSchema.parse(response.data);

        return {
            id: providerUpload.id,
            ...(providerUpload.id_str !== undefined && { id_str: providerUpload.id_str }),
            ...(providerUpload.external_id != null && { external_id: providerUpload.external_id }),
            ...(providerUpload.error != null && { error: providerUpload.error }),
            ...(providerUpload.status != null && { status: providerUpload.status }),
            ...(providerUpload.activity_id != null && { activity_id: providerUpload.activity_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
