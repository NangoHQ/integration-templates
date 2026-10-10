import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationSchema = z
    .object({
        id: z.string().describe('Unique id of the organization.'),
        name: z.string().optional().describe('The name of the organization.'),
        default_project_privacy: z
            .string()
            .optional()
            .describe('The current user\'s default privacy for projects on dashboards, either "visible" or "hidden".'),
        invited_people_count: z.number().optional().describe('Number of pending invitations to this organization.'),
        invited_people_count_human_readable: z.string().optional().describe('Number of pending invitations as a human-readable string.'),
        is_duration_visible: z.boolean().optional().describe("Whether people in this organization can see each other's coding durations."),
        people_count: z.number().optional().describe('Number of people in this organization.'),
        people_count_human_readable: z.string().optional().describe('Number of people in this organization as a human-readable string.'),
        timeout: z.number().optional().describe('The keystroke timeout preference of this organization, in minutes.'),
        timezone: z.string().optional().describe('The timezone preference of this organization.'),
        writes_only: z.boolean().optional().describe('Whether this organization only counts file writes as activity.'),
        can_current_user_list_dashboards: z.boolean().optional().describe('Whether the current user can list dashboards.'),
        can_current_user_create_dashboards: z.boolean().optional().describe('Whether the current user can create dashboards.'),
        can_current_user_display_coding_on_dashboards: z
            .boolean()
            .optional()
            .describe('Whether the current user can display their coding activity on dashboards.'),
        can_current_user_view_all_dashboards: z.boolean().optional().describe('Whether the current user can view all dashboards without being invited first.'),
        can_current_user_add_people_to_dashboards: z.boolean().optional().describe('Whether the current user can add people to dashboards.'),
        can_current_user_remove_people_from_dashboards: z.boolean().optional().describe('Whether the current user can remove people from dashboards.'),
        can_current_user_edit_and_delete_dashboards: z.boolean().optional().describe('Whether the current user can edit and delete dashboards.'),
        can_current_user_add_people_to_org: z.boolean().optional().describe('Whether the current user can add people to this organization.'),
        can_current_user_remove_people_from_org: z.boolean().optional().describe('Whether the current user can remove people from this organization.'),
        can_current_user_manage_groups: z.boolean().optional().describe('Whether the current user can add, manage, and delete groups and permissions.'),
        can_current_user_view_audit_log: z.boolean().optional().describe('Whether the current user can view the audit log of this organization.'),
        can_current_user_edit_org: z.boolean().optional().describe('Whether the current user can edit the preferences of this organization.'),
        can_current_user_manage_billing: z.boolean().optional().describe('Whether the current user can manage the billing of this organization.'),
        can_current_user_delete_org: z.boolean().optional().describe('Whether the current user can delete this organization.'),
        created_at: z.string().optional().describe('Time when the organization was created, in ISO 8601 format.'),
        modified_at: z.string().optional().describe('Time when the organization was last modified, in ISO 8601 format.')
    })
    .passthrough();

const InputSchema = z.object({}).describe('This action takes no input.');

const OutputSchema = z
    .object({
        organizations: z
            .array(OrganizationSchema)
            .describe('The WakaTime for Teams organizations the authenticated user belongs to. Empty when the user belongs to none.'),
        total: z.number().optional().describe('Total number of organizations, when reported by the provider.')
    })
    .describe('The organizations the authenticated WakaTime user belongs to.');

const ProviderOrgsResponseSchema = z.object({
    data: z.array(OrganizationSchema),
    total: z.number().optional(),
    total_pages: z.number().optional(),
    page: z.number().optional(),
    next_page: z.number().nullable().optional(),
    prev_page: z.number().nullable().optional()
});

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if ('response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response && response.status === 404) {
            return true;
        }
    }
    return 'status' in error && error.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Lists organizations with a read-only provider GET and does not modify any provider state.
 * @pitfalls: WakaTime returns HTTP 404 for the entire organizations collection when the user belongs to no organizations, so this action returns an empty list instead of an error.
 */
const action = createAction({
    description: 'List the WakaTime for Teams organizations this user belongs to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orgs'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch WakaTime returns 404 (rather than an empty array) when the user belongs to no organizations.
        try {
            // https://wakatime.com/developers#orgs
            response = await nango.get<unknown>({
                endpoint: '/api/v1/users/current/orgs',
                retries: 3
            });
        } catch (error) {
            if (isNotFoundError(error)) {
                return {
                    organizations: []
                };
            }
            throw error;
        }

        if (response.status === 404) {
            return {
                organizations: []
            };
        }

        const parsed = ProviderOrgsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from the WakaTime organizations endpoint.'
            });
        }

        return {
            organizations: parsed.data.data,
            ...(parsed.data.total !== undefined && { total: parsed.data.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
