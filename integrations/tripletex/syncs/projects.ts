import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    name: z.string(),
    number: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    isClosed: z.boolean().optional(),
    isInternal: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    customer: z
        .object({
            id: z.number().optional()
        })
        .nullable()
        .optional(),
    projectManager: z
        .object({
            id: z.number().optional()
        })
        .nullable()
        .optional(),
    department: z
        .object({
            id: z.number().optional()
        })
        .nullable()
        .optional(),
    currency: z
        .object({
            id: z.number().optional()
        })
        .nullable()
        .optional()
});

const RecordSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isClosed: z.boolean().optional(),
    isInternal: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    customerId: z.string().optional(),
    projectManagerId: z.string().optional(),
    departmentId: z.string().optional(),
    currencyId: z.string().optional()
});

type ProjectRecord = {
    id: string;
    name: string;
    number?: string;
    displayName?: string;
    description?: string;
    startDate: string;
    endDate?: string;
    isClosed?: boolean;
    isInternal?: boolean;
    isOffer?: boolean;
    isFixedPrice?: boolean;
    customerId?: string;
    projectManagerId?: string;
    departmentId?: string;
    currencyId?: string;
};

const sync = createSync({
    description: 'Sync projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: RecordSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /v2/project with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Full refresh is required.
        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/project',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const projects: ProjectRecord[] = [];
            for (const raw of page) {
                const parsed = ProjectSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid project record: ${parsed.error.message}`);
                }
                const project = parsed.data;
                projects.push({
                    id: String(project.id),
                    name: project.name,
                    ...(project.number != null && { number: project.number }),
                    ...(project.displayName != null && { displayName: project.displayName }),
                    ...(project.description != null && { description: project.description }),
                    startDate: project.startDate,
                    ...(project.endDate != null && { endDate: project.endDate }),
                    ...(project.isClosed != null && { isClosed: project.isClosed }),
                    ...(project.isInternal != null && { isInternal: project.isInternal }),
                    ...(project.isOffer != null && { isOffer: project.isOffer }),
                    ...(project.isFixedPrice != null && { isFixedPrice: project.isFixedPrice }),
                    ...(project.customer != null && project.customer.id != null && { customerId: String(project.customer.id) }),
                    ...(project.projectManager != null && project.projectManager.id != null && { projectManagerId: String(project.projectManager.id) }),
                    ...(project.department != null && project.department.id != null && { departmentId: String(project.department.id) }),
                    ...(project.currency != null && project.currency.id != null && { currencyId: String(project.currency.id) })
                });
            }

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
