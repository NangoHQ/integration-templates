import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
import listAudiences from '../actions/list-audiences.js';
import createAudience from '../actions/create-audience.js';
import getAudience from '../actions/get-audience.js';
import deleteAudience from '../actions/delete-audience.js';
import listBroadcasts from '../actions/list-broadcasts.js';
import createBroadcast from '../actions/create-broadcast.js';
import getBroadcast from '../actions/get-broadcast.js';
import updateBroadcast from '../actions/update-broadcast.js';
import deleteBroadcast from '../actions/delete-broadcast.js';
import cancelBroadcast from '../actions/cancel-broadcast.js';
import listBroadcastClickedLinks from '../actions/list-broadcast-clicked-links.js';
import listBroadcastRecipients from '../actions/list-broadcast-recipients.js';
import sendBroadcast from '../actions/send-broadcast.js';
import listContactProperties from '../actions/list-contact-properties.js';
import createContactProperty from '../actions/create-contact-property.js';
import getContactProperty from '../actions/get-contact-property.js';
import updateContactProperty from '../actions/update-contact-property.js';
import deleteContactProperty from '../actions/delete-contact-property.js';
import listContacts from '../actions/list-contacts.js';
import createContact from '../actions/create-contact.js';
import listContactImports from '../actions/list-contact-imports.js';
import createContactImport from '../actions/create-contact-import.js';
import getContactImport from '../actions/get-contact-import.js';
import listContactSegments from '../actions/list-contact-segments.js';
import addContactToSegment from '../actions/add-contact-to-segment.js';
import removeContactFromSegment from '../actions/remove-contact-from-segment.js';
import listContactTopics from '../actions/list-contact-topics.js';
import updateContactTopics from '../actions/update-contact-topics.js';
import getContact from '../actions/get-contact.js';
import updateContact from '../actions/update-contact.js';
import deleteContact from '../actions/delete-contact.js';
import listDomains from '../actions/list-domains.js';
import createDomain from '../actions/create-domain.js';
import createDomainClaim from '../actions/create-domain-claim.js';
import getDomain from '../actions/get-domain.js';
import updateDomain from '../actions/update-domain.js';
import deleteDomain from '../actions/delete-domain.js';
import getDomainClaim from '../actions/get-domain-claim.js';
import verifyDomainClaim from '../actions/verify-domain-claim.js';
import verifyDomain from '../actions/verify-domain.js';
import listEmails from '../actions/list-emails.js';
import sendEmail from '../actions/send-email.js';
import sendEmailBatch from '../actions/send-email-batch.js';
import getEmailMetrics from '../actions/get-email-metrics.js';
import listReceivedEmails from '../actions/list-received-emails.js';
import getReceivedEmail from '../actions/get-received-email.js';
import listReceivedEmailAttachments from '../actions/list-received-email-attachments.js';
import getReceivedEmailAttachment from '../actions/get-received-email-attachment.js';
import getEmail from '../actions/get-email.js';
import updateEmail from '../actions/update-email.js';
import listEmailAttachments from '../actions/list-email-attachments.js';
import getEmailAttachment from '../actions/get-email-attachment.js';
import cancelEmail from '../actions/cancel-email.js';
import shareEmail from '../actions/share-email.js';
import listSegments from '../actions/list-segments.js';
import createSegment from '../actions/create-segment.js';
import getSegment from '../actions/get-segment.js';
import updateSegment from '../actions/update-segment.js';
import deleteSegment from '../actions/delete-segment.js';
import listTemplates from '../actions/list-templates.js';
import createTemplate from '../actions/create-template.js';
import getTemplate from '../actions/get-template.js';
import updateTemplate from '../actions/update-template.js';
import deleteTemplate from '../actions/delete-template.js';
import duplicateTemplate from '../actions/duplicate-template.js';
import publishTemplate from '../actions/publish-template.js';
import listTopics from '../actions/list-topics.js';
import createTopic from '../actions/create-topic.js';
import getTopic from '../actions/get-topic.js';
import updateTopic from '../actions/update-topic.js';
import deleteTopic from '../actions/delete-topic.js';
import listWebhooks from '../actions/list-webhooks.js';
import createWebhook from '../actions/create-webhook.js';
import getWebhook from '../actions/get-webhook.js';
import updateWebhook from '../actions/update-webhook.js';
import deleteWebhook from '../actions/delete-webhook.js';
import listWebhookEvents from '../actions/list-webhook-events.js';
import getWebhookEvent from '../actions/get-webhook-event.js';
import listWebhookEventAttempts from '../actions/list-webhook-event-attempts.js';
import replayWebhookEvent from '../actions/replay-webhook-event.js';

// Fixtures are OpenAPI examples or synthetic contract samples, never live recordings.
const cases = [
    { name: 'list-audiences', method: 'get', path: '/audiences', hasBody: false, action: listAudiences },
    { name: 'create-audience', method: 'post', path: '/audiences', hasBody: true, action: createAudience },
    { name: 'get-audience', method: 'get', path: '/audiences/{id}', hasBody: false, action: getAudience },
    { name: 'delete-audience', method: 'delete', path: '/audiences/{id}', hasBody: false, action: deleteAudience },
    { name: 'list-broadcasts', method: 'get', path: '/broadcasts', hasBody: false, action: listBroadcasts },
    { name: 'create-broadcast', method: 'post', path: '/broadcasts', hasBody: true, action: createBroadcast },
    { name: 'get-broadcast', method: 'get', path: '/broadcasts/{id}', hasBody: false, action: getBroadcast },
    { name: 'update-broadcast', method: 'patch', path: '/broadcasts/{id}', hasBody: true, action: updateBroadcast },
    { name: 'delete-broadcast', method: 'delete', path: '/broadcasts/{id}', hasBody: false, action: deleteBroadcast },
    { name: 'cancel-broadcast', method: 'post', path: '/broadcasts/{id}/cancel', hasBody: false, action: cancelBroadcast },
    { name: 'list-broadcast-clicked-links', method: 'get', path: '/broadcasts/{id}/clicked-links', hasBody: false, action: listBroadcastClickedLinks },
    { name: 'list-broadcast-recipients', method: 'get', path: '/broadcasts/{id}/recipients', hasBody: false, action: listBroadcastRecipients },
    { name: 'send-broadcast', method: 'post', path: '/broadcasts/{id}/send', hasBody: true, action: sendBroadcast },
    { name: 'list-contact-properties', method: 'get', path: '/contact-properties', hasBody: false, action: listContactProperties },
    { name: 'create-contact-property', method: 'post', path: '/contact-properties', hasBody: true, action: createContactProperty },
    { name: 'get-contact-property', method: 'get', path: '/contact-properties/{id}', hasBody: false, action: getContactProperty },
    { name: 'update-contact-property', method: 'patch', path: '/contact-properties/{id}', hasBody: true, action: updateContactProperty },
    { name: 'delete-contact-property', method: 'delete', path: '/contact-properties/{id}', hasBody: false, action: deleteContactProperty },
    { name: 'list-contacts', method: 'get', path: '/contacts', hasBody: false, action: listContacts },
    { name: 'create-contact', method: 'post', path: '/contacts', hasBody: true, action: createContact },
    { name: 'list-contact-imports', method: 'get', path: '/contacts/imports', hasBody: false, action: listContactImports },
    { name: 'create-contact-import', method: 'post', path: '/contacts/imports', hasBody: false, action: createContactImport },
    { name: 'get-contact-import', method: 'get', path: '/contacts/imports/{id}', hasBody: false, action: getContactImport },
    { name: 'list-contact-segments', method: 'get', path: '/contacts/{contact_id}/segments', hasBody: false, action: listContactSegments },
    { name: 'add-contact-to-segment', method: 'post', path: '/contacts/{contact_id}/segments/{segment_id}', hasBody: false, action: addContactToSegment },
    {
        name: 'remove-contact-from-segment',
        method: 'delete',
        path: '/contacts/{contact_id}/segments/{segment_id}',
        hasBody: false,
        action: removeContactFromSegment
    },
    { name: 'list-contact-topics', method: 'get', path: '/contacts/{contact_id}/topics', hasBody: false, action: listContactTopics },
    { name: 'update-contact-topics', method: 'patch', path: '/contacts/{contact_id}/topics', hasBody: true, action: updateContactTopics },
    { name: 'get-contact', method: 'get', path: '/contacts/{id}', hasBody: false, action: getContact },
    { name: 'update-contact', method: 'patch', path: '/contacts/{id}', hasBody: true, action: updateContact },
    { name: 'delete-contact', method: 'delete', path: '/contacts/{id}', hasBody: false, action: deleteContact },
    { name: 'list-domains', method: 'get', path: '/domains', hasBody: false, action: listDomains },
    { name: 'create-domain', method: 'post', path: '/domains', hasBody: true, action: createDomain },
    { name: 'create-domain-claim', method: 'post', path: '/domains/claim', hasBody: true, action: createDomainClaim },
    { name: 'get-domain', method: 'get', path: '/domains/{domain_id}', hasBody: false, action: getDomain },
    { name: 'update-domain', method: 'patch', path: '/domains/{domain_id}', hasBody: true, action: updateDomain },
    { name: 'delete-domain', method: 'delete', path: '/domains/{domain_id}', hasBody: false, action: deleteDomain },
    { name: 'get-domain-claim', method: 'get', path: '/domains/{domain_id}/claim', hasBody: false, action: getDomainClaim },
    { name: 'verify-domain-claim', method: 'post', path: '/domains/{domain_id}/claim/verify', hasBody: false, action: verifyDomainClaim },
    { name: 'verify-domain', method: 'post', path: '/domains/{domain_id}/verify', hasBody: false, action: verifyDomain },
    { name: 'list-emails', method: 'get', path: '/emails', hasBody: false, action: listEmails },
    { name: 'send-email', method: 'post', path: '/emails', hasBody: true, action: sendEmail },
    { name: 'send-email-batch', method: 'post', path: '/emails/batch', hasBody: true, action: sendEmailBatch },
    { name: 'get-email-metrics', method: 'get', path: '/emails/metrics', hasBody: false, action: getEmailMetrics },
    { name: 'list-received-emails', method: 'get', path: '/emails/receiving', hasBody: false, action: listReceivedEmails },
    { name: 'get-received-email', method: 'get', path: '/emails/receiving/{email_id}', hasBody: false, action: getReceivedEmail },
    {
        name: 'list-received-email-attachments',
        method: 'get',
        path: '/emails/receiving/{email_id}/attachments',
        hasBody: false,
        action: listReceivedEmailAttachments
    },
    {
        name: 'get-received-email-attachment',
        method: 'get',
        path: '/emails/receiving/{email_id}/attachments/{attachment_id}',
        hasBody: false,
        action: getReceivedEmailAttachment
    },
    { name: 'get-email', method: 'get', path: '/emails/{email_id}', hasBody: false, action: getEmail },
    { name: 'update-email', method: 'patch', path: '/emails/{email_id}', hasBody: true, action: updateEmail },
    { name: 'list-email-attachments', method: 'get', path: '/emails/{email_id}/attachments', hasBody: false, action: listEmailAttachments },
    { name: 'get-email-attachment', method: 'get', path: '/emails/{email_id}/attachments/{attachment_id}', hasBody: false, action: getEmailAttachment },
    { name: 'cancel-email', method: 'post', path: '/emails/{email_id}/cancel', hasBody: false, action: cancelEmail },
    { name: 'share-email', method: 'post', path: '/emails/{email_id}/share', hasBody: true, action: shareEmail },
    { name: 'list-segments', method: 'get', path: '/segments', hasBody: false, action: listSegments },
    { name: 'create-segment', method: 'post', path: '/segments', hasBody: true, action: createSegment },
    { name: 'get-segment', method: 'get', path: '/segments/{id}', hasBody: false, action: getSegment },
    { name: 'update-segment', method: 'patch', path: '/segments/{id}', hasBody: true, action: updateSegment },
    { name: 'delete-segment', method: 'delete', path: '/segments/{id}', hasBody: false, action: deleteSegment },
    { name: 'list-templates', method: 'get', path: '/templates', hasBody: false, action: listTemplates },
    { name: 'create-template', method: 'post', path: '/templates', hasBody: true, action: createTemplate },
    { name: 'get-template', method: 'get', path: '/templates/{id}', hasBody: false, action: getTemplate },
    { name: 'update-template', method: 'patch', path: '/templates/{id}', hasBody: true, action: updateTemplate },
    { name: 'delete-template', method: 'delete', path: '/templates/{id}', hasBody: false, action: deleteTemplate },
    { name: 'duplicate-template', method: 'post', path: '/templates/{id}/duplicate', hasBody: false, action: duplicateTemplate },
    { name: 'publish-template', method: 'post', path: '/templates/{id}/publish', hasBody: false, action: publishTemplate },
    { name: 'list-topics', method: 'get', path: '/topics', hasBody: false, action: listTopics },
    { name: 'create-topic', method: 'post', path: '/topics', hasBody: true, action: createTopic },
    { name: 'get-topic', method: 'get', path: '/topics/{id}', hasBody: false, action: getTopic },
    { name: 'update-topic', method: 'patch', path: '/topics/{id}', hasBody: true, action: updateTopic },
    { name: 'delete-topic', method: 'delete', path: '/topics/{id}', hasBody: false, action: deleteTopic },
    { name: 'list-webhooks', method: 'get', path: '/webhooks', hasBody: false, action: listWebhooks },
    { name: 'create-webhook', method: 'post', path: '/webhooks', hasBody: true, action: createWebhook },
    { name: 'get-webhook', method: 'get', path: '/webhooks/{webhook_id}', hasBody: false, action: getWebhook },
    { name: 'update-webhook', method: 'patch', path: '/webhooks/{webhook_id}', hasBody: true, action: updateWebhook },
    { name: 'delete-webhook', method: 'delete', path: '/webhooks/{webhook_id}', hasBody: false, action: deleteWebhook },
    { name: 'list-webhook-events', method: 'get', path: '/webhooks/{webhook_id}/events', hasBody: false, action: listWebhookEvents },
    { name: 'get-webhook-event', method: 'get', path: '/webhooks/{webhook_id}/events/{event_id}', hasBody: false, action: getWebhookEvent },
    {
        name: 'list-webhook-event-attempts',
        method: 'get',
        path: '/webhooks/{webhook_id}/events/{event_id}/attempts',
        hasBody: false,
        action: listWebhookEventAttempts
    },
    { name: 'replay-webhook-event', method: 'post', path: '/webhooks/{webhook_id}/events/{event_id}/replay', hasBody: false, action: replayWebhookEvent }
];

for (const spec of cases) {
    describe(spec.name, () => {
        async function setup() {
            const fixture = JSON.parse(readFileSync(new URL(`./${spec.name}.fixture.json`, import.meta.url), 'utf8'));
            const nango = new NangoActionMock({ dirname: __dirname, name: spec.name, Model: 'Output' });
            nango[spec.method].mockResolvedValue({ data: fixture.response });
            return { action: spec.action, fixture, nango };
        }

        it('validates the contract and forwards the request through the provider proxy', async () => {
            const { action, fixture, nango } = await setup();
            const input = action.input.parse(fixture.input);
            const output = await action.exec(nango, input);
            expect(action.output.safeParse(output).success).toBe(true);
            expect(output).toMatchObject(fixture.response);
            const endpoint = spec.path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(fixture.input[key]));
            expect(nango[spec.method]).toHaveBeenCalledOnce();
            expect(nango[spec.method]).toHaveBeenCalledWith(expect.objectContaining({ endpoint }));
            const config = nango[spec.method].mock.calls[0]?.[0];
            expect(Number.isInteger(config?.retries)).toBe(true);
            expect(config?.retries).toBeGreaterThanOrEqual(0);
            if (spec.hasBody) expect(nango[spec.method]).toHaveBeenCalledWith(expect.objectContaining({ data: input.body }));
        });

        it('propagates provider failures', async () => {
            const { action, fixture, nango } = await setup();
            nango[spec.method].mockRejectedValue(new Error('Provider unavailable'));
            await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow('Provider unavailable');
        });

        it('rejects a malformed provider envelope', async () => {
            const { action, fixture, nango } = await setup();
            nango[spec.method].mockResolvedValue({ data: null });
            await expect(action.exec(nango, action.input.parse(fixture.input))).rejects.toThrow();
        });
    });
}
