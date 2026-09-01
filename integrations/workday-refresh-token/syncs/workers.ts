import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSupervisoryOrganizationSchema = z.object({
    descriptor: z.string().optional(),
    id: z.string(),
    href: z.string().optional()
});

const ProviderWorkerSchema = z.object({
    id: z.string(),
    descriptor: z.string(),
    href: z.string().optional(),
    primaryWorkPhone: z.string().optional(),
    primaryWorkEmail: z.string().optional(),
    businessTitle: z.string().optional(),
    isManager: z.boolean().optional(),
    primarySupervisoryOrganization: ProviderSupervisoryOrganizationSchema.optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const SupervisoryOrganizationSchema = z.object({
    descriptor: z.string().optional().describe('Display name of the primary supervisory organization'),
    id: z.string().describe('Unique identifier of the primary supervisory organization'),
    href: z.string().optional().describe('API hyperlink to the primary supervisory organization resource')
});

const WorkerSchema = z
    .object({
        id: z.string().describe('Unique Workday identifier (WID) for the worker'),
        descriptor: z.string().describe('Human-readable display name or descriptor of the worker'),
        href: z.string().optional().describe('API hyperlink to the worker resource'),
        primaryWorkPhone: z.string().optional().describe('Primary work phone number of the worker'),
        primaryWorkEmail: z.string().optional().describe('Primary work email address of the worker'),
        businessTitle: z.string().optional().describe('Business title or job title of the worker'),
        isManager: z.boolean().optional().describe('Whether the worker holds a manager position'),
        primarySupervisoryOrganization: SupervisoryOrganizationSchema.optional().describe('Primary supervisory organization the worker belongs to')
    })
    .describe('Workday worker (employee or contingent worker) record');

const sync = createSync({
    description: 'Sync worker (employee/contingent worker) records',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Worker: WorkerSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = z
            .object({
                tenant: z.string()
            })
            .safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Missing tenant in metadata');
        }
        const tenant = parsedMetadata.data.tenant;

        const checkpoint = await nango.getCheckpoint();
        const initialOffset = checkpoint?.offset ?? 0;
        let nextOffset: number | undefined = initialOffset;

        if (initialOffset === 0) {
            await nango.trackDeletesStart('Worker');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://community.workday.com/api
            endpoint: `/common/v1/${encodeURIComponent(tenant)}/workers`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: initialOffset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderWorkerSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse workers page: ${parsed.error.message}`);
            }

            const workers = parsed.data.map((worker) => ({
                id: worker.id,
                descriptor: worker.descriptor,
                ...(worker.href != null && { href: worker.href }),
                ...(worker.primaryWorkPhone != null && { primaryWorkPhone: worker.primaryWorkPhone }),
                ...(worker.primaryWorkEmail != null && { primaryWorkEmail: worker.primaryWorkEmail }),
                ...(worker.businessTitle != null && { businessTitle: worker.businessTitle }),
                ...(worker.isManager != null && { isManager: worker.isManager }),
                ...(worker.primarySupervisoryOrganization != null && {
                    primarySupervisoryOrganization: {
                        id: worker.primarySupervisoryOrganization.id,
                        ...(worker.primarySupervisoryOrganization.descriptor != null && {
                            descriptor: worker.primarySupervisoryOrganization.descriptor
                        }),
                        ...(worker.primarySupervisoryOrganization.href != null && {
                            href: worker.primarySupervisoryOrganization.href
                        })
                    }
                })
            }));

            if (workers.length > 0) {
                await nango.batchSave(workers, 'Worker');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        if (initialOffset === 0) {
            await nango.trackDeletesEnd('Worker');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
