import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderExportSchema = z.object({
    id: z.string().describe('Unique identifier for this export job. Example: "2013-01-01 12:20:28.13842"'),
    created_at: z.string().describe('Date and time the export job was created in UTC YYYY-MM-DD HH:MM:SS format. Example: "2013-01-01 12:30:28"'),
    type: z.enum(['reject', 'whitelist', 'allowlist', 'activity']).describe('Type of export job. Example: "reject"'),
    finished_at: z
        .string()
        .nullable()
        .optional()
        .describe('Date and time the export job finished in UTC YYYY-MM-DD HH:MM:SS format, or null if not finished. Example: "2013-01-01 12:35:28"'),
    state: z.enum(['waiting', 'working', 'complete', 'error', 'expired']).describe('Current state of the export job. Example: "waiting"'),
    result_url: z
        .string()
        .nullable()
        .optional()
        .describe('URL to download the export results when job is complete, or null if not ready. Example: "https://example.com/export-results.zip"')
});

const ExportSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    type: z.enum(['reject', 'whitelist', 'allowlist', 'activity']),
    finished_at: z.string().optional(),
    state: z.enum(['waiting', 'working', 'complete', 'error', 'expired']),
    result_url: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ExportSchema)
});

const action = createAction({
    description: "List the account's export jobs.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/exports/list-exports/
            endpoint: 'exports/list',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {},
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of export jobs from the provider.'
            });
        }

        const items = response.data.map((item: unknown) => {
            const parsed = ProviderExportSchema.parse(item);
            return {
                id: parsed.id,
                created_at: parsed.created_at,
                type: parsed.type,
                state: parsed.state,
                ...(parsed.finished_at != null && { finished_at: parsed.finished_at }),
                ...(parsed.result_url != null && { result_url: parsed.result_url })
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
