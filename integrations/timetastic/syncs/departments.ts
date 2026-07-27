import { createSync } from 'nango';
import { z } from 'zod';

const ProviderDepartmentSchema = z.object({
    id: z.number(),
    organisationId: z.number().optional(),
    name: z.string().nullable().optional(),
    managerId: z.number().optional(),
    bossId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archived: z.boolean().optional(),
    userCount: z.number().optional(),
    maxOff: z.number().optional(),
    showPublicHolidays: z.boolean().optional(),
    users: z.array(z.unknown()).optional()
});

const DepartmentSchema = z.object({
    id: z.string(),
    organisationId: z.number().optional(),
    name: z.string().optional(),
    managerId: z.number().optional(),
    bossId: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archived: z.boolean().optional(),
    userCount: z.number().optional(),
    maxOff: z.number().optional(),
    showPublicHolidays: z.boolean().optional(),
    users: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync departments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Department: DepartmentSchema
    },

    exec: async (nango) => {
        // Blocker: GET /departments returns a complete unfiltered snapshot with no
        // incremental filter, cursor, or deleted-record endpoint. Departments are a
        // small static resource, so we use full-refresh delete tracking.
        await nango.trackDeletesStart('Department');

        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: '/departments',
            retries: 3
        });

        const rawRecords = z.array(z.unknown()).parse(response.data);

        const departments: Array<z.infer<typeof DepartmentSchema>> = [];

        for (const item of rawRecords) {
            const parsed = ProviderDepartmentSchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Failed to parse department: ${parsed.error.message}`);
            }

            departments.push({
                id: String(parsed.data.id),
                ...(parsed.data.organisationId !== undefined && { organisationId: parsed.data.organisationId }),
                ...(parsed.data.name != null && { name: parsed.data.name }),
                ...(parsed.data.managerId !== undefined && { managerId: parsed.data.managerId }),
                ...(parsed.data.bossId !== undefined && { bossId: parsed.data.bossId }),
                ...(parsed.data.createdAt !== undefined && { createdAt: parsed.data.createdAt }),
                ...(parsed.data.updatedAt !== undefined && { updatedAt: parsed.data.updatedAt }),
                ...(parsed.data.archived !== undefined && { archived: parsed.data.archived }),
                ...(parsed.data.userCount !== undefined && { userCount: parsed.data.userCount }),
                ...(parsed.data.maxOff !== undefined && { maxOff: parsed.data.maxOff }),
                ...(parsed.data.showPublicHolidays !== undefined && { showPublicHolidays: parsed.data.showPublicHolidays }),
                ...(parsed.data.users !== undefined && { users: parsed.data.users })
            });
        }

        if (departments.length > 0) {
            await nango.batchSave(departments, 'Department');
        }

        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
