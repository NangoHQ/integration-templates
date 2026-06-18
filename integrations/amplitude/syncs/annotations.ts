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

const sync = createSync({
    description: 'Sync Amplitude chart annotations.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
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

        const connection = await nango.getConnection();
        const connectionConfigResult = ConnectionConfigSchema.safeParse(connection.connection_config);
        const hostname = connectionConfigResult.success ? (connectionConfigResult.data.hostname ?? 'amplitude.com') : 'amplitude.com';
        const baseUrlOverride = hostname === 'amplitude.com' ? undefined : `https://${hostname}`;

        // https://amplitude.com/docs/apis/analytics/chart-annotations#get-all-annotations
        const response = await nango.get({
            endpoint: '/api/3/annotations',
            params: {
                ...(metadata.category && { category: metadata.category }),
                ...(metadata.chart_id && { chart_id: metadata.chart_id }),
                ...(metadata.start && { start: metadata.start }),
                ...(metadata.end && { end: metadata.end })
            },
            baseUrlOverride,
            retries: 3
        });

        const responseSchema = z.object({
            data: z.array(ProviderAnnotationSchema)
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

        await nango.trackDeletesStart('Annotation');
        await nango.batchSave(annotations, 'Annotation');
        await nango.trackDeletesEnd('Annotation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
