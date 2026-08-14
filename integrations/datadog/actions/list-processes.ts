import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    search: z.string().optional().describe('String to search processes by.'),
    tags: z.string().optional().describe('Comma-separated list of tags to filter processes by.'),
    from: z.number().optional().describe('Unix timestamp (seconds since epoch) of the start of the query window.'),
    to: z.number().optional().describe('Unix timestamp (seconds since epoch) of the end of the query window.'),
    page_limit: z.number().min(1).max(10000).optional().describe('Maximum number of results returned.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProcessAttributesSchema = z.object({
    cmdline: z.string().optional().describe('Process command line.'),
    host: z.string().optional().describe('Host running the process.'),
    pid: z.number().optional().describe('Process ID.'),
    ppid: z.number().optional().describe('Parent process ID.'),
    start: z.string().optional().describe('Time the process was started.'),
    tags: z.array(z.string()).optional().describe('List of tags associated with the process.'),
    timestamp: z.string().optional().describe('Time the process was seen.'),
    user: z.string().optional().describe('Process owner.')
});

const ProviderProcessSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    attributes: ProcessAttributesSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderProcessSchema).optional(),
    meta: z
        .object({
            page: z
                .object({
                    after: z.string().optional(),
                    size: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const ProcessSchema = z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    cmdline: z.string().optional(),
    host: z.string().optional(),
    pid: z.number().optional(),
    ppid: z.number().optional(),
    start: z.string().optional(),
    tags: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
    user: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProcessSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: "List processes reported by hosts running the Datadog Agent's live process collection.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/processes/
        const response = await nango.get({
            endpoint: 'v2/processes',
            params: {
                ...(input.search !== undefined && { search: input.search }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.from !== undefined && { from: String(input.from) }),
                ...(input.to !== undefined && { to: String(input.to) }),
                ...(input.page_limit !== undefined && { 'page[limit]': String(input.page_limit) }),
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items =
            parsed.data?.map((item) => {
                const attrs = item.attributes;
                return {
                    id: item.id,
                    type: item.type,
                    ...(attrs?.cmdline !== undefined && { cmdline: attrs.cmdline }),
                    ...(attrs?.host !== undefined && { host: attrs.host }),
                    ...(attrs?.pid !== undefined && { pid: attrs.pid }),
                    ...(attrs?.ppid !== undefined && { ppid: attrs.ppid }),
                    ...(attrs?.start !== undefined && { start: attrs.start }),
                    ...(attrs?.tags !== undefined && { tags: attrs.tags }),
                    ...(attrs?.timestamp !== undefined && { timestamp: attrs.timestamp }),
                    ...(attrs?.user !== undefined && { user: attrs.user })
                };
            }) ?? [];

        return {
            items,
            ...(parsed.meta?.page?.after !== undefined && { next_cursor: parsed.meta.page.after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
