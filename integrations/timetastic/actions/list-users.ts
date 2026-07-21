import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    departmentId: z.number().optional().describe('An optional department id to filter the users. Example: 248819'),
    includeArchivedUsers: z.boolean().optional().describe('Whether to include archived users in the search results.'),
    onlyShowArchivedUsers: z.boolean().optional().describe('If archived users are included, should we ONLY show those.')
});

const ProviderUserSchema = z.object({
    id: z.number(),
    firstname: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    admin: z.boolean().optional(),
    director: z.boolean().optional(),
    accountOwner: z.boolean().optional(),
    organisationId: z.number().optional(),
    departmentId: z.number().optional(),
    allowanceUnit: z.string().optional(),
    managerOfDepartments: z.array(z.number()).nullable().optional(),
    bossOfDepartments: z.array(z.number()).nullable().optional(),
    endDate: z.string().nullable().optional(),
    departmentName: z.string().nullable().optional(),
    gravatar: z.string().nullable().optional(),
    allowanceRemaining: z.number().optional(),
    hasLoggedOn: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    approverId: z.number().optional(),
    isApprover: z.boolean().optional(),
    deptManagerId: z.number().optional(),
    deptBossId: z.number().optional(),
    birthday: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    hasPublicHolidays: z.boolean().optional(),
    userInitials: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    currentYearAllowance: z.number().optional(),
    nextYearAllowance: z.number().optional(),
    userLinkedWithGoogle: z.boolean().optional(),
    userManagedExternally: z.boolean().optional(),
    mfaEnabled: z.boolean().optional(),
    inviteSentTimeUtc: z.string().nullable().optional(),
    inviteSentTimeHumanised: z.string().nullable().optional(),
    yearStart: z.number().optional(),
    accrualSystem: z.boolean().optional(),
    isEmailConfirmed: z.boolean().optional()
});

const OutputUserSchema = z.object({
    id: z.number(),
    firstname: z.string().optional(),
    surname: z.string().optional(),
    email: z.string().optional(),
    admin: z.boolean().optional(),
    director: z.boolean().optional(),
    accountOwner: z.boolean().optional(),
    organisationId: z.number().optional(),
    departmentId: z.number().optional(),
    allowanceUnit: z.string().optional(),
    managerOfDepartments: z.array(z.number()).optional(),
    bossOfDepartments: z.array(z.number()).optional(),
    endDate: z.string().optional(),
    departmentName: z.string().optional(),
    gravatar: z.string().optional(),
    allowanceRemaining: z.number().optional(),
    hasLoggedOn: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    approverId: z.number().optional(),
    isApprover: z.boolean().optional(),
    deptManagerId: z.number().optional(),
    deptBossId: z.number().optional(),
    birthday: z.string().optional(),
    startDate: z.string().optional(),
    hasPublicHolidays: z.boolean().optional(),
    userInitials: z.string().optional(),
    countryCode: z.string().optional(),
    currentYearAllowance: z.number().optional(),
    nextYearAllowance: z.number().optional(),
    userLinkedWithGoogle: z.boolean().optional(),
    userManagedExternally: z.boolean().optional(),
    mfaEnabled: z.boolean().optional(),
    inviteSentTimeUtc: z.string().optional(),
    inviteSentTimeHumanised: z.string().optional(),
    yearStart: z.number().optional(),
    accrualSystem: z.boolean().optional(),
    isEmailConfirmed: z.boolean().optional()
});

const OutputSchema = z.object({
    users: z.array(OutputUserSchema)
});

function mapProviderUser(user: unknown) {
    const parsed = ProviderUserSchema.parse(user);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (value !== null && value !== undefined) {
            result[key] = value;
        }
    }
    return OutputUserSchema.parse(result);
}

const action = createAction({
    description: 'List users for the organisation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/
        const response = await nango.get({
            endpoint: '/users',
            params: {
                ...(input.departmentId !== undefined && { departmentId: input.departmentId.toString() }),
                ...(input.includeArchivedUsers !== undefined && { includeArchivedUsers: input.includeArchivedUsers.toString() }),
                ...(input.onlyShowArchivedUsers !== undefined && { onlyShowArchivedUsers: input.onlyShowArchivedUsers.toString() })
            },
            retries: 3
        });

        const rawUsers = z.array(z.unknown()).parse(response.data);

        return {
            users: rawUsers.map(mapProviderUser)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
