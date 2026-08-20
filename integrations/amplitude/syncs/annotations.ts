import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    category: z.string().nullable().optional()
});

const ProviderAnnotationSchema = z.object({
    id: z.number(),
    start: z.string(),
    details: z.string().nullable().optional(),
    category: ProviderCategorySchema.nullable().optional(),
    end: z.string().nullable().optional(),
    label: z.string(),
    chart_id: z.string().nullable().optional()
});

const AnnotationSchema = z.object({
    id: z.string(),
    start: z.string(),
    label: z.string(),
    details: z.string().optional(),
    end: z.string().optional(),
    chart_id: z.string().optional(),
    category_id: z.string().optional(),
    category_name: z.string().optional()
});

const MetadataSchema = z.object({
    category: z.string().optional(),
    chart_id: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional()
});

const ConnectionConfigSchema = z.object({
    hostname: z.string().optional()
});

const CheckpointSchema = z.object({
    next_window_start: z.string(),
    metadata_signature: z.string()
});

const WINDOW_SIZE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_WINDOWS_PER_EXECUTION = 52;
const BOUNDARY_OVERLAP_MS = 1;

function parseDate(value: string, field: 'start' | 'end'): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid metadata.${field}: expected an ISO 8601 timestamp.`);
    }
    return date;
}

function metadataSignature(metadata: z.infer<typeof MetadataSchema>): string {
    return JSON.stringify({
        category: metadata.category ?? null,
        chart_id: metadata.chart_id ?? null,
        start: metadata.start ?? null,
        end: metadata.end ?? null
    });
}

const sync = createSync({
    description: 'Sync Amplitude chart annotations.',
    version: '1.1.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Annotation: AnnotationSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/annotations'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata ?? {});
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;
        const configuredStart = metadata.start ? parseDate(metadata.start, 'start') : null;
        const configuredEnd = metadata.end ? parseDate(metadata.end, 'end') : null;
        if (configuredStart && configuredEnd && configuredStart >= configuredEnd) {
            throw new Error('Invalid metadata: start must be before end.');
        }

        const connection = await nango.getConnection();
        const connectionConfigResult = ConnectionConfigSchema.safeParse(connection.connection_config);
        const hostname = connectionConfigResult.success ? (connectionConfigResult.data.hostname ?? 'amplitude.com') : 'amplitude.com';
        const baseUrlOverride = hostname === 'amplitude.com' ? undefined : `https://${hostname}`;

        const responseSchema = z.object({
            data: z.array(ProviderAnnotationSchema)
        });

        const fetchAndSave = async (start: string | undefined, end: string | undefined): Promise<void> => {
            // https://amplitude.com/docs/apis/analytics/chart-annotations#get-all-annotations
            const response = await nango.get({
                endpoint: '/api/3/annotations',
                params: {
                    ...(metadata.category && { category: metadata.category }),
                    ...(metadata.chart_id && { chart_id: metadata.chart_id }),
                    ...(start && { start }),
                    ...(end && { end })
                },
                baseUrlOverride,
                retries: 3
            });

            const parsed = responseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse annotations response: ${parsed.error.message}`);
            }

            const annotations = parsed.data.data.map((annotation) => {
                const record: {
                    id: string;
                    start: string;
                    label: string;
                    details?: string;
                    end?: string;
                    chart_id?: string;
                    category_id?: string;
                    category_name?: string;
                } = {
                    id: String(annotation.id),
                    start: annotation.start,
                    label: annotation.label
                };

                if (annotation.details != null) {
                    record.details = annotation.details;
                }

                if (annotation.end != null) {
                    record.end = annotation.end;
                }

                if (annotation.chart_id != null) {
                    record.chart_id = annotation.chart_id;
                }

                if (annotation.category != null) {
                    record.category_id = String(annotation.category.id);
                    if (annotation.category.name != null) {
                        record.category_name = annotation.category.name;
                    } else if (annotation.category.category != null) {
                        record.category_name = annotation.category.category;
                    }
                }

                return record;
            });

            if (annotations.length > 0) {
                await nango.batchSave(annotations, 'Annotation');
            }
        };

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const currentMetadataSignature = metadataSignature(metadata);
        const checkpoint = parsedCheckpoint.success && parsedCheckpoint.data.metadata_signature === currentMetadataSignature ? parsedCheckpoint.data : null;
        const targetEnd = configuredEnd ?? new Date();

        if (!checkpoint) {
            // Preserve the existing first-run behavior: seed all currently matching
            // annotations, then use bounded date windows for subsequent executions.
            await fetchAndSave(metadata.start, metadata.end);
            await nango.saveCheckpoint({
                next_window_start: targetEnd.toISOString(),
                metadata_signature: currentMetadataSignature
            });
            return;
        }

        let windowStart = parseDate(checkpoint.next_window_start, 'start');
        if (windowStart >= targetEnd) {
            return;
        }

        for (let windowIndex = 0; windowIndex < MAX_WINDOWS_PER_EXECUTION && windowStart < targetEnd; windowIndex++) {
            const windowEnd = new Date(Math.min(windowStart.getTime() + WINDOW_SIZE_MS, targetEnd.getTime()));
            const requestStart = new Date(windowStart.getTime() - BOUNDARY_OVERLAP_MS);

            await fetchAndSave(requestStart.toISOString(), windowEnd.toISOString());

            const reachedTargetEnd = windowEnd.getTime() >= targetEnd.getTime();
            await nango.saveCheckpoint({
                next_window_start: windowEnd.toISOString(),
                metadata_signature: currentMetadataSignature
            });

            if (reachedTargetEnd) {
                return;
            }
            windowStart = windowEnd;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
