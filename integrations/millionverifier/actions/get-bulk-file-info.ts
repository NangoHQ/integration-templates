import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the uploaded bulk file. Example: "940"'),
    api_key: z.string().optional().describe('Optional API key override for the bulk API. If omitted, the connection credentials are used.')
});

const ProviderFileInfoSchema = z.object({
    file_id: z.string(),
    file_name: z.string(),
    status: z.string(),
    unique_emails: z.number(),
    updated_at: z.string().optional(),
    createdate: z.string().optional(),
    percent: z.number().optional(),
    total_rows: z.number().optional(),
    verified: z.number().optional(),
    unverified: z.number().optional(),
    ok: z.number().optional(),
    catch_all: z.number().optional(),
    disposable: z.number().optional(),
    invalid: z.number().optional(),
    unknown: z.number().optional(),
    reverify: z.number().optional(),
    credit: z.number().optional(),
    estimated_time_sec: z.number().optional(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    file_id: z.string(),
    file_name: z.string(),
    status: z.string(),
    unique_emails: z.number(),
    updated_at: z.string().optional(),
    createdate: z.string().optional(),
    percent: z.number().optional(),
    total_rows: z.number().optional(),
    verified: z.number().optional(),
    unverified: z.number().optional(),
    ok: z.number().optional(),
    catch_all: z.number().optional(),
    disposable: z.number().optional(),
    invalid: z.number().optional(),
    unknown: z.number().optional(),
    reverify: z.number().optional(),
    credit: z.number().optional(),
    estimated_time_sec: z.number().optional(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Retrieve processing status and result counts for an uploaded bulk file.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let apiKey = input.api_key;

        if (!apiKey) {
            const connection = await nango.getConnection();
            const credentials = connection.credentials;

            if (!credentials || credentials.type !== 'API_KEY' || !credentials.apiKey) {
                throw new nango.ActionError({
                    type: 'missing_credentials',
                    message: 'API key credentials are required.'
                });
            }

            apiKey = credentials.apiKey;
        }

        const response = await nango.get({
            // https://developer.millionverifier.com/#operation/bulk-fileinfo
            endpoint: '/bulkapi/v2/fileinfo',
            params: {
                key: apiKey,
                file_id: input.file_id
            },
            baseUrlOverride: 'https://bulkapi.millionverifier.com',
            retries: 3
        });

        const raw = z.record(z.string(), z.unknown()).parse(response.data);

        if (typeof raw['error'] === 'string' && raw['error']) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: raw['error'],
                file_id: input.file_id
            });
        }

        const fileInfo = ProviderFileInfoSchema.parse(raw);

        return {
            file_id: fileInfo.file_id,
            file_name: fileInfo.file_name,
            status: fileInfo.status,
            unique_emails: fileInfo.unique_emails,
            ...(fileInfo.updated_at !== undefined && { updated_at: fileInfo.updated_at }),
            ...(fileInfo.createdate !== undefined && { createdate: fileInfo.createdate }),
            ...(fileInfo.percent !== undefined && { percent: fileInfo.percent }),
            ...(fileInfo.total_rows !== undefined && { total_rows: fileInfo.total_rows }),
            ...(fileInfo.verified !== undefined && { verified: fileInfo.verified }),
            ...(fileInfo.unverified !== undefined && { unverified: fileInfo.unverified }),
            ...(fileInfo.ok !== undefined && { ok: fileInfo.ok }),
            ...(fileInfo.catch_all !== undefined && { catch_all: fileInfo.catch_all }),
            ...(fileInfo.disposable !== undefined && { disposable: fileInfo.disposable }),
            ...(fileInfo.invalid !== undefined && { invalid: fileInfo.invalid }),
            ...(fileInfo.unknown !== undefined && { unknown: fileInfo.unknown }),
            ...(fileInfo.reverify !== undefined && { reverify: fileInfo.reverify }),
            ...(fileInfo.credit !== undefined && { credit: fileInfo.credit }),
            ...(fileInfo.estimated_time_sec !== undefined && { estimated_time_sec: fileInfo.estimated_time_sec }),
            ...(fileInfo.error !== undefined && { error: fileInfo.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
