import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Raw provider schema (https://docs.ramp.com/openapi/developer-api.json, component User): spec-nullable fields are .nullable().
const ProviderUserSchema = z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    employee_id: z.string().nullable(),
    role: z.string(),
    status: z.string(),
    is_manager: z.boolean(),
    business_id: z.string().nullable(),
    entity_id: z.string().nullable(),
    department_id: z.string().nullable(),
    location_id: z.string().nullable(),
    manager_id: z.string().nullable(),
    phone: z.string().nullable(),
    scheduled_deactivation_date: z.string().nullable(),
    scheduled_invitation_date: z.string().nullable(),
    custom_fields: z.array(
        z.object({
            name: z.string(),
            value: z.string()
        })
    )
});

const UserSchema = z
    .object({
        id: z.string().describe('Unique identifier of the user (UUID).'),
        first_name: z.string().describe('First name of the user.'),
        last_name: z.string().describe('Last name of the user.'),
        email: z.string().describe('Email address of the user.'),
        employee_id: z.string().optional().describe('External employee identifier from an HR or ERP system, when present.'),
        role: z
            .string()
            .describe('Role of the user, e.g. BUSINESS_USER, BUSINESS_ADMIN, BUSINESS_BOOKKEEPER, BUSINESS_OWNER, GUEST_USER, AUDITOR or IT_ADMIN.'),
        status: z
            .string()
            .describe(
                'Lifecycle status of the user, e.g. USER_ACTIVE, USER_DRAFT, USER_INACTIVE, USER_SUSPENDED, INVITE_PENDING, INVITE_EXPIRED or USER_ONBOARDING.'
            ),
        is_manager: z.boolean().describe('Whether the user is a manager.'),
        business_id: z.string().optional().describe('Unique identifier of the business the user belongs to.'),
        entity_id: z.string().optional().describe('Unique identifier of the business entity the user is associated with.'),
        department_id: z.string().optional().describe('Unique identifier of the department the user belongs to, when assigned.'),
        location_id: z.string().optional().describe('Unique identifier of the location assigned to the user, when assigned.'),
        manager_id: z.string().optional().describe('Unique identifier of the user manager, when assigned.'),
        phone: z.string().optional().describe('Phone number of the user, when set.'),
        scheduled_deactivation_date: z.string().optional().describe('ISO 8601 date when the user is scheduled to be deactivated, when scheduled.'),
        scheduled_invitation_date: z.string().optional().describe('ISO 8601 date when a draft user is scheduled to be invited to Ramp, when scheduled.'),
        custom_fields: z
            .array(
                z
                    .object({
                        name: z.string().describe('Name of the custom field.'),
                        value: z.string().describe('Value of the custom field.')
                    })
                    .describe('A custom field name/value pair defined for the user.')
            )
            .describe('Custom fields defined for the user.')
    })
    .describe('A Ramp user (employee) record.');

function toUser(user: z.infer<typeof ProviderUserSchema>): z.infer<typeof UserSchema> {
    return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status,
        is_manager: user.is_manager,
        custom_fields: user.custom_fields,
        ...(user.employee_id != null && { employee_id: user.employee_id }),
        ...(user.business_id != null && { business_id: user.business_id }),
        ...(user.entity_id != null && { entity_id: user.entity_id }),
        ...(user.department_id != null && { department_id: user.department_id }),
        ...(user.location_id != null && { location_id: user.location_id }),
        ...(user.manager_id != null && { manager_id: user.manager_id }),
        ...(user.phone != null && { phone: user.phone }),
        ...(user.scheduled_deactivation_date != null && { scheduled_deactivation_date: user.scheduled_deactivation_date }),
        ...(user.scheduled_invitation_date != null && { scheduled_invitation_date: user.scheduled_invitation_date })
    };
}

const CheckpointSchema = z.object({
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when no full refresh is in progress.')
});

const sync = createSync({
    description: 'Sync employees/users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['users:read'],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let start = typeof checkpoint?.['start'] === 'string' && checkpoint['start'] !== '' ? checkpoint['start'] : undefined;

        // GET /developer/v1/users has no incremental or date filter, so this is a full
        // refresh. Ramp still exposes a resumable page cursor, so persist it after each
        // saved page and keep delete tracking open until the full scan completes.
        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api-reference/users
            endpoint: '/developer/v1/users',
            params: {
                ...(start !== undefined ? { start } : {})
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    start =
                        typeof nextPageParam === 'string' ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined) : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const users = page.map((record) => toUser(ProviderUserSchema.parse(record)));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (start !== undefined) {
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
