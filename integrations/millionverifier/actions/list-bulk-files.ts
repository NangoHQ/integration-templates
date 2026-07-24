import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const DATE_TIME_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const dateTimeFilter = () => z.string().regex(DATE_TIME_FORMAT_REGEX, 'Must match format yyyy-MM-dd HH:mm:ss').optional();

const InputSchema = z.object({
    offset: z.number().int().nonnegative().optional().describe('Offset for pagination. Example: 0'),
    limit: z.number().int().min(1).max(50).optional().describe('The amount of files to show on one page. Defaults to 50, max 50. Example: 25'),
    id: z.string().optional().describe('Filter for file IDs. Comma separated values allowed. Example: "1,2,3"'),
    name: z.string().optional().describe('Filter for file name. Example: "myfile.txt"'),
    status: z.string().optional().describe('Filter for file state. Example: "in_progress,finished"'),
    updated_at_from: dateTimeFilter().describe('Filter for files updated after the given date time. Format: yyyy-MM-dd HH:mm:ss. Example: "2023-01-01 15:00:05"'),
    updated_at_to: dateTimeFilter().describe('Filter for files updated before the given date time. Format: yyyy-MM-dd HH:mm:ss. Example: "2023-01-01 15:00:05"'),
    createdate_from: dateTimeFilter().describe('Filter for files created after the given date time. Format: yyyy-MM-dd HH:mm:ss. Example: "2023-01-01 15:00:05"'),
    createdate_to: dateTimeFilter().describe('Filter for files created before the given date time. Format: yyyy-MM-dd HH:mm:ss. Example: "2023-01-01 15:00:05"'),
    percent_from: z.number().optional().describe('Filter for files with progress over the given percentage. Example: 50'),
    percent_to: z.number().optional().describe('Filter for files with progress below the given percentage. Example: 75'),
    has_error: z.string().optional().describe('Filter for files that had or did not have errors. Example: "true" or "false"')
});

const ProviderFileSchema = z.object({
    file_id: z.string(),
    file_name: z.string(),
    status: z.string(),
    unique_emails: z.number(),
    updated_at: z.string(),
    createdate: z.string(),
    percent: z.number(),
    total_rows: z.number(),
    verified: z.number(),
    unverified: z.number(),
    ok: z.number(),
    catch_all: z.number(),
    disposable: z.number(),
    invalid: z.number(),
    unknown: z.number(),
    reverify: z.number(),
    credit: z.number(),
    estimated_time_sec: z.number(),
    error: z.string()
});

const ProviderResponseSchema = z.object({
    files: z.array(ProviderFileSchema),
    total: z.number()
});

const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'List uploaded bulk verification files, with filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        if (connection.credentials.type !== 'API_KEY') {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Connection credentials are not API_KEY type.'
            });
        }

        const apiKey = connection.credentials.apiKey;

        const config: ProxyConfiguration = {
            // https://developer.millionverifier.com/#operation/bulk-filelist
            endpoint: '/bulkapi/v2/filelist',
            baseUrlOverride: 'https://bulkapi.millionverifier.com',
            params: {
                key: apiKey,
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.id !== undefined && { id: input.id }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.updated_at_from !== undefined && { updated_at_from: input.updated_at_from }),
                ...(input.updated_at_to !== undefined && { updated_at_to: input.updated_at_to }),
                ...(input.createdate_from !== undefined && { createdate_from: input.createdate_from }),
                ...(input.createdate_to !== undefined && { createdate_to: input.createdate_to }),
                ...(input.percent_from !== undefined && { percent_from: input.percent_from }),
                ...(input.percent_to !== undefined && { percent_to: input.percent_to }),
                ...(input.has_error !== undefined && { has_error: input.has_error })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            files: parsed.files,
            total: parsed.total
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
