import { createSync } from 'nango';
import { z } from 'zod';

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderOptionSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional().nullable()
});

const ProviderListSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional().nullable(),
    alias: z.string().optional(),
    manageable: z.string().optional(),
    multiple: z.string().optional(),
    options: z.array(ProviderOptionSchema).optional()
});

const sync = createSync({
    description: 'Sync department list values from BambooHR',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Department: DepartmentSchema
    },
    endpoints: [
        {
            path: '/syncs/departments',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Department');

        // https://documentation.bamboohr.com/reference/list-list-fields
        const response = await nango.get({
            endpoint: '/v1/meta/lists',
            params: {
                format: 'json'
            },
            retries: 3
        });

        const raw = response.data;

        if (!Array.isArray(raw)) {
            throw new Error(`Unexpected departments response format: ${JSON.stringify(raw).slice(0, 500)}`);
        }

        const parsed = z.array(ProviderListSchema).safeParse(raw);
        if (!parsed.success) {
            throw new Error(`Failed to parse departments response: ${parsed.error.message}`);
        }

        const departmentList = parsed.data.find((list) => list.alias === 'department');
        if (!departmentList || !departmentList.options) {
            throw new Error('department list not found in response');
        }

        const options = departmentList.options;

        const departments = options.map((item) => ({
            id: String(item.id),
            ...(item.name != null && { name: item.name })
        }));

        await nango.batchSave(departments, 'Department');
        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
