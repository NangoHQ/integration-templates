import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().optional().describe('Number of items to return per page.'),
    user_id: z.number().int().optional().describe('Filter by user ID who created the note.'),
    lead_id: z.string().uuid().optional().describe('Filter by lead ID.'),
    deal_id: z.number().int().optional().describe('Filter by deal ID.'),
    person_id: z.number().int().optional().describe('Filter by person ID.'),
    org_id: z.number().int().optional().describe('Filter by organization ID.'),
    project_id: z.number().int().optional().describe('Filter by project ID.'),
    task_id: z.number().int().optional().describe('Filter by task ID.'),
    start_date: z.string().optional().describe('Filter by start date (YYYY-MM-DD).'),
    end_date: z.string().optional().describe('Filter by end date (YYYY-MM-DD).'),
    updated_since: z.string().optional().describe('Filter by updated since timestamp (RFC3339 format).'),
    sort: z.string().optional().describe('Sort field and direction (e.g., "add_time DESC").')
});

const ProviderNoteSchema = z.object({
    id: z.number(),
    user_id: z.number().nullish(),
    deal_id: z.number().nullish(),
    person_id: z.number().nullish(),
    org_id: z.number().nullish(),
    lead_id: z.string().uuid().nullish(),
    project_id: z.number().nullish(),
    task_id: z.number().nullish(),
    content: z.string().nullish(),
    add_time: z.string().nullish(),
    update_time: z.string().nullish(),
    active_flag: z.boolean().nullish(),
    pinned_to_deal_flag: z.union([z.number(), z.boolean()]).nullish(),
    pinned_to_person_flag: z.union([z.number(), z.boolean()]).nullish(),
    pinned_to_organization_flag: z.union([z.number(), z.boolean()]).nullish(),
    pinned_to_lead_flag: z.union([z.number(), z.boolean()]).nullish(),
    pinned_to_project_flag: z.union([z.number(), z.boolean()]).nullish(),
    pinned_to_task_flag: z.union([z.number(), z.boolean()]).nullish()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderNoteSchema),
    additional_data: z
        .object({
            pagination: z
                .object({
                    start: z.number(),
                    limit: z.number(),
                    more_items_in_collection: z.boolean()
                })
                .optional()
        })
        .optional()
});

const NoteSchema = z.object({
    id: z.number().describe('The ID of the note.'),
    user_id: z.number().optional().describe('The ID of the user who created the note.'),
    deal_id: z.number().optional().describe('The ID of the deal this note is attached to.'),
    person_id: z.number().optional().describe('The ID of the person this note is attached to.'),
    org_id: z.number().optional().describe('The ID of the organization this note is attached to.'),
    lead_id: z.string().optional().describe('The ID of the lead this note is attached to.'),
    project_id: z.number().optional().describe('The ID of the project this note is attached to.'),
    task_id: z.number().optional().describe('The ID of the task this note is attached to.'),
    content: z.string().optional().describe('The content of the note in HTML format.'),
    add_time: z.string().optional().describe('The creation date and time of the note.'),
    update_time: z.string().optional().describe('The last update date and time of the note.'),
    active_flag: z.boolean().optional().describe('Whether the note is active.'),
    pinned_to_deal_flag: z.number().optional().describe('Whether the note is pinned to a deal.'),
    pinned_to_person_flag: z.number().optional().describe('Whether the note is pinned to a person.'),
    pinned_to_organization_flag: z.number().optional().describe('Whether the note is pinned to an organization.'),
    pinned_to_lead_flag: z.number().optional().describe('Whether the note is pinned to a lead.'),
    pinned_to_project_flag: z.number().optional().describe('Whether the note is pinned to a project.'),
    pinned_to_task_flag: z.number().optional().describe('Whether the note is pinned to a task.')
});

const OutputSchema = z.object({
    items: z.array(NoteSchema).describe('The list of notes.'),
    next_cursor: z.string().optional().describe('The cursor to fetch the next page of results.')
});

const action = createAction({
    description: 'List notes from Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build params object using bracket notation to avoid index signature issues
        const params: Record<string, string | number> = {};

        if (input['cursor']) {
            params['start'] = input['cursor'];
        }
        if (input['limit']) {
            params['limit'] = input['limit'];
        }
        if (input['user_id']) {
            params['user_id'] = input['user_id'];
        }
        if (input['lead_id']) {
            params['lead_id'] = input['lead_id'];
        }
        if (input['deal_id']) {
            params['deal_id'] = input['deal_id'];
        }
        if (input['person_id']) {
            params['person_id'] = input['person_id'];
        }
        if (input['org_id']) {
            params['org_id'] = input['org_id'];
        }
        if (input['project_id']) {
            params['project_id'] = input['project_id'];
        }
        if (input['task_id']) {
            params['task_id'] = input['task_id'];
        }
        if (input['start_date']) {
            params['start_date'] = input['start_date'];
        }
        if (input['end_date']) {
            params['end_date'] = input['end_date'];
        }
        if (input['updated_since']) {
            params['updated_since'] = input['updated_since'];
        }
        if (input['sort']) {
            params['sort'] = input['sort'];
        }

        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Notes#getNotes
            endpoint: '/v1/notes',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive API returned unsuccessful response'
            });
        }

        const notes = parsed.data.map((note) => {
            // Helper to convert boolean | number to number
            const toNumber = (val: boolean | number | null | undefined): number | undefined => {
                if (val == null) return undefined;
                if (typeof val === 'boolean') return val ? 1 : 0;
                return val;
            };

            return {
                id: note.id,
                ...(note.user_id != null && { user_id: note.user_id }),
                ...(note.deal_id != null && { deal_id: note.deal_id }),
                ...(note.person_id != null && { person_id: note.person_id }),
                ...(note.org_id != null && { org_id: note.org_id }),
                ...(note.lead_id != null && { lead_id: note.lead_id }),
                ...(note.project_id != null && { project_id: note.project_id }),
                ...(note.task_id != null && { task_id: note.task_id }),
                ...(note.content != null && { content: note.content }),
                ...(note.add_time != null && { add_time: note.add_time }),
                ...(note.update_time != null && { update_time: note.update_time }),
                ...(note.active_flag != null && { active_flag: note.active_flag }),
                ...(note.pinned_to_deal_flag != null && { pinned_to_deal_flag: toNumber(note.pinned_to_deal_flag) }),
                ...(note.pinned_to_person_flag != null && { pinned_to_person_flag: toNumber(note.pinned_to_person_flag) }),
                ...(note.pinned_to_organization_flag != null && { pinned_to_organization_flag: toNumber(note.pinned_to_organization_flag) }),
                ...(note.pinned_to_lead_flag != null && { pinned_to_lead_flag: toNumber(note.pinned_to_lead_flag) }),
                ...(note.pinned_to_project_flag != null && { pinned_to_project_flag: toNumber(note.pinned_to_project_flag) }),
                ...(note.pinned_to_task_flag != null && { pinned_to_task_flag: toNumber(note.pinned_to_task_flag) })
            };
        });

        const nextCursor =
            parsed.additional_data?.pagination?.more_items_in_collection && parsed.additional_data.pagination.start !== undefined
                ? String(parsed.additional_data.pagination.start + (input.limit || 100))
                : undefined;

        return {
            items: notes,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
