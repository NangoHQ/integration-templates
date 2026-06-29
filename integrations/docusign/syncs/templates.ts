import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TemplateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    uri: z.string().optional()
});

const CheckpointSchema = z.object({
    start_position: z.number().int().nonnegative()
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const ProviderEnvelopeTemplateSchema = z.object({
    templateId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    uri: z.string().optional()
});

const sync = createSync({
    description: 'Sync template metadata with full-refresh delete tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Template: TemplateSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/templates'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();

        if (!metadata?.accountId) {
            throw new Error('accountId is required in connection metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        let startPosition = 0;
        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            startPosition = parsedCheckpoint.data.start_position;
        }

        // Blocker: DocuSign GET /templates has no changed-since filter or deleted-record
        // endpoint, but it does support offset pagination for resumable full refreshes.

        // https://developers.docusign.com/docs/esign-rest-api/reference/Templates/Templates/list/
        if (startPosition === 0) {
            await nango.trackDeletesStart('Template');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.docusign.com/docs/esign-rest-api/reference/Templates/Templates/list/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(metadata.accountId)}/templates`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start_position',
                offset_start_value: startPosition,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'envelopeTemplates'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const templates = [];

            for (const raw of page) {
                const parsed = ProviderEnvelopeTemplateSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Invalid template response: ${parsed.error.message}`);
                }

                const template = parsed.data;

                templates.push({
                    id: template.templateId,
                    ...(template.name !== undefined && { name: template.name }),
                    ...(template.description !== undefined && { description: template.description }),
                    ...(template.created !== undefined && { created: template.created }),
                    ...(template.lastModified !== undefined && { lastModified: template.lastModified }),
                    ...(template.uri !== undefined && { uri: template.uri })
                });
            }

            if (templates.length > 0) {
                await nango.batchSave(templates, 'Template');
            }

            // Save offset checkpoint so an interrupted run can resume.
            startPosition = startPosition + templates.length;
            await nango.saveCheckpoint({
                start_position: startPosition
            });
        }

        await nango.trackDeletesEnd('Template');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
