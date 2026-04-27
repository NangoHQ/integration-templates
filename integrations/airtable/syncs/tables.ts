import { createSync } from 'nango';
import { z } from 'zod';

// Provider schemas matching the Airtable Metadata API response
const AirtableViewSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string()
});

// Airtable field options is a flexible object with string keys and unknown values
const AirtableFieldOptionsSchema = z.record(z.string(), z.unknown()).optional();

const AirtableFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    options: AirtableFieldOptionsSchema
});

const AirtableTableSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(AirtableFieldSchema),
    views: z.array(AirtableViewSchema)
});

const AirtableBaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
});

const GetBaseSchemaResponseSchema = z.object({
    tables: z.array(AirtableTableSchema)
});

// Normalized model for sync output
const TableSchema = z.object({
    id: z.string(),
    baseId: z.string(),
    baseName: z.string(),
    tableId: z.string(),
    tableName: z.string(),
    description: z.string().optional(),
    primaryFieldId: z.string(),
    fields: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional()
        })
    ),
    views: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            type: z.string()
        })
    )
});

// Checkpoint schema for tracking which base we're processing
// This allows resuming if the sync fails partway through
const CheckpointSchema = z.object({
    lastProcessedBaseId: z.string()
});

type TablesCheckpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync Airtable table schemas across bases in scope',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/tables' }],
    checkpoint: CheckpointSchema,
    models: {
        Table: TableSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as TablesCheckpoint | null;
        await nango.trackDeletesStart('Table');

        const bases: z.infer<typeof AirtableBaseSchema>[] = [];

        // Step 1: List all bases
        // https://airtable.com/developers/web/api/list-bases
        const listBasesProxyConfig = {
            endpoint: '/v0/meta/bases',
            paginate: {
                type: 'cursor' as const,
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'offset',
                response_path: 'bases'
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof AirtableBaseSchema>>(listBasesProxyConfig)) {
            const parsedBasesPage = z.array(AirtableBaseSchema).safeParse(page);
            if (!parsedBasesPage.success) {
                await nango.log(`Failed to parse bases page: ${JSON.stringify(parsedBasesPage.error)}`, { level: 'error' });
                throw new Error('Failed to parse Airtable bases page');
            }

            bases.push(...parsedBasesPage.data);
        }
        await nango.log(`Found ${bases.length} bases`);

        // Determine where to resume if we have a checkpoint
        let startIndex = 0;
        if (checkpoint?.lastProcessedBaseId) {
            const index = bases.findIndex((base) => base.id === checkpoint.lastProcessedBaseId);
            if (index !== -1) {
                startIndex = index + 1;
                await nango.log(`Resuming from base index ${startIndex} after checkpoint`);
            } else {
                await nango.log(`Checkpoint base ${checkpoint.lastProcessedBaseId} was not found; restarting full refresh`, {
                    level: 'warn'
                });
            }
        }

        // Process remaining bases
        for (let i = startIndex; i < bases.length; i++) {
            const base = bases[i];
            if (!base) {
                continue;
            }

            // Step 2: Get table schema for each base
            // https://airtable.com/developers/web/api/get-base-schema
            const schemaResponse = await nango.get({
                endpoint: `/v0/meta/bases/${base.id}/tables`,
                retries: 3
            });

            const parsedSchema = GetBaseSchemaResponseSchema.safeParse(schemaResponse.data);
            if (!parsedSchema.success) {
                await nango.log(`Failed to parse schema for base ${base.id}: ${JSON.stringify(parsedSchema.error)}`, { level: 'error' });
                throw new Error(`Failed to parse Airtable schema for base ${base.id}`);
            }

            const tables = parsedSchema.data.tables;
            await nango.log(`Base ${base.name} (${base.id}) has ${tables.length} tables`);

            // Transform and save tables
            const tableRecords = tables.map((table) => ({
                id: `${base.id}-${table.id}`,
                baseId: base.id,
                baseName: base.name,
                tableId: table.id,
                tableName: table.name,
                ...(table.description !== undefined && table.description !== null && { description: table.description }),
                primaryFieldId: table.primaryFieldId,
                fields: table.fields.map((field) => ({
                    id: field.id,
                    name: field.name,
                    type: field.type,
                    ...(field.description !== undefined && field.description !== null && { description: field.description })
                })),
                views: table.views.map((view) => ({
                    id: view.id,
                    name: view.name,
                    type: view.type
                }))
            }));

            if (tableRecords.length > 0) {
                await nango.batchSave(tableRecords, 'Table');
            }

            // Save checkpoint after processing this base
            await nango.saveCheckpoint({
                lastProcessedBaseId: base.id
            });
        }

        await nango.trackDeletesEnd('Table');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
