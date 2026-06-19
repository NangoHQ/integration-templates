import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The maximum number of items to return. The maximum and default value is 100.'),
    status: z.enum(['Hired', 'Archived', 'Active', 'Lead']).optional().describe('Filter by application status.'),
    jobId: z.string().optional().describe('Filter by job ID.'),
    syncToken: z.string().optional().describe('Opaque token for incremental synchronization.'),
    createdAfter: z.number().optional().describe('Unix epoch timestamp in milliseconds. Return data created after this date.')
});

const ProviderApplicationSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(ProviderApplicationSchema).optional(),
    moreDataAvailable: z.boolean().optional(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderApplicationSchema),
    nextCursor: z.string().optional(),
    moreDataAvailable: z.boolean(),
    syncToken: z.string().optional()
});

const action = createAction({
    description: 'List applications from Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesRead'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/applicationlist
            endpoint: 'application.list',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.jobId !== undefined && { jobId: input.jobId }),
                ...(input.syncToken !== undefined && { syncToken: input.syncToken }),
                ...(input.createdAfter !== undefined && { createdAfter: input.createdAfter })
            },
            retries: 3
        };

        const response = await nango.post(config);
        const data: unknown = response.data;
        const parsed = ProviderListResponseSchema.parse(data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a failure response.'
            });
        }

        return {
            items: parsed.results ?? [],
            moreDataAvailable: parsed.moreDataAvailable ?? false,
            ...(parsed.nextCursor !== undefined && { nextCursor: parsed.nextCursor }),
            ...(parsed.syncToken !== undefined && { syncToken: parsed.syncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
