import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to export. Example: "nangodev4776.1791984276717"'),
        downloadFormat: z
            .enum(['pdf'])
            .optional()
            .describe('File format for the exported file. Mural currently only accepts "pdf". Defaults to "pdf" when omitted.')
    })
    .describe('Input for starting an export of a mural to a downloadable file.');

const ProviderExportSchema = z.object({
    exportId: z.string()
});

const ProviderResponseSchema = z.object({
    value: ProviderExportSchema
});

const OutputSchema = z
    .object({
        exportId: z
            .string()
            .describe('ID of the queued export job. Pass it to get-mural-export to retrieve the download URL once the export has finished processing.')
    })
    .describe('Result of starting a mural export: the queued export job id.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the mural's content to produce the export and creates a server-side export job that the caller then polls.
 * @pitfalls: Only "pdf" is accepted; other formats are rejected. Exports run asynchronously and the resulting download URL is only valid for a limited time (~7 days).
 */
const action = createAction({
    description: 'Start an export of a mural to a downloadable file and return the export job id.',
    version: '1.0.0',
    scopes: ['murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/exportmural
        const response = await nango.post({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/export`,
            data: {
                downloadFormat: input.downloadFormat ?? 'pdf'
            },
            // Starting an export is a non-idempotent trigger; a retry could queue duplicate export jobs.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            exportId: parsed.value.exportId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
