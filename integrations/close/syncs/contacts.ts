import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CloseContactSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    emails: z.array(z.object({ email: z.string(), type: z.string().optional() }).passthrough()).optional(),
    phones: z.array(z.object({ phone: z.string(), type: z.string().optional() }).passthrough()).optional(),
    urls: z.array(z.object({ url: z.string(), type: z.string().optional() }).passthrough()).optional(),
    date_created: z.string().optional(),
    date_updated: z.string(),
    created_by: z.string().optional(),
    updated_by: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    organization: z.string().optional(),
    emails: z.array(z.object({ email: z.string(), type: z.string().optional() }).passthrough()).optional(),
    phones: z.array(z.object({ phone: z.string(), type: z.string().optional() }).passthrough()).optional(),
    urls: z.array(z.object({ url: z.string(), type: z.string().optional() }).passthrough()).optional(),
    date_created: z.string().optional(),
    date_updated: z.string(),
    created_by: z.string().optional(),
    updated_by: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Incrementally sync Close contacts using date_updated checkpoints.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];
        const isIncremental = Boolean(updatedAfter);
        const isFullRefresh = !isIncremental;
        let deleteTrackingStarted = false;

        const params: Record<string, string | number> = {
            _sort: 'date_updated'
        };

        if (isIncremental && updatedAfter) {
            params['date_updated__gt'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/
            endpoint: '/v1/contact/',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        let maxDateUpdated: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const contacts: Array<z.infer<typeof ContactSchema>> = [];

            for (const item of page) {
                const parsed = CloseContactSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact: ${parsed.error.message}`);
                }

                const contact = parsed.data;
                contacts.push({
                    id: contact.id,
                    lead_id: contact.lead_id,
                    ...(contact.name != null && { name: contact.name }),
                    ...(contact.title != null && { title: contact.title }),
                    ...(contact.organization != null && { organization: contact.organization }),
                    ...(contact.emails != null && { emails: contact.emails }),
                    ...(contact.phones != null && { phones: contact.phones }),
                    ...(contact.urls != null && { urls: contact.urls }),
                    ...(contact.date_created != null && { date_created: contact.date_created }),
                    date_updated: contact.date_updated,
                    ...(contact.created_by != null && { created_by: contact.created_by }),
                    ...(contact.updated_by != null && { updated_by: contact.updated_by })
                });

                if (maxDateUpdated === undefined || contact.date_updated > maxDateUpdated) {
                    maxDateUpdated = contact.date_updated;
                }
            }

            if (contacts.length > 0) {
                if (isFullRefresh && !deleteTrackingStarted) {
                    await nango.trackDeletesStart('Contact');
                    deleteTrackingStarted = true;
                }
                await nango.batchSave(contacts, 'Contact');
            }
        }

        if (isFullRefresh && deleteTrackingStarted) {
            await nango.trackDeletesEnd('Contact');
        }

        if (maxDateUpdated !== undefined) {
            await nango.saveCheckpoint({ updated_after: maxDateUpdated });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
