import { z } from 'zod';
import { createAction } from 'nango';

const CursorSchema = z.object({
    session_id: z.string(),
    page: z.number().int().min(0)
});

const MetadataSchema = z.object({
    project_id: z.string().optional().describe('Mixpanel project id stored in connection metadata.')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Opaque pagination cursor from a previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Requested page size. The Mixpanel API uses a fixed page size; this field is reserved for future use.'),
    project_id: z
        .string()
        .optional()
        .describe('Mixpanel project id. Required when authenticating with a service account. Falls back to connection metadata if omitted.'),
    where: z.string().optional().describe('Selector expression to filter profiles. See Mixpanel segmentation expressions docs.'),
    output_properties: z.array(z.string()).optional().describe('Property names to include in the response. Example: ["$last_name", "$email"]'),
    distinct_id: z.string().optional().describe('A single distinct_id to retrieve.'),
    distinct_ids: z.array(z.string()).optional().describe('List of distinct_ids to retrieve.'),
    data_group_id: z.string().optional().describe('Group key id when querying group profiles.'),
    filter_by_cohort: z.string().optional().describe('JSON string cohort filter object. Example: \'{"id":12345}\''),
    include_all_users: z.boolean().optional().describe('Include all distinct_ids in a cohort query even if they do not have a profile.'),
    behaviors: z.number().optional().describe('Event selector for exporting user profiles with event filters.'),
    as_of_timestamp: z.number().optional().describe('Timestamp required when behaviors exports more than 1k profiles.')
});

const ProviderProfileSchema = z.object({
    $distinct_id: z.union([z.string(), z.number()]),
    $properties: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    page: z.number().int(),
    page_size: z.number().int(),
    session_id: z.string(),
    status: z.string(),
    total: z.number().int(),
    results: z.array(z.unknown())
});

const ProfileSchema = z.object({
    $distinct_id: z.union([z.string(), z.number()]),
    $properties: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(ProfileSchema),
    next_cursor: z.string().optional().describe('Cursor to request the next page. Absent when there are no more pages.'),
    total: z.number().optional().describe('Total number of profiles matching the query.'),
    page: z.number().optional().describe('Current page number returned by the provider.'),
    page_size: z.number().optional().describe('Maximum number of results per provider page.')
});

const action = createAction({
    description: 'Query user profiles with Engage.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['profile-query'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const projectId = input.project_id ?? metadata?.project_id;

        if (!projectId) {
            throw new nango.ActionError({
                type: 'missing_project_id',
                message: 'project_id is required in input or connection metadata when using a service account.'
            });
        }

        let sessionId: string | undefined;
        let page = 0;

        if (input.cursor) {
            let parsedCursor: unknown;
            // @allowTryCatch We need to catch malformed JSON in the user-supplied cursor and convert it to a typed ActionError.
            try {
                parsedCursor = JSON.parse(input.cursor);
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor is not valid JSON.'
                });
            }

            const cursorResult = CursorSchema.safeParse(parsedCursor);
            if (!cursorResult.success) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor does not contain a valid session_id and page.'
                });
            }

            sessionId = cursorResult.data.session_id;
            page = cursorResult.data.page;
        }

        const bodyParams = new URLSearchParams();

        if (input.distinct_id) {
            bodyParams.set('distinct_id', input.distinct_id);
        }

        if (input.distinct_ids && input.distinct_ids.length > 0) {
            bodyParams.set('distinct_ids', JSON.stringify(input.distinct_ids));
        }

        if (input.data_group_id) {
            bodyParams.set('data_group_id', input.data_group_id);
        }

        if (input.where) {
            bodyParams.set('where', input.where);
        }

        if (input.output_properties && input.output_properties.length > 0) {
            bodyParams.set('output_properties', JSON.stringify(input.output_properties));
        }

        if (sessionId) {
            bodyParams.set('session_id', sessionId);
            bodyParams.set('page', String(page));
        }

        if (input.behaviors !== undefined) {
            bodyParams.set('behaviors', String(input.behaviors));
        }

        if (input.as_of_timestamp !== undefined) {
            bodyParams.set('as_of_timestamp', String(input.as_of_timestamp));
        }

        if (input.filter_by_cohort) {
            bodyParams.set('filter_by_cohort', input.filter_by_cohort);
        }

        if (input.include_all_users !== undefined) {
            bodyParams.set('include_all_users', String(input.include_all_users));
        }

        // https://developer.mixpanel.com/reference/engage-query
        const response = await nango.post({
            endpoint: '/api/query/engage',
            params: {
                project_id: projectId
            },
            data: bodyParams.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const raw = ProviderResponseSchema.safeParse(response.data);
        if (!raw.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not match the expected shape.',
                details: raw.error.message
            });
        }

        const provider = raw.data;

        const items = provider.results
            .map((item) => {
                const parsed = ProviderProfileSchema.safeParse(item);
                if (!parsed.success) {
                    return null;
                }
                return {
                    $distinct_id: parsed.data.$distinct_id,
                    ...(parsed.data.$properties !== undefined && { $properties: parsed.data.$properties })
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        const hasMore = provider.results.length >= provider.page_size && provider.total > items.length;
        let nextCursor: string | undefined;

        if (hasMore) {
            const nextPage = provider.page + 1;
            nextCursor = JSON.stringify({ session_id: provider.session_id, page: nextPage });
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            ...(provider.total !== undefined && { total: provider.total }),
            ...(provider.page !== undefined && { page: provider.page }),
            ...(provider.page_size !== undefined && { page_size: provider.page_size })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
