import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DepartmentSchema = z
    .object({
        id: z.string().describe('Unique identifier for the department (UUID).'),
        name: z.string().describe('Name of the department.')
    })
    .describe('A department in the Ramp account.');

const ProviderDepartmentSchema = z.object({
    id: z.string(),
    name: z.string()
});

const CheckpointSchema = z.object({
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when no full refresh is in progress.')
});

const sync = createSync({
    description: 'Sync departments from Ramp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['departments:read'],
    checkpoint: CheckpointSchema,

    models: {
        Department: DepartmentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let start = typeof checkpoint?.['start'] === 'string' && checkpoint['start'] !== '' ? checkpoint['start'] : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/departments
            endpoint: '/developer/v1/departments',
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

        // Ramp exposes only cursor pagination here, not a changed-since filter. Keep this as a
        // full refresh, but persist the cursor so an interrupted scan can resume mid-walk.
        await nango.trackDeletesStart('Department');

        const mapDepartments = (departments: z.infer<typeof ProviderDepartmentSchema>[]) =>
            departments.map((department) => ({
                id: department.id,
                name: department.name
            }));

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const departments = mapDepartments(z.array(ProviderDepartmentSchema).parse(page));

            if (departments.length > 0) {
                await nango.batchSave(departments, 'Department');
            }

            if (start !== undefined) {
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
