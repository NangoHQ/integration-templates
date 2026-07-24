import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable().optional()
});

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    parent_id: z.string().nullable()
});

const sync = createSync({
    description: 'Sync account departments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Department: DepartmentSchema
    },

    exec: async (nango) => {
        // Blocker: the /departments endpoint returns a bare array with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor or pagination.
        await nango.trackDeletesStart('Department');

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/departments.md
            endpoint: '/spi/v3/departments',
            retries: 3
        };

        // https://workable.readme.io/reference/departments.md
        const response = await nango.get(proxyConfig);

        if (!Array.isArray(response.data)) {
            throw new Error('Expected departments response to be an array');
        }

        const departments = response.data.map((raw) => {
            const parsed = ProviderDepartmentSchema.safeParse(raw);
            if (!parsed.success) {
                throw new Error(`Failed to parse department: ${parsed.error.message}`);
            }

            const record: { id: string; name: string; parent_id?: string | null } = {
                id: parsed.data.id,
                name: parsed.data.name
            };

            if (parsed.data.parent_id !== null) {
                record.parent_id = parsed.data.parent_id;
            }

            return record;
        });

        if (departments.length > 0) {
            await nango.batchSave(departments, 'Department');
        }

        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<typeof sync.exec>[0];
export default sync;
