import { z } from 'zod';
import { createAction } from 'nango';

const ProfileInputSchema = z
    .object({
        email: z.string().email().optional(),
        phone_number: z.string().optional(),
        external_id: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        title: z.string().optional(),
        organization: z.string().optional(),
        image: z.string().optional(),
        location: z
            .object({
                address1: z.string().optional(),
                address2: z.string().optional(),
                city: z.string().optional(),
                country: z.string().optional(),
                region: z.string().optional(),
                zip: z.string().optional(),
                timezone: z.string().optional(),
                latitude: z.number().optional(),
                longitude: z.number().optional()
            })
            .optional()
    })
    .passthrough();

const InputSchema = z.object({
    profiles: z.array(ProfileInputSchema).min(1).describe('Array of profile attributes to bulk import.'),
    list_id: z.string().optional().describe('Optional list ID to add imported profiles to. Example: "XW53Ha"')
});

const ProviderJobSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z
            .object({
                status: z.string(),
                completed_at: z.string().nullable().optional(),
                failed_count: z.number().nullable().optional(),
                completed_count: z.number().nullable().optional(),
                total_count: z.number().nullable().optional()
            })
            .passthrough(),
        relationships: z.unknown().optional()
    })
});

const OutputSchema = z.object({
    job_id: z.string(),
    status: z.string(),
    completed_at: z.string().optional(),
    failed_count: z.number().optional(),
    completed_count: z.number().optional(),
    total_count: z.number().optional()
});

const action = createAction({
    description: 'Bulk-import profiles, optionally onto a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profiles:write', 'lists:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const profilesPayload = input.profiles.map((profile) => {
            const attributes: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(profile)) {
                if (value !== undefined) {
                    attributes[key] = value;
                }
            }
            return {
                type: 'profile',
                attributes
            };
        });

        const data: Record<string, unknown> = {
            type: 'profile-bulk-import-job',
            attributes: {
                profiles: {
                    data: profilesPayload
                }
            }
        };

        if (input.list_id !== undefined) {
            data['relationships'] = {
                lists: {
                    data: [
                        {
                            type: 'list',
                            id: input.list_id
                        }
                    ]
                }
            };
        }

        // https://developers.klaviyo.com/en/reference/create_profile_bulk_import_job
        const createResponse = await nango.post({
            endpoint: '/api/profile-bulk-import-jobs',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data
            },
            retries: 3
        });

        if (!createResponse.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create profile bulk import job'
            });
        }

        const createData = ProviderJobSchema.parse(createResponse.data);
        const jobId = createData.data.id;

        let status = createData.data.attributes.status;
        let completedAt = createData.data.attributes.completed_at;
        let failedCount = createData.data.attributes.failed_count;
        let completedCount = createData.data.attributes.completed_count;
        let totalCount = createData.data.attributes.total_count;

        const maxPolls = 10;
        const pollIntervalMs = 3000;
        let polls = 0;

        while ((status === 'pending' || status === 'processing') && polls < maxPolls) {
            await new Promise((resolve) => {
                setTimeout(resolve, pollIntervalMs);
            });

            // https://developers.klaviyo.com/en/reference/get_profile_bulk_import_job
            const pollResponse = await nango.get({
                endpoint: `/api/profile-bulk-import-jobs/${encodeURIComponent(jobId)}`,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 3
            });

            if (!pollResponse.data) {
                throw new nango.ActionError({
                    type: 'poll_failed',
                    message: `Failed to poll job status for job ${jobId}`
                });
            }

            const pollData = ProviderJobSchema.parse(pollResponse.data);
            status = pollData.data.attributes.status;
            completedAt = pollData.data.attributes.completed_at;
            failedCount = pollData.data.attributes.failed_count;
            completedCount = pollData.data.attributes.completed_count;
            totalCount = pollData.data.attributes.total_count;
            polls += 1;
        }

        return {
            job_id: jobId,
            status: status,
            ...(completedAt !== null && completedAt !== undefined && { completed_at: completedAt }),
            ...(failedCount !== null && failedCount !== undefined && { failed_count: failedCount }),
            ...(completedCount !== null && completedCount !== undefined && { completed_count: completedCount }),
            ...(totalCount !== null && totalCount !== undefined && { total_count: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
