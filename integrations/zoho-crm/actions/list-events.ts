import { z } from 'zod';
import { createAction } from 'nango';

const UserSchema = z.object({
    name: z.string(),
    id: z.string(),
    email: z.string().optional()
});

const EventOwnerSchema = UserSchema;

const EventCreatedBySchema = UserSchema;

const EventModifiedBySchema = UserSchema;

const EventWhatIdSchema = z.object({
    name: z.string(),
    id: z.string()
});

const EventSchema = z.object({
    id: z.string(),
    Event_Title: z.string().optional(),
    Start_DateTime: z.string().optional(),
    End_DateTime: z.string().optional(),
    All_day: z.boolean().optional(),
    Owner: EventOwnerSchema.optional(),
    Venue: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional(),
    Created_By: EventCreatedBySchema.optional(),
    Modified_By: EventModifiedBySchema.optional(),
    What_Id: EventWhatIdSchema.nullable().optional(),
    $editable: z.boolean().optional(),
    Tag: z.array(z.object({ name: z.string(), id: z.string() })).optional()
});

const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.array(EventSchema),
    info: InfoSchema
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor in the format "page:per_page". Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records per page. Default is 200, maximum is 200.'),
    sort_by: z.string().optional().describe('Field API name to sort by. Default is "id".'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order: "asc" or "desc". Default is "desc".'),
    fields: z.string().optional().describe('Comma-separated field API names to retrieve specific fields.'),
    ids: z.string().optional().describe('Comma-separated record IDs to retrieve specific events.'),
    cvid: z.string().optional().describe('Custom view ID to filter records.')
});

const OutputEventSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    start_datetime: z.string().optional(),
    end_datetime: z.string().optional(),
    all_day: z.boolean().optional(),
    owner: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    venue: z.string().optional(),
    description: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    created_by: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    modified_by: z
        .object({
            name: z.string(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    what_id: z
        .object({
            name: z.string(),
            id: z.string()
        })
        .optional(),
    editable: z.boolean().optional(),
    tags: z.array(z.object({ name: z.string(), id: z.string() })).optional()
});

const OutputSchema = z.object({
    events: z.array(OutputEventSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean(),
    total_count: z.number()
});

function parseCursor(cursor: string | undefined): { page: number; per_page: number } {
    if (!cursor) {
        return { page: 1, per_page: 200 };
    }
    const parts = cursor.split(':');
    const page = parseInt(parts[0] || '1', 10);
    const per_page = parseInt(parts[1] || '200', 10);
    if (isNaN(page) || page < 1 || isNaN(per_page) || per_page < 1) {
        return { page: 1, per_page: 200 };
    }
    return { page, per_page };
}

function buildCursor(page: number, per_page: number): string {
    return `${page}:${per_page}`;
}

const action = createAction({
    description: 'List events from Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.events.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { page, per_page } = parseCursor(input.cursor);
        const limit = input.per_page || per_page;

        const params: Record<string, string | number> = {
            page: page,
            per_page: limit
        };

        if (input.sort_by) {
            params['sort_by'] = input.sort_by;
        }

        if (input.sort_order) {
            params['sort_order'] = input.sort_order;
        }

        if (input.fields) {
            params['fields'] = input.fields;
        }

        if (input.ids) {
            params['ids'] = input.ids;
        }

        if (input.cvid) {
            params['cvid'] = input.cvid;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Events',
            params: params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho CRM API',
                details: parsed.error.message
            });
        }

        const { data, info } = parsed.data;

        const events = data.map((event) => ({
            id: event.id,
            ...(event.Event_Title !== undefined && { title: event.Event_Title }),
            ...(event.Start_DateTime !== undefined && { start_datetime: event.Start_DateTime }),
            ...(event.End_DateTime !== undefined && { end_datetime: event.End_DateTime }),
            ...(event.All_day !== undefined && { all_day: event.All_day }),
            ...(event.Owner !== undefined && {
                owner: {
                    name: event.Owner.name,
                    id: event.Owner.id,
                    ...(event.Owner.email !== undefined && { email: event.Owner.email })
                }
            }),
            ...(event.Venue !== null && event.Venue !== undefined && { venue: event.Venue }),
            ...(event.Description !== null && event.Description !== undefined && { description: event.Description }),
            ...(event.Created_Time !== undefined && { created_time: event.Created_Time }),
            ...(event.Modified_Time !== undefined && { modified_time: event.Modified_Time }),
            ...(event.Created_By !== undefined && {
                created_by: {
                    name: event.Created_By.name,
                    id: event.Created_By.id,
                    ...(event.Created_By.email !== undefined && { email: event.Created_By.email })
                }
            }),
            ...(event.Modified_By !== undefined && {
                modified_by: {
                    name: event.Modified_By.name,
                    id: event.Modified_By.id,
                    ...(event.Modified_By.email !== undefined && { email: event.Modified_By.email })
                }
            }),
            ...(event.What_Id !== null &&
                event.What_Id !== undefined && {
                    what_id: {
                        name: event.What_Id.name,
                        id: event.What_Id.id
                    }
                }),
            ...(event.$editable !== undefined && { editable: event.$editable }),
            ...(event.Tag !== undefined && {
                tags: event.Tag.map((tag) => ({ name: tag.name, id: tag.id }))
            })
        }));

        const hasMore = info.more_records;
        const nextCursor = hasMore ? buildCursor(page + 1, limit) : undefined;

        return {
            events: events,
            has_more: hasMore,
            total_count: info.count,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
