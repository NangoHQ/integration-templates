import { createSync } from 'nango';
import { z } from 'zod';

const ProviderUserSchema = z.object({
    id: z.number(),
    firstname: z.string().nullable(),
    surname: z.string().nullable(),
    email: z.string().nullable(),
    admin: z.boolean(),
    director: z.boolean(),
    accountOwner: z.boolean(),
    organisationId: z.number(),
    departmentId: z.number(),
    allowanceUnit: z.union([z.literal('Days'), z.literal('Hours')]).nullable(),
    managerOfDepartments: z.array(z.number()).nullable(),
    bossOfDepartments: z.array(z.number()).nullable(),
    endDate: z.string().nullable(),
    departmentName: z.string().nullable(),
    gravatar: z.string().nullable(),
    allowanceRemaining: z.number(),
    hasLoggedOn: z.boolean(),
    isArchived: z.boolean(),
    approverId: z.number(),
    isApprover: z.boolean(),
    deptManagerId: z.number(),
    deptBossId: z.number().nullable(),
    birthday: z.string().nullable(),
    startDate: z.string().nullable(),
    hasPublicHolidays: z.boolean(),
    userInitials: z.string().nullable(),
    countryCode: z.string().nullable(),
    currentYearAllowance: z.number(),
    nextYearAllowance: z.number(),
    userLinkedWithGoogle: z.boolean(),
    userManagedExternally: z.boolean(),
    mfaEnabled: z.boolean(),
    inviteSentTimeUtc: z.string().nullable(),
    inviteSentTimeHumanised: z.string().nullable(),
    yearStart: z.number(),
    accrualSystem: z.boolean(),
    isEmailConfirmed: z.boolean()
});

const UserSchema = z.object({
    id: z.string(),
    firstname: z.string().optional(),
    surname: z.string().optional(),
    email: z.string().optional(),
    admin: z.boolean(),
    director: z.boolean(),
    accountOwner: z.boolean(),
    organisationId: z.number(),
    departmentId: z.number(),
    allowanceUnit: z.union([z.literal('Days'), z.literal('Hours')]).optional(),
    managerOfDepartments: z.array(z.number()).optional(),
    bossOfDepartments: z.array(z.number()).optional(),
    endDate: z.string().optional(),
    departmentName: z.string().optional(),
    gravatar: z.string().optional(),
    allowanceRemaining: z.number(),
    hasLoggedOn: z.boolean(),
    isArchived: z.boolean(),
    approverId: z.number(),
    isApprover: z.boolean(),
    deptManagerId: z.number(),
    deptBossId: z.number().optional(),
    birthday: z.string().optional(),
    startDate: z.string().optional(),
    hasPublicHolidays: z.boolean(),
    userInitials: z.string().optional(),
    countryCode: z.string().optional(),
    currentYearAllowance: z.number(),
    nextYearAllowance: z.number(),
    userLinkedWithGoogle: z.boolean(),
    userManagedExternally: z.boolean(),
    mfaEnabled: z.boolean(),
    inviteSentTimeUtc: z.string().optional(),
    inviteSentTimeHumanised: z.string().optional(),
    yearStart: z.number(),
    accrualSystem: z.boolean(),
    isEmailConfirmed: z.boolean()
});

function normalizeUser(raw: z.infer<typeof ProviderUserSchema>): z.infer<typeof UserSchema> {
    return {
        id: String(raw.id),
        ...(raw.firstname != null && { firstname: raw.firstname }),
        ...(raw.surname != null && { surname: raw.surname }),
        ...(raw.email != null && { email: raw.email }),
        admin: raw.admin,
        director: raw.director,
        accountOwner: raw.accountOwner,
        organisationId: raw.organisationId,
        departmentId: raw.departmentId,
        ...(raw.allowanceUnit != null && { allowanceUnit: raw.allowanceUnit }),
        ...(raw.managerOfDepartments != null && { managerOfDepartments: raw.managerOfDepartments }),
        ...(raw.bossOfDepartments != null && { bossOfDepartments: raw.bossOfDepartments }),
        ...(raw.endDate != null && { endDate: raw.endDate }),
        ...(raw.departmentName != null && { departmentName: raw.departmentName }),
        ...(raw.gravatar != null && { gravatar: raw.gravatar }),
        allowanceRemaining: raw.allowanceRemaining,
        hasLoggedOn: raw.hasLoggedOn,
        isArchived: raw.isArchived,
        approverId: raw.approverId,
        isApprover: raw.isApprover,
        deptManagerId: raw.deptManagerId,
        ...(raw.deptBossId != null && { deptBossId: raw.deptBossId }),
        ...(raw.birthday != null && { birthday: raw.birthday }),
        ...(raw.startDate != null && { startDate: raw.startDate }),
        hasPublicHolidays: raw.hasPublicHolidays,
        ...(raw.userInitials != null && { userInitials: raw.userInitials }),
        ...(raw.countryCode != null && { countryCode: raw.countryCode }),
        currentYearAllowance: raw.currentYearAllowance,
        nextYearAllowance: raw.nextYearAllowance,
        userLinkedWithGoogle: raw.userLinkedWithGoogle,
        userManagedExternally: raw.userManagedExternally,
        mfaEnabled: raw.mfaEnabled,
        ...(raw.inviteSentTimeUtc != null && { inviteSentTimeUtc: raw.inviteSentTimeUtc }),
        ...(raw.inviteSentTimeHumanised != null && { inviteSentTimeHumanised: raw.inviteSentTimeHumanised }),
        yearStart: raw.yearStart,
        accrualSystem: raw.accrualSystem,
        isEmailConfirmed: raw.isEmailConfirmed
    };
}

const sync = createSync({
    description: 'Sync users.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        // Blocker: GET /users has no updated_since, cursor, or pagination parameters for incremental filtering.
        // The endpoint returns a bare array of all users, so a full snapshot with delete tracking is required.
        await nango.trackDeletesStart('User');

        // https://timetastic.co.uk/api/
        const response = await nango.get({
            endpoint: '/users',
            params: {
                includeArchivedUsers: 'true'
            },
            retries: 3
        });

        const parsed = z.array(ProviderUserSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse users response: ${parsed.error.message}`);
        }

        const users = parsed.data.map(normalizeUser);

        if (users.length > 0) {
            await nango.batchSave(users, 'User');
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
