import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('User ID. Example: 1522999')
});

const LeaveAllowanceSchema = z.object({
    year: z.number(),
    allowance: z.number(),
    remaining: z.number(),
    used: z.number()
});

const WorkingDaySchema = z.object({
    dayOfWeek: z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
    fromTimeAm: z.number(),
    toTimeAm: z.number(),
    fromTimePm: z.number(),
    toTimePm: z.number(),
    workingAm: z.boolean(),
    workingPm: z.boolean()
});

const WorkScheduleSchema = z.object({
    start: z.string(),
    days: z.array(WorkingDaySchema).nullable().optional()
});

const ProviderUserDetailSchema = z.object({
    id: z.number(),
    firstname: z.string().nullable().optional(),
    surname: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    admin: z.boolean().optional(),
    director: z.boolean().optional(),
    accountOwner: z.boolean().optional(),
    organisationId: z.number().optional(),
    departmentId: z.number().optional(),
    allowanceUnit: z.enum(['Days', 'Hours']).optional(),
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
    isEmailConfirmed: z.boolean().optional(),
    workingDays: z.array(WorkingDaySchema).nullable().optional(),
    workSchedules: z.array(WorkScheduleSchema).nullable().optional(),
    allowances: z.array(LeaveAllowanceSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    firstname: z.string().optional(),
    surname: z.string().optional(),
    email: z.string().optional(),
    admin: z.boolean().optional(),
    director: z.boolean().optional(),
    accountOwner: z.boolean().optional(),
    organisationId: z.number().optional(),
    departmentId: z.number().optional(),
    allowanceUnit: z.enum(['Days', 'Hours']).optional(),
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
    isEmailConfirmed: z.boolean().optional(),
    workingDays: z.array(WorkingDaySchema).optional(),
    workSchedules: z.array(WorkScheduleSchema).optional(),
    allowances: z.array(LeaveAllowanceSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single user, including their work schedule and per-year allowances.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                id: input.id
            });
        }

        const providerUser = ProviderUserDetailSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.firstname != null && { firstname: providerUser.firstname }),
            ...(providerUser.surname != null && { surname: providerUser.surname }),
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.admin != null && { admin: providerUser.admin }),
            ...(providerUser.director != null && { director: providerUser.director }),
            ...(providerUser.accountOwner != null && { accountOwner: providerUser.accountOwner }),
            ...(providerUser.organisationId != null && { organisationId: providerUser.organisationId }),
            ...(providerUser.departmentId != null && { departmentId: providerUser.departmentId }),
            ...(providerUser.allowanceUnit != null && { allowanceUnit: providerUser.allowanceUnit }),
            ...(providerUser.managerOfDepartments != null && { managerOfDepartments: providerUser.managerOfDepartments }),
            ...(providerUser.bossOfDepartments != null && { bossOfDepartments: providerUser.bossOfDepartments }),
            ...(providerUser.endDate != null && { endDate: providerUser.endDate }),
            ...(providerUser.departmentName != null && { departmentName: providerUser.departmentName }),
            ...(providerUser.gravatar != null && { gravatar: providerUser.gravatar }),
            ...(providerUser.allowanceRemaining != null && { allowanceRemaining: providerUser.allowanceRemaining }),
            ...(providerUser.hasLoggedOn != null && { hasLoggedOn: providerUser.hasLoggedOn }),
            ...(providerUser.isArchived != null && { isArchived: providerUser.isArchived }),
            ...(providerUser.approverId != null && { approverId: providerUser.approverId }),
            ...(providerUser.isApprover != null && { isApprover: providerUser.isApprover }),
            ...(providerUser.deptManagerId != null && { deptManagerId: providerUser.deptManagerId }),
            ...(providerUser.deptBossId != null && { deptBossId: providerUser.deptBossId }),
            ...(providerUser.birthday != null && { birthday: providerUser.birthday }),
            ...(providerUser.startDate != null && { startDate: providerUser.startDate }),
            ...(providerUser.hasPublicHolidays != null && { hasPublicHolidays: providerUser.hasPublicHolidays }),
            ...(providerUser.userInitials != null && { userInitials: providerUser.userInitials }),
            ...(providerUser.countryCode != null && { countryCode: providerUser.countryCode }),
            ...(providerUser.currentYearAllowance != null && { currentYearAllowance: providerUser.currentYearAllowance }),
            ...(providerUser.nextYearAllowance != null && { nextYearAllowance: providerUser.nextYearAllowance }),
            ...(providerUser.userLinkedWithGoogle != null && { userLinkedWithGoogle: providerUser.userLinkedWithGoogle }),
            ...(providerUser.userManagedExternally != null && { userManagedExternally: providerUser.userManagedExternally }),
            ...(providerUser.mfaEnabled != null && { mfaEnabled: providerUser.mfaEnabled }),
            ...(providerUser.inviteSentTimeUtc != null && { inviteSentTimeUtc: providerUser.inviteSentTimeUtc }),
            ...(providerUser.inviteSentTimeHumanised != null && { inviteSentTimeHumanised: providerUser.inviteSentTimeHumanised }),
            ...(providerUser.yearStart != null && { yearStart: providerUser.yearStart }),
            ...(providerUser.accrualSystem != null && { accrualSystem: providerUser.accrualSystem }),
            ...(providerUser.isEmailConfirmed != null && { isEmailConfirmed: providerUser.isEmailConfirmed }),
            ...(providerUser.workingDays != null && { workingDays: providerUser.workingDays }),
            ...(providerUser.workSchedules != null && { workSchedules: providerUser.workSchedules }),
            ...(providerUser.allowances != null && { allowances: providerUser.allowances })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
