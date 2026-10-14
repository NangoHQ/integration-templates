import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z
    .object({
        id: z.string().describe('Unique identifier of the user (UUID).'),
        first_name: z.string().describe('First name of the user.'),
        last_name: z.string().describe('Last name of the user.'),
        email: z.string().describe('Email address of the user.'),
        employee_id: z.string().nullable().describe('External employee identifier from an HR or ERP system, when present.'),
        role: z
            .string()
            .describe('Role of the user, e.g. BUSINESS_USER, BUSINESS_ADMIN, BUSINESS_BOOKKEEPER, BUSINESS_OWNER, GUEST_USER, AUDITOR or IT_ADMIN.'),
        status: z
            .string()
            .describe(
                'Lifecycle status of the user, e.g. USER_ACTIVE, USER_DRAFT, USER_INACTIVE, USER_SUSPENDED, INVITE_PENDING, INVITE_EXPIRED or USER_ONBOARDING.'
            ),
        is_manager: z.boolean().describe('Whether the user is a manager.'),
        business_id: z.string().nullable().describe('Unique identifier of the business the user belongs to.'),
        entity_id: z.string().nullable().describe('Unique identifier of the business entity the user is associated with.'),
        department_id: z.string().nullable().describe('Unique identifier of the department the user belongs to.'),
        location_id: z.string().nullable().describe('Unique identifier of the location assigned to the user.'),
        manager_id: z.string().nullable().describe('Unique identifier of the user manager.'),
        phone: z.union([z.string(), z.number()]).nullable().describe('Phone number of the user.'),
        scheduled_deactivation_date: z.string().nullable().describe('ISO 8601 date when the user is scheduled to be deactivated.'),
        scheduled_invitation_date: z
            .string()
            .nullable()
            .describe('ISO 8601 date when a draft user is scheduled to be invited to Ramp, or null if no invite is scheduled.'),
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

const CheckpointSchema = z.object({
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when no full refresh is in progress.')
});

const sync = createSync({
    description: 'Sync employees/users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
            const users = page.map((record) => UserSchema.parse(record));

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
