import { createSync } from 'nango';
import { z } from 'zod';

const ToilSchema = z.object({
    id: z.number().int().nullable(),
    amount: z.number().nullable(),
    description: z.string().nullable()
});

const ToilsSchema = z.object({
    total: z.number(),
    toil: z.array(ToilSchema).nullable()
});

const UserAllowanceYearSchema = z.object({
    year: z.number().int(),
    allowance: z.number(),
    toils: ToilsSchema,
    carryForward: z.number()
});

const UsersAllowancesSchema = z.object({
    userId: z.number().int(),
    userAllowances: z.array(UserAllowanceYearSchema).nullable()
});

const UserAllowanceModelSchema = z.object({
    id: z.string(),
    userId: z.number().int(),
    year: z.number().int(),
    allowance: z.number().optional(),
    carryForward: z.number().optional(),
    toilsTotal: z.number().optional(),
    toils: z
        .array(
            z.object({
                id: z.number().int(),
                amount: z.number().optional(),
                description: z.string().optional()
            })
        )
        .optional()
});

type UserAllowanceRecord = z.infer<typeof UserAllowanceModelSchema>;

const sync = createSync({
    description: 'Sync user allowances, TOIL, and carry-forwards.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        UserAllowance: UserAllowanceModelSchema
    },

    exec: async (nango) => {
        // Blocker: GET /users/allowances returns a full snapshot of all users and all years
        // with no incremental filter, no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('UserAllowance');

        // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
        const response = await nango.get({
            endpoint: '/users/allowances',
            retries: 3
        });

        const parsed = z.array(UsersAllowancesSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse user allowances: ${parsed.error.message}`);
        }

        const records: UserAllowanceRecord[] = [];
        for (const user of parsed.data) {
            const allowances = user.userAllowances ?? [];
            for (const allowance of allowances) {
                const rawToils = allowance.toils.toil ?? [];
                const normalizedToils: Array<{ id: number; amount?: number; description?: string }> = [];
                for (const toil of rawToils) {
                    if (toil.id == null) {
                        continue;
                    }
                    const normalizedToil: { id: number; amount?: number; description?: string } = {
                        id: toil.id
                    };
                    if (toil.amount != null) {
                        normalizedToil.amount = toil.amount;
                    }
                    if (toil.description != null) {
                        normalizedToil.description = toil.description;
                    }
                    normalizedToils.push(normalizedToil);
                }

                const record: UserAllowanceRecord = {
                    id: `${user.userId}-${allowance.year}`,
                    userId: user.userId,
                    year: allowance.year
                };
                if (allowance.allowance !== undefined) {
                    record.allowance = allowance.allowance;
                }
                if (allowance.carryForward !== undefined) {
                    record.carryForward = allowance.carryForward;
                }
                if (allowance.toils.total !== undefined) {
                    record.toilsTotal = allowance.toils.total;
                }
                if (normalizedToils.length > 0) {
                    record.toils = normalizedToils;
                }

                records.push(record);
            }
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'UserAllowance');
        }

        await nango.trackDeletesEnd('UserAllowance');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
