import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFormSchema = z.object({
    componentId: z.union([z.string(), z.number()]),
    formLinkName: z.string(),
    displayName: z.string().optional(),
    PermissionDetails: z.unknown().optional(),
    isVisible: z.union([z.boolean(), z.string()]).optional(),
    viewDetails: z.unknown().optional()
});

const ProviderResponseEnvelopeSchema = z.object({
    response: z.object({
        result: z.array(z.unknown()),
        status: z.union([z.number(), z.string()]).optional(),
        message: z.string().optional()
    })
});

const FormSchema = z.object({
    id: z.string(),
    componentId: z.string(),
    formLinkName: z.string(),
    displayName: z.string().optional(),
    PermissionDetails: z.unknown().optional(),
    isVisible: z.boolean().optional(),
    viewDetails: z.unknown().optional()
});

const sync = createSync({
    description: 'Sync Zoho People form definitions',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Form: FormSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/forms'
        }
    ],

    exec: async (nango) => {
        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/people/api/forms',
            retries: 3
        });

        const rawData = response.data;
        let rawForms: unknown[];

        if (rawData && typeof rawData === 'object') {
            const envelopeResult = ProviderResponseEnvelopeSchema.safeParse(rawData);
            if (envelopeResult.success) {
                const envelopeStatus = envelopeResult.data.response.status;
                if (envelopeStatus !== undefined && envelopeStatus !== 0 && envelopeStatus !== '0') {
                    throw new Error(`Zoho People API error: ${envelopeResult.data.response.message ?? 'Unknown error'}`);
                }
                rawForms = envelopeResult.data.response.result;
            } else if (Array.isArray(rawData)) {
                rawForms = rawData;
            } else {
                throw new Error('Unexpected response format from /people/api/forms: expected envelope or array');
            }
        } else {
            throw new Error('Unexpected response format from /people/api/forms: not an object');
        }

        await nango.trackDeletesStart('Form');

        const records = [];

        for (const rawForm of rawForms) {
            if (rawForm === null || typeof rawForm !== 'object') {
                throw new Error('Invalid form entry in response: not an object');
            }

            const parsed = ProviderFormSchema.safeParse(rawForm);
            if (!parsed.success) {
                throw new Error(`Invalid form entry in response: ${parsed.error.message}`);
            }

            const form = parsed.data;
            const componentId = String(form.componentId);
            const formLinkName = form.formLinkName;

            records.push({
                id: formLinkName,
                componentId: componentId,
                formLinkName: formLinkName,
                ...(form.displayName !== undefined && { displayName: form.displayName }),
                ...(form.PermissionDetails !== undefined && { PermissionDetails: form.PermissionDetails }),
                ...(form.isVisible !== undefined && {
                    isVisible: typeof form.isVisible === 'string' ? form.isVisible.toLowerCase() === 'true' : Boolean(form.isVisible)
                }),
                ...(form.viewDetails !== undefined && { viewDetails: form.viewDetails })
            });
        }

        if (records.length > 0) {
            await nango.batchSave(records, 'Form');
        }

        await nango.trackDeletesEnd('Form');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
