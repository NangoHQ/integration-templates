import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetDomainInputSchema = z
    .object({
        domain_name: z.string().describe('Name of the sending domain to retrieve. Example: "mg.example.com"')
    })
    .describe('Input for retrieving a single Mailgun sending domain.');

const DomainSchema = z.object({
    id: z.string().describe('Unique identifier of the domain. Example: "65d8822c5c899f9accba6155"'),
    name: z.string().describe('Fully qualified name of the domain. Example: "mg.example.com"'),
    type: z.string().describe('Domain type: "custom" or "sandbox".'),
    state: z.string().describe('Domain state. Example: "active"'),
    created_at: z.string().describe('RFC 2822 timestamp of when the domain was created. Example: "Fri, 23 Feb 2024 11:31:56 GMT"'),
    smtp_login: z.string().describe('Default SMTP login for the domain.'),
    spam_action: z.string().describe('Spam filter behavior: "disabled", "block", or "tag".'),
    wildcard: z.boolean().describe('Whether the domain accepts mail for all of its subdomains.'),
    require_tls: z.boolean().describe('Whether TLS is required when delivering messages.'),
    skip_verification: z.boolean().describe('Whether DNS verification was skipped for the domain.'),
    is_disabled: z.boolean().describe('Whether the domain is disabled.'),
    use_automatic_sender_security: z.boolean().describe('Whether Mailgun manages DKIM key generation and DNS record configuration automatically.'),
    web_prefix: z.string().describe('Tracking hostname prefix. Example: "email"'),
    web_scheme: z.string().describe('Tracking URL scheme: "http" or "https".'),
    encrypt_incoming_message: z.boolean().describe('Whether incoming messages are encrypted at rest.'),
    message_ttl: z.number().describe('Message retention period in seconds; 0 means the account default.')
});

const ReceivingDnsRecordSchema = z.object({
    is_active: z.boolean().describe('Whether this record is currently active for the domain.'),
    cached: z.array(z.string()).describe('Record values currently observed in public DNS.'),
    priority: z.string().describe('MX record priority. Example: "10"'),
    record_type: z.string().describe('DNS record type. Example: "MX"'),
    valid: z.string().describe('DNS verification status: "valid", "invalid", or "unknown".'),
    value: z.string().describe('Expected DNS record value. Example: "mxa.mailgun.org"')
});

const SendingDnsRecordSchema = z.object({
    is_active: z.boolean().describe('Whether this record is currently active for the domain.'),
    cached: z.array(z.string()).describe('Record values currently observed in public DNS.'),
    name: z.string().describe('Hostname the record must be published on. Example: "mg.example.com"'),
    record_type: z.string().describe('DNS record type: "TXT" or "CNAME".'),
    valid: z.string().describe('DNS verification status: "valid", "invalid", or "unknown".'),
    value: z.string().describe('Expected DNS record value.')
});

const GetDomainOutputSchema = z
    .object({
        domain: DomainSchema.describe('Details of the requested sending domain.'),
        receiving_dns_records: z
            .array(ReceivingDnsRecordSchema)
            .optional()
            .describe('Inbound (MX) DNS records required for receiving email. Only present for custom domains; omitted for sandbox domains.'),
        sending_dns_records: z
            .array(SendingDnsRecordSchema)
            .optional()
            .describe('Outbound (SPF, DKIM, tracking) DNS records required for sending email. Only present for custom domains; omitted for sandbox domains.')
    })
    .describe('The requested Mailgun domain and, for custom domains, its expected DNS records.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET to retrieve one domain's details; no provider mutations.
 * @pitfalls: Sandbox domains return only the domain object; expected DNS record lists are returned solely for custom domains. Mailgun's US and EU regions are entirely separate data stores, so a domain only resolves on a connection configured for the region where the account lives.
 */
const action = createAction({
    description: "Retrieve a single sending domain's details, including DNS records.",
    version: '1.0.0',
    input: GetDomainInputSchema,
    output: GetDomainOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof GetDomainOutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains
            endpoint: `/v3/domains/${encodeURIComponent(input.domain_name)}`,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = GetDomainOutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
