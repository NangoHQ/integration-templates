import { z } from 'zod';
import { createAction } from 'nango';

const LogEntrySchema = z
    .object({
        message: z.string().describe('The message reserved attribute of your log.'),
        ddsource: z.string().optional().describe('The integration name associated with your log.'),
        ddtags: z.string().optional().describe('Tags associated with your logs.'),
        hostname: z.string().optional().describe('The name of the originating host of the log.'),
        service: z.string().optional().describe('The name of the application or service generating the log events.')
    })
    .passthrough();

const InputSchema = z.object({
    logs: z.array(LogEntrySchema).describe('Array of log entries to send.')
});

const OutputSchema = z
    .object({
        status: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Ingest raw log lines.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const siteParameter = connection.connection_config?.['siteParameter'];

        if (typeof siteParameter !== 'string' || !siteParameter) {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'connection_config.siteParameter is required to determine the Datadog log intake host.'
            });
        }

        // Trusted Datadog site values only: https://docs.datadoghq.com/getting_started/site/
        const trustedDatadogSites = new Set([
            'datadoghq.com',
            'us3.datadoghq.com',
            'us5.datadoghq.com',
            'datadoghq.eu',
            'ap1.datadoghq.com',
            'ap2.datadoghq.com',
            'ddog-gov.com',
            'us2.ddog-gov.com'
        ]);

        if (!trustedDatadogSites.has(siteParameter)) {
            throw new nango.ActionError({
                type: 'invalid_config',
                message: `connection_config.siteParameter "${siteParameter}" is not a recognized Datadog site.`
            });
        }

        const baseUrlOverride = `https://http-intake.logs.${siteParameter}/api`;

        // https://docs.datadoghq.com/api/latest/logs/#send-logs
        const response = await nango.post({
            endpoint: 'v2/logs',
            baseUrlOverride,
            data: input.logs,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Datadog log intake API.',
                details: parsed.error.format()
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
