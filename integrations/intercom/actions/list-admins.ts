import { z } from 'zod';
import { createAction } from 'nango';

const ListInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(150).optional().describe('Number of results per page. Max 150.')
});

const AdminSchema = z.object({
    id: z.string().describe('The unique identifier for the admin.'),
    type: z.string().describe('The type of object.'),
    name: z.string().optional().describe('The name of the admin.'),
    email: z.string().optional().describe('The email address of the admin.'),
    job_title: z.string().optional().describe('The job title of the admin.'),
    away_mode_enabled: z.boolean().optional().describe('Whether the admin has away mode enabled.'),
    away_mode_reassign: z.boolean().optional().describe('Whether conversations should be reassigned when in away mode.'),
    has_inbox_seat: z.boolean().optional().describe('Whether the admin has an inbox seat.'),
    team_ids: z.array(z.string()).optional().describe('IDs of teams the admin belongs to.'),
    avatar: z.string().optional().describe('URL to the admin avatar image.'),
    team_id: z.string().optional().describe('ID of the team the admin belongs to.'),
    team_type: z.string().optional().describe('Type of team the admin belongs to.')
});

const ListOutputSchema = z.object({
    admins: z.array(AdminSchema).describe('List of admins in the workspace.'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results.'),
    total_count: z.number().int().optional().describe('Total number of admins.'),
    type: z.string().optional().describe('The type of object returned.')
});

const RawAdminSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    away_mode_enabled: z.boolean().optional(),
    away_mode_reassign: z.boolean().optional(),
    has_inbox_seat: z.boolean().optional(),
    team_ids: z.array(z.number()).optional(),
    avatar: z.string().nullable().optional(),
    team_id: z.string().nullable().optional(),
    team_type: z.string().nullable().optional()
});

const RawResponseSchema = z.object({
    admins: z.array(RawAdminSchema),
    pages: z
        .object({
            next: z
                .object({
                    starting_after: z.string()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    total_count: z.number().int().optional(),
    type: z.string().optional()
});

const action = createAction({
    description: 'List all admins in the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-admins',
        group: 'Admins'
    },
    input: ListInputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor) {
            params['starting_after'] = input.cursor;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        const response = await nango.get({
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Admins
            endpoint: '/admins',
            headers: {
                'Intercom-Version': '2.11'
            },
            params,
            retries: 3
        });

        const parseResult = RawResponseSchema.safeParse(response.data);
        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Intercom API',
                details: parseResult.error.message
            });
        }

        const data = parseResult.data;

        const admins = data.admins.map((admin) => {
            const result: {
                id: string;
                type: string;
                name?: string;
                email?: string;
                job_title?: string;
                away_mode_enabled?: boolean;
                away_mode_reassign?: boolean;
                has_inbox_seat?: boolean;
                team_ids?: string[];
                avatar?: string;
                team_id?: string;
                team_type?: string;
            } = { id: admin.id, type: admin.type };

            if (admin.name !== null && admin.name !== undefined) {
                result.name = admin.name;
            }
            if (admin.email !== null && admin.email !== undefined) {
                result.email = admin.email;
            }
            if (admin.job_title !== null && admin.job_title !== undefined) {
                result.job_title = admin.job_title;
            }
            if (admin.away_mode_enabled !== undefined) {
                result.away_mode_enabled = admin.away_mode_enabled;
            }
            if (admin.away_mode_reassign !== undefined) {
                result.away_mode_reassign = admin.away_mode_reassign;
            }
            if (admin.has_inbox_seat !== undefined) {
                result.has_inbox_seat = admin.has_inbox_seat;
            }
            if (admin.team_ids !== undefined) {
                result.team_ids = admin.team_ids.map((id) => String(id));
            }
            if (admin.avatar !== null && admin.avatar !== undefined) {
                result.avatar = admin.avatar;
            }
            if (admin.team_id !== null && admin.team_id !== undefined) {
                result.team_id = admin.team_id;
            }
            if (admin.team_type !== null && admin.team_type !== undefined) {
                result.team_type = admin.team_type;
            }

            return result;
        });

        const nextCursor = data.pages?.next?.starting_after;
        const totalCount = data.total_count;
        const typeStr = data.type;

        return {
            admins,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            ...(totalCount !== undefined && { total_count: totalCount }),
            ...(typeStr !== undefined && { type: typeStr })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
