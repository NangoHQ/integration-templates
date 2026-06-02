import { createSync } from 'nango';
import { z } from 'zod';

function simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

const MetadataSchema = z.object({
    table: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const EmployeeTableRowSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    table: z.string(),
    last_changed: z.string().optional(),
    data: z.record(z.string(), z.unknown())
});

const ChangedEmployeeTableDataResponseSchema = z.object({
    table: z.string(),
    employees: z
        .record(
            z.string(),
            z.object({
                lastChanged: z.string().optional(),
                rows: z.array(z.record(z.string(), z.unknown())).optional()
            })
        )
        .optional()
});

function buildRowId(employeeId: string, table: string, row: Record<string, unknown>, index: number): string {
    const rowId = row['id'];
    if (typeof rowId === 'string' && rowId) {
        return `${employeeId}-${table}-${rowId}`;
    }

    const rowDate = row['date'];
    if (typeof rowDate === 'string' && rowDate) {
        return `${employeeId}-${table}-${rowDate}-${index}`;
    }

    const keys = Object.keys(row).sort();
    const canonical = JSON.stringify(keys.map((k) => [k, row[k]]));
    const hash = simpleHash(canonical);
    return `${employeeId}-${table}-${hash}`;
}

const sync = createSync({
    description: 'Sync employee table rows from BambooHR.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/employee-table-rows'
        }
    ],
    models: {
        EmployeeTableRow: EmployeeTableRowSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const table =
            (typeof metadata === 'object' && metadata && 'table' in metadata && typeof metadata['table'] === 'string' && metadata['table']) || 'jobInfo';

        const checkpoint = await nango.getCheckpoint();
        const since =
            (typeof checkpoint === 'object' &&
                checkpoint &&
                'updated_after' in checkpoint &&
                typeof checkpoint['updated_after'] === 'string' &&
                checkpoint['updated_after']) ||
            '1970-01-01T00:00:00Z';

        // https://documentation.bamboohr.com/reference/get-changed-employee-table-data
        const response = await nango.get({
            endpoint: `/v1/employees/changed/tables/${encodeURIComponent(table)}`,
            params: { since },
            headers: { Accept: 'application/json' },
            retries: 3
        });

        const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const parsed = ChangedEmployeeTableDataResponseSchema.safeParse(rawData);
        if (!parsed.success) {
            throw new Error(`Failed to parse changed employee table data: ${parsed.error.message}`);
        }

        const records = [];
        const employees = parsed.data.employees || {};
        let maxLastChanged: string | undefined;

        for (const [employeeId, employeeData] of Object.entries(employees)) {
            const lastChanged = employeeData.lastChanged;
            if (lastChanged) {
                if (!maxLastChanged || lastChanged > maxLastChanged) {
                    maxLastChanged = lastChanged;
                }
            }

            const rows = employeeData.rows || [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row) {
                    continue;
                }
                const rowId = buildRowId(employeeId, table, row, i);

                records.push({
                    id: rowId,
                    employee_id: employeeId,
                    table: table,
                    last_changed: lastChanged,
                    data: row
                });
            }
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'EmployeeTableRow');
        }

        if (maxLastChanged) {
            await nango.saveCheckpoint({ updated_after: maxLastChanged });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
