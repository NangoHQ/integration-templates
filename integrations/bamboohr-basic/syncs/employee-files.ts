import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmployeeFileSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    categoryId: z.number().optional(),
    categoryName: z.string().optional(),
    name: z.string().optional(),
    originalFileName: z.string().optional(),
    size: z.number().optional(),
    dateCreated: z.string().optional(),
    createdBy: z.string().optional(),
    shareWithEmployee: z.string().optional()
});

const CheckpointSchema = z.object({
    date_created: z.string()
});

const sync = createSync({
    description: 'Sync employee file metadata from BambooHR.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        EmployeeFile: EmployeeFileSchema
    },
    // https://documentation.bamboohr.com/reference/list-employee-files
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/employee-files'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const dateCreatedThreshold = checkpoint?.date_created;

        const employeeProxyConfig: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/list-employees
            endpoint: '/v1/employees',
            params: {
                sort: 'employeeId'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page[after]',
                cursor_path_in_response: 'meta.page.nextCursor',
                response_path: 'data',
                limit_name_in_request: 'page[limit]',
                limit: 50
            },
            retries: 3
        };

        const allFiles: z.infer<typeof EmployeeFileSchema>[] = [];
        let maxDateCreated = dateCreatedThreshold;

        for await (const page of nango.paginate(employeeProxyConfig)) {
            const employees = z
                .array(
                    z.object({
                        employeeId: z.string()
                    })
                )
                .safeParse(page);

            if (!employees.success) {
                throw new Error('Failed to parse employees response');
            }

            for (const employee of employees.data) {
                const employeeId = employee.employeeId;

                // @allowTryCatch 404 is expected when an employee has no accessible file categories.
                try {
                    // https://documentation.bamboohr.com/reference/list-employee-files
                    const response = await nango.get({
                        endpoint: `/v1/employees/${encodeURIComponent(employeeId)}/files/view`,
                        headers: {
                            Accept: 'application/json'
                        },
                        retries: 3
                    });

                    const parsed = z
                        .object({
                            categories: z.array(z.unknown()).optional()
                        })
                        .safeParse(response.data);

                    if (!parsed.success) {
                        throw new Error(`Failed to parse employee files response for employee ${employeeId}`);
                    }

                    const categories = parsed.data.categories ?? [];
                    for (const category of categories) {
                        const cat = z
                            .object({
                                id: z.number().optional(),
                                name: z.string().optional(),
                                files: z.array(z.unknown()).optional()
                            })
                            .safeParse(category);

                        if (!cat.success) {
                            throw new Error(`Failed to parse category for employee ${employeeId}`);
                        }

                        for (const file of cat.data.files ?? []) {
                            const fileParsed = z
                                .object({
                                    id: z.number(),
                                    name: z.string().optional(),
                                    originalFileName: z.string().optional(),
                                    size: z.number().optional(),
                                    dateCreated: z.string().optional(),
                                    createdBy: z.string().optional(),
                                    shareWithEmployee: z.string().optional()
                                })
                                .safeParse(file);

                            if (!fileParsed.success) {
                                throw new Error(`Failed to parse file for employee ${employeeId}`);
                            }

                            const fileData = fileParsed.data;
                            const fileDateCreated = fileData.dateCreated;

                            if (dateCreatedThreshold && fileDateCreated && fileDateCreated <= dateCreatedThreshold) {
                                continue;
                            }

                            allFiles.push({
                                id: String(fileData.id),
                                employeeId,
                                categoryId: cat.data.id,
                                categoryName: cat.data.name,
                                name: fileData.name,
                                originalFileName: fileData.originalFileName,
                                size: fileData.size,
                                dateCreated: fileData.dateCreated,
                                createdBy: fileData.createdBy,
                                shareWithEmployee: fileData.shareWithEmployee
                            });

                            if (fileDateCreated) {
                                if (!maxDateCreated || fileDateCreated > maxDateCreated) {
                                    maxDateCreated = fileDateCreated;
                                }
                            }
                        }
                    }
                } catch (error) {
                    const nangoError = z
                        .object({
                            response: z
                                .object({
                                    status: z.number()
                                })
                                .optional()
                        })
                        .safeParse(error);

                    if (nangoError.success && nangoError.data.response?.status === 404) {
                        continue;
                    }

                    throw error;
                }
            }
        }

        if (allFiles.length > 0) {
            await nango.batchSave(allFiles, 'EmployeeFile');
        }

        if (maxDateCreated) {
            await nango.saveCheckpoint({ date_created: maxDateCreated });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
