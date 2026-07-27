import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderBalanceSchema = z.object({
    units_available: z.string(),
    units_carry_over_available: z.string(),
    units_used: z.string(),
    has_unlimited_timeoff: z.boolean(),
    category_id: z.string(),
    time_off_tracking_unit: z.string(),
    name: z.string(),
    description: z.string().optional().nullable()
});

const ProviderBalancesResponseSchema = z.object({
    balances: z.array(ProviderBalanceSchema)
});

const MemberSchema = z.object({
    id: z.string(),
    active: z.boolean().optional().nullable(),
    role: z.string().optional().nullable(),
    hris_role: z.string().optional().nullable()
});

const MembersResponseSchema = z.object({
    members: z.array(MemberSchema)
});

const TimeoffBalanceSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    category_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    units_available: z.string(),
    units_carry_over_available: z.string(),
    units_used: z.string(),
    has_unlimited_timeoff: z.boolean(),
    time_off_tracking_unit: z.string()
});

const sync = createSync({
    description: 'Sync current-cycle time-off balances per employee.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['r_employees', 'r_timeoff'],
    models: {
        TimeoffBalance: TimeoffBalanceSchema
    },

    exec: async (nango) => {
        // https://workable.readme.io/reference/members.md
        const membersResponse = await nango.get({
            endpoint: '/spi/v3/members',
            params: {
                limit: 100
            },
            retries: 3
        });

        const membersParsed = MembersResponseSchema.safeParse(membersResponse.data);
        if (!membersParsed.success) {
            throw new Error(`Failed to parse members response: ${membersParsed.error.message}`);
        }

        const adminMember = membersParsed.data.members.find((m) => m.active === true && (m.hris_role === 'hris_admin' || m.role === 'admin'));
        const memberId = adminMember?.id;

        const employees: { id: string }[] = [];

        // https://workable.readme.io/reference/employees
        const employeeProxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/employees
            endpoint: '/spi/v3/employees',
            params: {
                ...(memberId && { member_id: memberId })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'employees'
            },
            retries: 3
        };

        for await (const page of nango.paginate(employeeProxyConfig)) {
            const parsedPage = z.array(z.object({ id: z.string() })).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse employees page: ${parsedPage.error.message}`);
            }
            employees.push(...parsedPage.data);
        }

        await nango.trackDeletesStart('TimeoffBalance');

        for (const employee of employees) {
            const response = await getBalancesForEmployee(nango, employee.id);

            const parsed = ProviderBalancesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse timeoff balances for employee ${employee.id}: ${parsed.error.message}`);
            }

            const balances = parsed.data.balances.map((balance) => ({
                id: `${employee.id}:${balance.category_id}`,
                employee_id: employee.id,
                category_id: balance.category_id,
                name: balance.name,
                ...(balance.description != null && { description: balance.description }),
                units_available: balance.units_available,
                units_carry_over_available: balance.units_carry_over_available,
                units_used: balance.units_used,
                has_unlimited_timeoff: balance.has_unlimited_timeoff,
                time_off_tracking_unit: balance.time_off_tracking_unit
            }));

            if (balances.length > 0) {
                await nango.batchSave(balances, 'TimeoffBalance');
            }
        }

        await nango.trackDeletesEnd('TimeoffBalance');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        const status = error.response.status;
        return typeof status === 'number' ? status : undefined;
    }
    return undefined;
}

async function getBalancesForEmployee(nango: NangoSyncLocal, employeeId: string) {
    // https://workable.readme.io/reference/timeoffbalances
    const config: ProxyConfiguration = {
        // https://workable.readme.io/reference/timeoffbalances
        endpoint: '/spi/v3/timeoff/balances',
        params: {
            employee_id: employeeId
        },
        retries: 3
    };

    // @allowTryCatch Back off on 429 and retry spurious 404s
    try {
        const response = await nango.get(config);
        if (response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(config);
        }
        if (response.status === 404) {
            return await nango.get(config);
        }
        if (response.status >= 400) {
            throw new Error(`HTTP ${response.status} fetching timeoff balances for employee ${employeeId}`);
        }
        return response;
    } catch (error) {
        const status = getErrorStatus(error);
        if (status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return await nango.get(config);
        }
        if (status === 404) {
            return await nango.get(config);
        }
        throw error;
    }
}

export default sync;
