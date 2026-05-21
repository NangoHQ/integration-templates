import { createSync } from 'nango';
import type { ProxyConfiguration } from '@nangohq/runner-sdk';
import { z } from 'zod';

const ScimGroupResourceSchema = z.object({
    id: z.string(),
    externalId: z.string().nullish(),
    displayName: z.string().nullish(),
    meta: z
        .object({
            resourceType: z.string().nullish(),
            created: z.string().nullish(),
            lastModified: z.string().nullish(),
            location: z.string().nullish()
        })
        .nullish(),
    members: z
        .array(
            z.object({
                value: z.string(),
                display: z.string().nullish()
            })
        )
        .nullish()
});

const ScimGroupSchema = z.object({
    id: z.string(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional()
        })
        .optional(),
    members: z
        .array(
            z.object({
                value: z.string(),
                display: z.string().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const LIMIT = 100;

const sync = createSync({
    description: 'Sync SCIM groups from 1Password SCIM',
    version: '1.0.0',
    // https://support.1password.com/scim-endpoints/
    endpoints: [{ method: 'GET', path: '/syncs/scim-groups' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ScimGroup: ScimGroupSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint ?? {});
        const updatedAfter = validatedCheckpoint.success && validatedCheckpoint.data.updated_after ? validatedCheckpoint.data.updated_after : undefined;
        let latestUpdatedAfter = updatedAfter;
        let latestUpdatedAfterMs = updatedAfter ? Date.parse(updatedAfter) : Number.NEGATIVE_INFINITY;

        if (Number.isNaN(latestUpdatedAfterMs)) {
            latestUpdatedAfterMs = Number.NEGATIVE_INFINITY;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Groups',
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            params: {
                ...(updatedAfter && { filter: `meta.lastModified ge "${updatedAfter}"` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'startIndex',
                offset_start_value: 1,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: LIMIT,
                response_path: 'Resources'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const groups = page
                .map((item) => {
                    if (typeof item !== 'object' || item === null) {
                        throw new Error('Expected SCIM group resource to be an object');
                    }
                    const parseResult = ScimGroupResourceSchema.safeParse(item);
                    if (!parseResult.success) {
                        throw new Error(`Failed to parse SCIM group resource: ${parseResult.error.message}`);
                    }
                    return parseResult.data;
                })
                .map((record) => ({
                    id: record.id,
                    ...(record.externalId != null && { externalId: record.externalId }),
                    ...(record.displayName != null && { displayName: record.displayName }),
                    ...(record.meta != null && { meta: record.meta }),
                    ...(record.members != null && { members: record.members })
                }));

            if (groups.length === 0) {
                continue;
            }

            await nango.batchSave(groups, 'ScimGroup');

            for (const group of groups) {
                const lastModified = group.meta?.lastModified;
                if (!lastModified) {
                    continue;
                }

                const lastModifiedMs = Date.parse(lastModified);
                if (Number.isNaN(lastModifiedMs) || lastModifiedMs <= latestUpdatedAfterMs) {
                    continue;
                }

                latestUpdatedAfter = lastModified;
                latestUpdatedAfterMs = lastModifiedMs;
            }
        }

        if (latestUpdatedAfter && latestUpdatedAfter !== updatedAfter) {
            await nango.saveCheckpoint({ updated_after: latestUpdatedAfter });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
