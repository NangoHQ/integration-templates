// -- Integration: adp
import './adp/syncs/unified-employees.js';

// -- Integration: aircall
import './aircall/syncs/users.js';
import './aircall/actions/create-user.js';
import './aircall/actions/delete-user.js';

// -- Integration: airtable
import './airtable/syncs/bases.js';
import './airtable/syncs/tables.js';
import './airtable/actions/create-webhook.js';
import './airtable/actions/delete-webhook.js';
import './airtable/actions/list-webhooks.js';
import './airtable/actions/whoami.js';

// -- Integration: algolia
import './algolia/actions/create-contacts.js';

// -- Integration: anrok
import './anrok/actions/create-ephemeral-transaction.js';
import './anrok/actions/create-or-update-transaction.js';
import './anrok/actions/negate-transaction.js';
import './anrok/actions/void-transaction.js';

// -- Integration: asana
import './asana/syncs/projects.js';
import './asana/syncs/tasks.js';
import './asana/syncs/users.js';
import './asana/syncs/workspaces.js';
import './asana/actions/create-task.js';
import './asana/actions/delete-task.js';
import './asana/actions/fetch-projects.js';
import './asana/actions/fetch-workspaces.js';
import './asana/actions/update-task.js';

// -- Integration: ashby
import './ashby/syncs/candidates.js';
import './ashby/syncs/jobs.js';
import './ashby/actions/application-change-source.js';
import './ashby/actions/application-change-stage.js';
import './ashby/actions/application-update.js';
import './ashby/actions/application-update-history.js';
import './ashby/actions/create-application.js';
import './ashby/actions/create-candidate.js';
import './ashby/actions/create-note.js';
import './ashby/actions/interview-stage.js';

// -- Integration: attio
import './attio/syncs/companies.js';
import './attio/syncs/deals.js';
import './attio/syncs/people.js';
import './attio/actions/create-company.js';
import './attio/actions/create-list-entry.js';
import './attio/actions/create-note.js';
import './attio/actions/create-person.js';
import './attio/actions/create-record.js';
import './attio/actions/create-task.js';
import './attio/actions/create-webhook.js';
import './attio/actions/delete-list-entry.js';
import './attio/actions/delete-note.js';
import './attio/actions/delete-record.js';
import './attio/actions/delete-webhook.js';
import './attio/actions/get-object.js';
import './attio/actions/get-record.js';
import './attio/actions/get-webhook.js';
import './attio/actions/list-lists.js';
import './attio/actions/list-notes.js';
import './attio/actions/list-objects.js';
import './attio/actions/list-records.js';
import './attio/actions/list-tasks.js';
import './attio/actions/list-webhooks.js';
import './attio/actions/update-record.js';
import './attio/actions/update-webhook.js';

// -- Integration: avalara
import './avalara/syncs/transactions.js';
import './avalara/actions/commit-transaction.js';
import './avalara/actions/create-transaction.js';
import './avalara/actions/void-transaction.js';

// -- Integration: aws-iam
import './aws-iam/syncs/users.js';
import './aws-iam/actions/create-user.js';
import './aws-iam/actions/delete-user.js';

// -- Integration: bamboohr-basic
import './bamboohr-basic/syncs/employees.js';
import './bamboohr-basic/syncs/unified-employees.js';
import './bamboohr-basic/actions/create-employee.js';
import './bamboohr-basic/actions/fetch-fields.js';
import './bamboohr-basic/actions/update-employee.js';

// -- Integration: basecamp
import './basecamp/syncs/todos.js';
import './basecamp/actions/create-todo.js';
import './basecamp/actions/fetch-accounts.js';
import './basecamp/actions/fetch-projects.js';
import './basecamp/actions/fetch-todolists.js';

// -- Integration: bill
import './bill/syncs/users.js';
import './bill/actions/create-user.js';
import './bill/actions/disable-user.js';

// -- Integration: bitdefender
import './bitdefender/actions/get-company-details.js';

// -- Integration: box
import './box/syncs/files.js';
import './box/syncs/folders.js';
import './box/syncs/users.js';
import './box/actions/create-user.js';
import './box/actions/delete-user.js';
import './box/actions/folder-content.js';

// -- Integration: brightcrowd
import './brightcrowd/syncs/book-analytics.js';
import './brightcrowd/syncs/books.js';
import './brightcrowd/syncs/books-by-id.js';
import './brightcrowd/syncs/pages.js';

// -- Integration: cal-com-v2
import './cal-com-v2/syncs/event-types.js';
import './cal-com-v2/syncs/events.js';

// -- Integration: calendly
import './calendly/syncs/event-invitees.js';
import './calendly/syncs/event-types.js';
import './calendly/syncs/events.js';
import './calendly/syncs/users.js';
import './calendly/actions/create-user.js';
import './calendly/actions/delete-user.js';
import './calendly/actions/whoami.js';

// -- Integration: checkr-partner
import './checkr-partner/syncs/background-checks.js';
import './checkr-partner/actions/background-check-parameters.js';
import './checkr-partner/actions/background-check-services.js';
import './checkr-partner/actions/create-candidate.js';
import './checkr-partner/actions/trigger-background-check.js';

// -- Integration: checkr-partner-staging
import './checkr-partner-staging/syncs/account.js';

// -- Integration: clari-copilot
import './clari-copilot/syncs/calls.js';

// -- Integration: clicksend
import './clicksend/syncs/sms-history.js';
import './clicksend/actions/fetch-account.js';
import './clicksend/actions/send-sms.js';

// -- Integration: confluence
import './confluence/syncs/pages.js';
import './confluence/syncs/spaces.js';

// -- Integration: databricks-workspace
import './databricks-workspace/actions/list-warehouses.js';

// -- Integration: datadog
import './datadog/syncs/users.js';
import './datadog/actions/create-user.js';
import './datadog/actions/disable-user.js';

// -- Integration: dialpad
import './dialpad/syncs/users.js';
import './dialpad/actions/create-user.js';
import './dialpad/actions/delete-user.js';

// -- Integration: discourse
import './discourse/syncs/active-users.js';
import './discourse/syncs/categories.js';
import './discourse/actions/create-category.js';
import './discourse/actions/create-topic.js';
import './discourse/actions/update-topic-status.js';

// -- Integration: docusign
import './docusign/syncs/users.js';
import './docusign/actions/create-user.js';
import './docusign/actions/delete-user.js';

// -- Integration: dropbox
import './dropbox/syncs/files.js';
import './dropbox/syncs/users.js';
import './dropbox/actions/create-user.js';
import './dropbox/actions/delete-user.js';
import './dropbox/actions/folder-content.js';

// -- Integration: evaluagent
import './evaluagent/syncs/groups.js';
import './evaluagent/syncs/roles.js';
import './evaluagent/syncs/users.js';

// -- Integration: exact-online
import './exact-online/syncs/customers.js';
import './exact-online/syncs/payments.js';
import './exact-online/actions/attach-file-invoice.js';
import './exact-online/actions/create-customer.js';
import './exact-online/actions/create-invoice.js';
import './exact-online/actions/update-customer.js';
import './exact-online/actions/update-invoice.js';

// -- Integration: expensify
import './expensify/syncs/users.js';
import './expensify/actions/create-user.js';
import './expensify/actions/disable-user.js';
import './expensify/actions/list-policies.js';

// -- Integration: fireflies
import './fireflies/actions/add-to-live.js';

// -- Integration: freshdesk
import './freshdesk/syncs/articles.js';
import './freshdesk/syncs/contacts.js';
import './freshdesk/syncs/tickets.js';
import './freshdesk/syncs/users.js';
import './freshdesk/actions/create-contact.js';
import './freshdesk/actions/create-user.js';
import './freshdesk/actions/delete-contact.js';
import './freshdesk/actions/delete-user.js';

// -- Integration: front
import './front/syncs/conversations.js';
import './front/actions/conversation.js';

// -- Integration: gem
import './gem/syncs/applications.js';
import './gem/syncs/candidates.js';
import './gem/syncs/job-posts.js';
import './gem/syncs/job-stages.js';
import './gem/syncs/jobs.js';
import './gem/syncs/locations.js';
import './gem/syncs/users.js';
import './gem/actions/create-candidate.js';
import './gem/actions/create-note.js';
import './gem/actions/update-application.js';
import './gem/actions/upload-resume.js';

// -- Integration: github
import './github/syncs/issues.js';
import './github/syncs/issues-lite.js';
import './github/syncs/list-files.js';
import './github/actions/list-repos.js';
import './github/actions/write-file.js';

// -- Integration: github-app
import './github-app/syncs/commits.js';
import './github-app/syncs/pull-requests.js';
import './github-app/actions/repositories.js';

// -- Integration: gong
import './gong/syncs/call-transcripts.js';
import './gong/syncs/calls.js';
import './gong/syncs/users.js';
import './gong/actions/fetch-call-transcripts.js';

// -- Integration: google
import './google/syncs/workspace-org-units.js';
import './google/syncs/workspace-user-access-tokens.js';
import './google/syncs/workspace-users.js';

// -- Integration: google-calendar
import './google-calendar/syncs/calendars.js';
import './google-calendar/syncs/events.js';
import './google-calendar/actions/settings.js';
import './google-calendar/actions/whoami.js';

// -- Integration: google-drive
import './google-drive/syncs/documents.js';
import './google-drive/syncs/folders.js';
import './google-drive/actions/folder-content.js';
import './google-drive/actions/list-drives.js';
import './google-drive/actions/upload-document.js';

// -- Integration: google-mail
import './google-mail/syncs/emails.js';
import './google-mail/syncs/labels.js';
import './google-mail/actions/fetch-attachment.js';
import './google-mail/actions/send-email.js';

// -- Integration: gorgias
import './gorgias/syncs/tickets.js';
import './gorgias/syncs/users.js';
import './gorgias/actions/create-ticket.js';
import './gorgias/actions/create-user.js';
import './gorgias/actions/delete-user.js';

// -- Integration: grammarly
import './grammarly/syncs/users.js';
import './grammarly/actions/delete-user.js';

// -- Integration: greenhouse-basic
import './greenhouse-basic/syncs/applications.js';
import './greenhouse-basic/syncs/candidates.js';
import './greenhouse-basic/syncs/jobs.js';

// -- Integration: gusto
import './gusto/syncs/employees.js';
import './gusto/syncs/unified-employees.js';
import './gusto/actions/create-employee.js';
import './gusto/actions/terminate-employee.js';
import './gusto/actions/update-employee.js';

// -- Integration: hackerrank-work
import './hackerrank-work/syncs/interviews.js';
import './hackerrank-work/syncs/teams.js';
import './hackerrank-work/syncs/tests.js';
import './hackerrank-work/syncs/users.js';
import './hackerrank-work/actions/create-interview.js';
import './hackerrank-work/actions/create-test.js';

// -- Integration: harvest
import './harvest/syncs/users.js';
import './harvest/actions/create-user.js';
import './harvest/actions/delete-user.js';

// -- Integration: hibob-service-user
import './hibob-service-user/syncs/employees.js';
import './hibob-service-user/syncs/unified-employees.js';

// -- Integration: hubspot
import './hubspot/syncs/companies.js';
import './hubspot/syncs/contacts.js';
import './hubspot/syncs/currency-codes.js';
import './hubspot/syncs/deals.js';
import './hubspot/syncs/knowledge-base.js';
import './hubspot/syncs/owners.js';
import './hubspot/syncs/products.js';
import './hubspot/syncs/service-tickets.js';
import './hubspot/syncs/tasks.js';
import './hubspot/syncs/users.js';
import './hubspot/actions/change-user-role.js';
import './hubspot/actions/create-company.js';
import './hubspot/actions/create-contact.js';
import './hubspot/actions/create-deal.js';
import './hubspot/actions/create-note.js';
import './hubspot/actions/create-property.js';
import './hubspot/actions/create-task.js';
import './hubspot/actions/create-user.js';
import './hubspot/actions/delete-company.js';
import './hubspot/actions/delete-contact.js';
import './hubspot/actions/delete-deal.js';
import './hubspot/actions/delete-task.js';
import './hubspot/actions/delete-user.js';
import './hubspot/actions/fetch-account-information.js';
import './hubspot/actions/fetch-custom-objects.js';
import './hubspot/actions/fetch-pipelines.js';
import './hubspot/actions/fetch-properties.js';
import './hubspot/actions/fetch-roles.js';
import './hubspot/actions/update-company.js';
import './hubspot/actions/update-contact.js';
import './hubspot/actions/update-deal.js';
import './hubspot/actions/update-task.js';
import './hubspot/actions/whoami.js';

// -- Integration: instantly
import './instantly/actions/set-campaign-name.js';

// -- Integration: intercom
import './intercom/syncs/articles.js';
import './intercom/syncs/contacts.js';
import './intercom/syncs/conversations.js';
import './intercom/syncs/users.js';
import './intercom/actions/create-contact.js';
import './intercom/actions/delete-contact.js';
import './intercom/actions/fetch-article.js';
import './intercom/actions/whoami.js';

// -- Integration: jira
import './jira/syncs/issue-types.js';
import './jira/syncs/issues.js';
import './jira/syncs/projects.js';
import './jira/actions/create-issue.js';

// -- Integration: jira-basic
import './jira-basic/syncs/users.js';
import './jira-basic/actions/create-user.js';
import './jira-basic/actions/delete-user.js';
import './jira-basic/actions/fetch-teams.js';

// -- Integration: keeper-scim
import './keeper-scim/syncs/users.js';
import './keeper-scim/actions/create-user.js';
import './keeper-scim/actions/delete-user.js';

// -- Integration: kustomer
import './kustomer/syncs/conversations.js';

// -- Integration: lastpass
import './lastpass/syncs/users.js';
import './lastpass/actions/create-user.js';
import './lastpass/actions/delete-user.js';

// -- Integration: lattice
import './lattice/syncs/users.js';

// -- Integration: lattice-scim
import './lattice-scim/actions/create-user.js';
import './lattice-scim/actions/disable-user.js';

// -- Integration: lever
import './lever/syncs/opportunities.js';
import './lever/syncs/opportunities-applications.js';
import './lever/syncs/opportunities-feedbacks.js';
import './lever/syncs/opportunities-interviews.js';
import './lever/syncs/opportunities-notes.js';
import './lever/syncs/opportunities-offers.js';
import './lever/syncs/postings.js';
import './lever/syncs/postings-questions.js';
import './lever/syncs/stages.js';
import './lever/actions/apply-posting.js';
import './lever/actions/create-note.js';
import './lever/actions/create-opportunity.js';
import './lever/actions/get-archive-reasons.js';
import './lever/actions/get-posting.js';
import './lever/actions/get-postings.js';
import './lever/actions/get-stages.js';
import './lever/actions/update-opportunity.js';
import './lever/actions/update-opportunity-archived.js';
import './lever/actions/update-opportunity-links.js';
import './lever/actions/update-opportunity-sources.js';
import './lever/actions/update-opportunity-stage.js';
import './lever/actions/update-opportunity-tags.js';
import './lever/actions/users.js';

// -- Integration: linear
import './linear/syncs/issues.js';
import './linear/syncs/milestones.js';
import './linear/syncs/projects.js';
import './linear/syncs/roadmaps.js';
import './linear/syncs/teams.js';
import './linear/syncs/users.js';
import './linear/actions/create-issue.js';
import './linear/actions/fetch-fields.js';
import './linear/actions/fetch-models.js';
import './linear/actions/fetch-teams.js';

// -- Integration: linkedin
import './linkedin/syncs/messages.js';
import './linkedin/actions/post.js';

// -- Integration: luma
import './luma/syncs/list-events.js';

// -- Integration: metabase
import './metabase/syncs/users.js';
import './metabase/actions/create-user.js';
import './metabase/actions/disable-user.js';
import './metabase/actions/enable-user.js';
import './metabase/actions/fetch-user.js';
import './metabase/actions/update-user.js';

// -- Integration: microsoft-teams
import './microsoft-teams/syncs/messages.js';
import './microsoft-teams/syncs/org-units.js';
import './microsoft-teams/syncs/users.js';

// -- Integration: namely-pat
import './namely-pat/syncs/unified-employees.js';

// -- Integration: netsuite-tba
import './netsuite-tba/syncs/credit-notes.js';
import './netsuite-tba/syncs/customers.js';
import './netsuite-tba/syncs/general-ledger.js';
import './netsuite-tba/syncs/invoices.js';
import './netsuite-tba/syncs/locations.js';
import './netsuite-tba/syncs/payments.js';
import './netsuite-tba/actions/bill-create.js';
import './netsuite-tba/actions/bill-update.js';
import './netsuite-tba/actions/credit-note-create.js';
import './netsuite-tba/actions/credit-note-update.js';
import './netsuite-tba/actions/customer-create.js';
import './netsuite-tba/actions/customer-update.js';
import './netsuite-tba/actions/fetch-fields.js';
import './netsuite-tba/actions/invoice-create.js';
import './netsuite-tba/actions/invoice-update.js';
import './netsuite-tba/actions/payment-create.js';
import './netsuite-tba/actions/payment-update.js';
import './netsuite-tba/actions/purchase-order-create.js';
import './netsuite-tba/actions/purchase-order-update.js';

// -- Integration: next-cloud-ocs
import './next-cloud-ocs/syncs/users.js';

// -- Integration: notion
import './notion/syncs/content-metadata.js';
import './notion/syncs/databases.js';
import './notion/syncs/users.js';
import './notion/actions/create-database-row.js';
import './notion/actions/fetch-content-metadata.js';

// -- Integration: okta
import './okta/syncs/users.js';
import './okta/actions/add-group.js';
import './okta/actions/add-user-group.js';
import './okta/actions/create-user.js';
import './okta/actions/remove-user-group.js';

// -- Integration: one-drive
import './one-drive/syncs/user-files.js';
import './one-drive/syncs/user-files-selection.js';
import './one-drive/actions/fetch-file.js';
import './one-drive/actions/list-drives.js';

// -- Integration: one-drive-personal
import './one-drive-personal/syncs/user-files-selection.js';

// -- Integration: oracle-hcm
import './oracle-hcm/syncs/employees.js';
import './oracle-hcm/syncs/unified-employees.js';

// -- Integration: outlook
import './outlook/syncs/calendars.js';
import './outlook/syncs/emails.js';
import './outlook/syncs/events.js';
import './outlook/syncs/folders.js';
import './outlook/actions/fetch-attachment.js';
import './outlook/actions/fetch-event-content.js';

// -- Integration: paycom
import './paycom/syncs/unified-employees.js';

// -- Integration: paylocity
import './paylocity/syncs/users.js';

// -- Integration: pennylane
import './pennylane/syncs/customers.js';
import './pennylane/syncs/invoices.js';
import './pennylane/syncs/products.js';
import './pennylane/syncs/suppliers.js';
import './pennylane/actions/create-customer.js';
import './pennylane/actions/create-invoice.js';
import './pennylane/actions/create-product.js';
import './pennylane/actions/create-supplier.js';
import './pennylane/actions/update-customer.js';
import './pennylane/actions/update-invoice.js';
import './pennylane/actions/update-product.js';
import './pennylane/actions/update-supplier.js';

// -- Integration: perimeter81
import './perimeter81/syncs/users.js';
import './perimeter81/actions/create-user.js';
import './perimeter81/actions/delete-user.js';

// -- Integration: pipedrive
import './pipedrive/syncs/activities.js';
import './pipedrive/syncs/deals.js';
import './pipedrive/syncs/organizations.js';
import './pipedrive/syncs/persons.js';

// -- Integration: quickbooks
import './quickbooks/syncs/accounts.js';
import './quickbooks/syncs/bill-payments.js';
import './quickbooks/syncs/bills.js';
import './quickbooks/syncs/credit-memos.js';
import './quickbooks/syncs/customers.js';
import './quickbooks/syncs/deposits.js';
import './quickbooks/syncs/invoices.js';
import './quickbooks/syncs/items.js';
import './quickbooks/syncs/journal-entries.js';
import './quickbooks/syncs/payments.js';
import './quickbooks/syncs/purchases.js';
import './quickbooks/syncs/transfers.js';
import './quickbooks/actions/create-account.js';
import './quickbooks/actions/create-bill.js';
import './quickbooks/actions/create-credit-memo.js';
import './quickbooks/actions/create-customer.js';
import './quickbooks/actions/create-invoice.js';
import './quickbooks/actions/create-item.js';
import './quickbooks/actions/create-journal-entry.js';
import './quickbooks/actions/create-payment.js';
import './quickbooks/actions/create-purchase-order.js';
import './quickbooks/actions/update-account.js';
import './quickbooks/actions/update-credit-memo.js';
import './quickbooks/actions/update-customer.js';
import './quickbooks/actions/update-invoice.js';
import './quickbooks/actions/update-item.js';
import './quickbooks/actions/update-journal-entry.js';

// -- Integration: ramp
import './ramp/syncs/users.js';
import './ramp/actions/create-user.js';
import './ramp/actions/disable-user.js';

// -- Integration: recharge
import './recharge/syncs/customers.js';
import './recharge/actions/upsert-customers.js';

// -- Integration: recruiterflow
import './recruiterflow/syncs/candidate-activity-types.js';
import './recruiterflow/syncs/candidates.js';
import './recruiterflow/syncs/employment-types.js';
import './recruiterflow/syncs/job-departments.js';
import './recruiterflow/syncs/job-remote-statuses.js';
import './recruiterflow/syncs/job-stage-names.js';
import './recruiterflow/syncs/job-statuses.js';
import './recruiterflow/syncs/jobs.js';
import './recruiterflow/syncs/locations.js';
import './recruiterflow/syncs/organization-locations.js';
import './recruiterflow/syncs/users.js';
import './recruiterflow/actions/candidate-activities-list.js';
import './recruiterflow/actions/candidate-activities-stage-movements.js';
import './recruiterflow/actions/candidate-scorecards.js';
import './recruiterflow/actions/job-pipelines.js';

// -- Integration: ring-central
import './ring-central/syncs/contacts.js';
import './ring-central/syncs/users.js';
import './ring-central/actions/create-contact.js';
import './ring-central/actions/create-user.js';
import './ring-central/actions/delete-user.js';
import './ring-central/actions/get-company-info.js';

// -- Integration: sage-intacct-oauth
import './sage-intacct-oauth/syncs/accounts.js';

// -- Integration: salesforce
import './salesforce/syncs/accounts.js';
import './salesforce/syncs/articles.js';
import './salesforce/syncs/contacts.js';
import './salesforce/syncs/leads.js';
import './salesforce/syncs/opportunities.js';
import './salesforce/syncs/tickets.js';
import './salesforce/actions/create-account.js';
import './salesforce/actions/create-contact.js';
import './salesforce/actions/create-lead.js';
import './salesforce/actions/create-opportunity.js';
import './salesforce/actions/delete-account.js';
import './salesforce/actions/delete-contact.js';
import './salesforce/actions/delete-lead.js';
import './salesforce/actions/delete-opportunity.js';
import './salesforce/actions/fetch-fields.js';
import './salesforce/actions/update-account.js';
import './salesforce/actions/update-contact.js';
import './salesforce/actions/update-lead.js';
import './salesforce/actions/update-opportunity.js';
import './salesforce/actions/whoami.js';

// -- Integration: sap-success-factors
import './sap-success-factors/syncs/employees.js';
import './sap-success-factors/syncs/groups.js';
import './sap-success-factors/syncs/locations.js';
import './sap-success-factors/syncs/unified-employees.js';

// -- Integration: sharepoint-online
import './sharepoint-online/syncs/shared-sites-selection.js';
import './sharepoint-online/syncs/user-files.js';
import './sharepoint-online/syncs/user-files-selection.js';
import './sharepoint-online/actions/fetch-file.js';
import './sharepoint-online/actions/list-shared-sites.js';

// -- Integration: shopify
import './shopify/syncs/orders.js';

// -- Integration: slack
import './slack/syncs/channels.js';
import './slack/syncs/messages.js';
import './slack/syncs/users.js';
import './slack/actions/add-reaction.js';
import './slack/actions/archive-channel.js';
import './slack/actions/create-channel.js';
import './slack/actions/delete-message.js';
import './slack/actions/get-channel-info.js';
import './slack/actions/get-channel-members.js';
import './slack/actions/get-conversation-history.js';
import './slack/actions/get-dnd-info.js';
import './slack/actions/get-file-info.js';
import './slack/actions/get-reactions.js';
import './slack/actions/get-team-info.js';
import './slack/actions/get-thread-replies.js';
import './slack/actions/get-upload-url.js';
import './slack/actions/get-user-info.js';
import './slack/actions/get-user-presence.js';
import './slack/actions/get-user-profile.js';
import './slack/actions/invite-to-channel.js';
import './slack/actions/join-channel.js';
import './slack/actions/leave-channel.js';
import './slack/actions/list-channels.js';
import './slack/actions/list-custom-emoji.js';
import './slack/actions/list-files.js';
import './slack/actions/list-pins.js';
import './slack/actions/list-scheduled-messages.js';
import './slack/actions/list-user-group-members.js';
import './slack/actions/list-user-groups.js';
import './slack/actions/list-user-reactions.js';
import './slack/actions/list-users.js';
import './slack/actions/lookup-user-by-email.js';
import './slack/actions/mark-as-read.js';
import './slack/actions/open-dm.js';
import './slack/actions/pin-message.js';
import './slack/actions/post-message.js';
import './slack/actions/remove-from-channel.js';
import './slack/actions/remove-reaction.js';
import './slack/actions/rename-channel.js';
import './slack/actions/schedule-message.js';
import './slack/actions/search-files.js';
import './slack/actions/search-messages.js';
import './slack/actions/send-message.js';
import './slack/actions/set-channel-purpose.js';
import './slack/actions/set-channel-topic.js';
import './slack/actions/set-user-presence.js';
import './slack/actions/unarchive-channel.js';
import './slack/actions/unpin-message.js';
import './slack/actions/update-message.js';

// -- Integration: smartsheet
import './smartsheet/syncs/users.js';
import './smartsheet/actions/create-user.js';
import './smartsheet/actions/delete-user.js';
import './smartsheet/actions/disable-user.js';

// -- Integration: stripe-app
import './stripe-app/syncs/subscriptions.js';

// -- Integration: teamtailor
import './teamtailor/syncs/candidates.js';

// -- Integration: ukg-pro
import './ukg-pro/syncs/unified-employees.js';

// -- Integration: ukg-ready
import './ukg-ready/syncs/unified-employees.js';

// -- Integration: unanet
import './unanet/actions/create-company.js';
import './unanet/actions/create-contact.js';
import './unanet/actions/create-lead.js';
import './unanet/actions/create-opportunity.js';
import './unanet/actions/get-company.js';
import './unanet/actions/get-leads.js';
import './unanet/actions/get-schema.js';
import './unanet/actions/list-stages.js';
import './unanet/actions/update-lead.js';

// -- Integration: wildix-pbx
import './wildix-pbx/syncs/colleagues.js';

// -- Integration: woocommerce
import './woocommerce/syncs/customers.js';
import './woocommerce/syncs/orders.js';

// -- Integration: workable
import './workable/syncs/candidates.js';
import './workable/syncs/candidates-activities.js';
import './workable/syncs/candidates-offer.js';
import './workable/syncs/jobs.js';
import './workable/syncs/jobs-candidates.js';
import './workable/syncs/jobs-questions.js';
import './workable/syncs/members.js';
import './workable/actions/create-candidate.js';
import './workable/actions/create-comment.js';

// -- Integration: workday
import './workday/syncs/employees.js';
import './workday/syncs/groups.js';
import './workday/syncs/locations.js';
import './workday/syncs/unified-employees.js';

// -- Integration: xero
import './xero/syncs/accounts.js';
import './xero/syncs/bank-transactions.js';
import './xero/syncs/contacts.js';
import './xero/syncs/credit-notes.js';
import './xero/syncs/general-ledger.js';
import './xero/syncs/invoices.js';
import './xero/syncs/items.js';
import './xero/syncs/organisations.js';
import './xero/syncs/payments.js';
import './xero/actions/create-contact.js';
import './xero/actions/create-credit-note.js';
import './xero/actions/create-invoice.js';
import './xero/actions/create-item.js';
import './xero/actions/create-payment.js';
import './xero/actions/get-tenants.js';
import './xero/actions/update-contact.js';
import './xero/actions/update-credit-note.js';
import './xero/actions/update-invoice.js';
import './xero/actions/update-item.js';

// -- Integration: zendesk
import './zendesk/syncs/articles.js';
import './zendesk/syncs/categories.js';
import './zendesk/syncs/sections.js';
import './zendesk/syncs/tickets.js';
import './zendesk/syncs/users.js';
import './zendesk/actions/create-category.js';
import './zendesk/actions/create-section.js';
import './zendesk/actions/create-ticket.js';
import './zendesk/actions/create-user.js';
import './zendesk/actions/delete-user.js';
import './zendesk/actions/fetch-article.js';
import './zendesk/actions/fetch-articles.js';
import './zendesk/actions/search-tickets.js';

// -- Integration: zoho-crm
import './zoho-crm/syncs/accounts.js';
import './zoho-crm/syncs/contacts.js';
import './zoho-crm/syncs/deals.js';

// -- Integration: zoho-mail
import './zoho-mail/syncs/emails.js';
import './zoho-mail/syncs/tasks.js';
import './zoho-mail/actions/add-user.js';
import './zoho-mail/actions/send-email.js';

// -- Integration: zoom
import './zoom/syncs/meetings.js';
import './zoom/syncs/recording-files.js';
import './zoom/syncs/users.js';
import './zoom/actions/create-meeting.js';
import './zoom/actions/create-user.js';
import './zoom/actions/delete-meeting.js';
import './zoom/actions/delete-user.js';
import './zoom/actions/whoami.js';
