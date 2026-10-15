import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().min(1).describe('Unique ID of the mural the export belongs to. Example: "workspace1234.1608152669000"'),
        exportId: z.string().min(1).describe('ID of the export process returned when the export was started. Example: "364fba14-dd16-4365-8885-4439ac7977d2"')
    })
    .describe('Identifies a previously-started mural export to look up.');

const ProviderExportUrlSchema = z.object({
    createdOn: z.number().optional(),
    expireOn: z.number(),
    exportId: z.string(),
    muralId: z.string(),
    url: z.string()
});

const ProviderResponseSchema = z.object({
    value: ProviderExportUrlSchema
});

const OutputSchema = z
    .object({
        exportId: z.string().describe('ID of the export process.'),
        muralId: z.string().describe('Unique ID of the mural that was exported.'),
        url: z.string().describe('Pre-signed download URL for the exported file. It is only valid until the timestamp in expireOn.'),
        expireOn: z.number().describe('Unix epoch-milliseconds timestamp after which the download URL becomes invalid.'),
        createdOn: z.number().optional().describe('Unix epoch-milliseconds timestamp of the exported file creation, when returned by the provider.')
    })
    .describe('Status and time-limited download URL of a mural export.');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const { response } = error;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return false;
    }
    return response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Reads the status and download URL of an existing mural export and never mutates provider state.
 * @pitfalls: The download URL is pre-signed and short-lived, expiring at the expireOn timestamp, after which the export must be regenerated; an export that is missing and one that is still processing both surface as an export_not_ready error, so a 404 does not necessarily mean the export is invalid.
 */
const action = createAction({
    description: 'Check the status of a previously-started mural export and get its (time-limited) download URL once ready.',
    version: '1.0.0',
    scopes: ['murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: The provider returns 404 EXPORT_NOT_FOUND while an export is still processing, which is a documented expected state callers must distinguish from a generic failure.
        try {
            const response = await nango.get({
                // https://developers.mural.co/public/reference/exporturlmural
                endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/exports/${encodeURIComponent(input.exportId)}`,
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            const exportUrl = parsed.value;

            return {
                exportId: exportUrl.exportId,
                muralId: exportUrl.muralId,
                url: exportUrl.url,
                expireOn: exportUrl.expireOn,
                ...(exportUrl.createdOn !== undefined && { createdOn: exportUrl.createdOn })
            };
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'export_not_ready',
                    message: 'The export was not found or has not finished processing yet. Retry after the export completes.',
                    exportId: input.exportId,
                    muralId: input.muralId
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
