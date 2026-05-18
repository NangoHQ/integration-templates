// -- Integration: adp
import './adp/syncs/unified-employees.js';

// -- Integration: aircall
import './aircall/syncs/users.js';
import './aircall/actions/create-user.js';
import './aircall/actions/delete-user.js';

// -- Integration: airtable
import './airtable/syncs/bases.js';
import './airtable/syncs/records.js';
import './airtable/syncs/tables.js';
import './airtable/syncs/views.js';
import './airtable/syncs/webhooks.js';
import './airtable/actions/batch-create-records.js';
import './airtable/actions/batch-delete-records.js';
import './airtable/actions/batch-replace-records.js';
import './airtable/actions/batch-update-records.js';
import './airtable/actions/create-base.js';
import './airtable/actions/create-comment.js';
import './airtable/actions/create-field.js';
import './airtable/actions/create-record.js';
import './airtable/actions/create-table.js';
import './airtable/actions/create-webhook.js';
import './airtable/actions/delete-comment.js';
import './airtable/actions/delete-record.js';
import './airtable/actions/delete-webhook.js';
import './airtable/actions/get-base-collaborators.js';
import './airtable/actions/get-base-schema.js';
import './airtable/actions/get-record.js';
import './airtable/actions/get-user-info.js';
import './airtable/actions/list-bases.js';
import './airtable/actions/list-comments.js';
import './airtable/actions/list-records.js';
import './airtable/actions/list-views.js';
import './airtable/actions/list-webhook-payloads.js';
import './airtable/actions/list-webhooks.js';
import './airtable/actions/refresh-webhook.js';
import './airtable/actions/replace-record.js';
import './airtable/actions/set-webhook-notifications.js';
import './airtable/actions/update-comment.js';
import './airtable/actions/update-field.js';
import './airtable/actions/update-record.js';
import './airtable/actions/update-table.js';
import './airtable/actions/upload-attachment.js';
import './airtable/actions/upsert-records.js';

// -- Integration: algolia
import './algolia/actions/create-contacts.js';

// -- Integration: anrok
import './anrok/actions/create-ephemeral-transaction.js';
import './anrok/actions/create-or-update-transaction.js';
import './anrok/actions/negate-transaction.js';
import './anrok/actions/void-transaction.js';

// -- Integration: asana
import './asana/syncs/projects.js';
import './asana/syncs/sections.js';
import './asana/syncs/subtasks.js';
import './asana/syncs/tags.js';
import './asana/syncs/tasks.js';
import './asana/syncs/teams.js';
import './asana/syncs/users.js';
import './asana/syncs/workspaces.js';
import './asana/actions/add-project-to-task.js';
import './asana/actions/add-tag-to-task.js';
import './asana/actions/create-project.js';
import './asana/actions/create-section.js';
import './asana/actions/create-story-on-task.js';
import './asana/actions/create-subtask.js';
import './asana/actions/create-tag.js';
import './asana/actions/create-task.js';
import './asana/actions/delete-attachment.js';
import './asana/actions/delete-project.js';
import './asana/actions/delete-section.js';
import './asana/actions/delete-story.js';
import './asana/actions/delete-tag.js';
import './asana/actions/delete-task.js';
import './asana/actions/get-project.js';
import './asana/actions/get-section.js';
import './asana/actions/get-tag.js';
import './asana/actions/get-task.js';
import './asana/actions/get-team.js';
import './asana/actions/get-user.js';
import './asana/actions/get-workspace.js';
import './asana/actions/list-attachments-for-object.js';
import './asana/actions/list-projects-for-team.js';
import './asana/actions/list-projects-for-workspace.js';
import './asana/actions/list-sections-for-project.js';
import './asana/actions/list-stories-for-task.js';
import './asana/actions/list-subtasks-for-task.js';
import './asana/actions/list-tags-for-workspace.js';
import './asana/actions/list-tasks-for-project.js';
import './asana/actions/list-tasks-for-section.js';
import './asana/actions/list-teams-for-user.js';
import './asana/actions/list-teams-for-workspace.js';
import './asana/actions/list-users-for-team.js';
import './asana/actions/list-users-for-workspace.js';
import './asana/actions/list-workspaces.js';
import './asana/actions/remove-project-from-task.js';
import './asana/actions/remove-tag-from-task.js';
import './asana/actions/search-tasks-in-workspace.js';
import './asana/actions/update-project.js';
import './asana/actions/update-section.js';
import './asana/actions/update-tag.js';
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
import './box/syncs/collaborations.js';
import './box/syncs/folders.js';
import './box/actions/copy-file.js';
import './box/actions/copy-folder.js';
import './box/actions/create-collaboration.js';
import './box/actions/create-comment.js';
import './box/actions/create-folder.js';
import './box/actions/create-user.js';
import './box/actions/delete-collaboration.js';
import './box/actions/delete-comment.js';
import './box/actions/delete-user.js';
import './box/actions/delete-file.js';
import './box/actions/delete-folder.js';
import './box/actions/download-file.js';
import './box/actions/folder-content.js';
import './box/actions/get-collaboration.js';
import './box/actions/get-comment.js';
import './box/actions/get-file.js';
import './box/actions/get-folder.js';
import './box/actions/get-user.js';
import './box/actions/list-collaborations.js';
import './box/actions/list-comments.js';
import './box/actions/list-files.js';
import './box/actions/list-folders.js';
import './box/actions/search.js';
import './box/actions/update-collaboration.js';
import './box/actions/update-comment.js';
import './box/actions/update-file.js';
import './box/actions/update-folder.js';
import './box/actions/update-user.js';

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
import './calendly/syncs/organization-memberships.js';
import './calendly/syncs/routing-forms.js';
import './calendly/syncs/scheduled-events.js';
import './calendly/syncs/webhook-subscriptions.js';
import './calendly/actions/create-user.js';
import './calendly/actions/create-webhook-subscription.js';
import './calendly/actions/delete-webhook-subscription.js';
import './calendly/actions/get-event-invitee.js';
import './calendly/actions/get-event-type.js';
import './calendly/actions/get-scheduled-event.js';
import './calendly/actions/get-webhook-subscription.js';
import './calendly/actions/list-event-invitees.js';

import './calendly/actions/delete-user.js';
import './calendly/actions/get-current-organization.js';
import './calendly/actions/get-current-user.js';
import './calendly/actions/get-organization-membership.js';
import './calendly/actions/get-routing-form.js';
import './calendly/actions/list-event-types.js';
import './calendly/actions/list-organization-memberships.js';
import './calendly/actions/list-routing-forms.js';
import './calendly/actions/list-scheduled-events.js';
import './calendly/actions/list-webhook-subscriptions.js';

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
import './confluence/syncs/attachments.js';
import './confluence/syncs/blog-posts.js';
import './confluence/syncs/footer-comments.js';
import './confluence/syncs/inline-comments.js';
import './confluence/syncs/pages.js';
import './confluence/syncs/spaces.js';
import './confluence/actions/create-blog-post.js';
import './confluence/actions/create-footer-comment.js';
import './confluence/actions/create-inline-comment.js';
import './confluence/actions/create-page-property.js';
import './confluence/actions/create-page.js';
import './confluence/actions/delete-attachment.js';
import './confluence/actions/delete-blog-post.js';
import './confluence/actions/delete-footer-comment.js';
import './confluence/actions/delete-inline-comment.js';
import './confluence/actions/delete-page-property.js';
import './confluence/actions/delete-page.js';
import './confluence/actions/get-attachment.js';
import './confluence/actions/get-blog-post.js';
import './confluence/actions/get-footer-comment.js';
import './confluence/actions/get-inline-comment.js';
import './confluence/actions/get-page-property.js';
import './confluence/actions/get-page.js';
import './confluence/actions/get-space.js';
import './confluence/actions/list-attachments.js';
import './confluence/actions/list-blog-posts-for-label.js';
import './confluence/actions/list-blog-posts.js';
import './confluence/actions/list-page-attachments.js';
import './confluence/actions/list-page-footer-comments.js';
import './confluence/actions/list-page-inline-comments.js';
import './confluence/actions/list-page-properties.js';
import './confluence/actions/list-pages-for-label.js';
import './confluence/actions/list-pages.js';
import './confluence/actions/list-space-blog-posts.js';
import './confluence/actions/list-space-pages.js';
import './confluence/actions/list-spaces.js';
import './confluence/actions/search-content.js';
import './confluence/actions/update-blog-post.js';
import './confluence/actions/update-footer-comment.js';
import './confluence/actions/update-inline-comment.js';
import './confluence/actions/update-page-property.js';
import './confluence/actions/update-page.js';

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

// -- Integration: discord
import './discord/syncs/channels.js';
import './discord/syncs/guild-members.js';
import './discord/syncs/guilds.js';
import './discord/syncs/messages.js';
import './discord/syncs/roles.js';
import './discord/syncs/webhooks.js';
import './discord/actions/add-guild-member-role.js';
import './discord/actions/create-channel.js';
import './discord/actions/create-message.js';
import './discord/actions/create-reaction.js';
import './discord/actions/create-role.js';
import './discord/actions/create-thread-from-message.js';
import './discord/actions/create-webhook.js';
import './discord/actions/delete-channel.js';
import './discord/actions/delete-guild.js';
import './discord/actions/delete-guild-member.js';
import './discord/actions/delete-message.js';
import './discord/actions/delete-reaction.js';
import './discord/actions/delete-role.js';
import './discord/actions/delete-webhook.js';
import './discord/actions/get-channel.js';
import './discord/actions/get-guild-member.js';
import './discord/actions/get-guild.js';
import './discord/actions/get-message.js';
import './discord/actions/get-role.js';
import './discord/actions/get-webhook.js';
import './discord/actions/list-channels.js';
import './discord/actions/list-guild-members.js';
import './discord/actions/list-guilds.js';
import './discord/actions/list-messages.js';
import './discord/actions/list-roles.js';
import './discord/actions/list-webhooks.js';
import './discord/actions/remove-guild-member-role.js';
import './discord/actions/update-channel.js';
import './discord/actions/update-guild-member.js';
import './discord/actions/update-guild.js';
import './discord/actions/update-message.js';
import './discord/actions/update-role.js';
import './discord/actions/update-webhook.js';

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
import './dropbox/syncs/folders.js';
import './dropbox/syncs/shared-folders.js';
import './dropbox/syncs/shared-links.js';
import './dropbox/actions/batch-copy-files-or-folders.js';
import './dropbox/actions/batch-create-folders.js';
import './dropbox/actions/batch-delete-files-or-folders.js';
import './dropbox/actions/batch-move-files-or-folders.js';
import './dropbox/actions/check-batch-copy-files-or-folders.js';
import './dropbox/actions/check-batch-delete-files-or-folders.js';
import './dropbox/actions/check-batch-move-files-or-folders.js';
import './dropbox/actions/check-unshare-folder.js';
import './dropbox/actions/copy-file-or-folder.js';
import './dropbox/actions/create-folder.js';
import './dropbox/actions/create-shared-link.js';
import './dropbox/actions/create-user.js';
import './dropbox/actions/delete-file-or-folder.js';
import './dropbox/actions/download-file.js';
import './dropbox/actions/download-folder-as-zip.js';
import './dropbox/actions/get-current-account.js';
import './dropbox/actions/get-file-or-folder-metadata.js';
import './dropbox/actions/get-file-temporary-link.js';
import './dropbox/actions/list-file-revisions.js';
import './dropbox/actions/list-folder.js';
import './dropbox/actions/list-shared-folders.js';
import './dropbox/actions/list-shared-links.js';
import './dropbox/actions/modify-shared-link-settings.js';
import './dropbox/actions/move-file-or-folder.js';
import './dropbox/actions/restore-file-revision.js';
import './dropbox/actions/revoke-shared-link.js';
import './dropbox/actions/search-files-and-folders.js';
import './dropbox/actions/share-folder.js';
import './dropbox/actions/unshare-folder.js';
import './dropbox/actions/upload-file.js';
import './dropbox/actions/upload-large-file.js';

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
import './github/syncs/commits.js';
import './github/syncs/issues.js';
import './github/syncs/list-files.js';
import './github/syncs/pull-requests.js';
import './github/syncs/releases.js';
import './github/syncs/repositories.js';
import './github/syncs/repository-files.js';
import './github/syncs/workflow-runs.js';
import './github/actions/add-issue-comment.js';
import './github/actions/create-branch.js';
import './github/actions/create-issue.js';
import './github/actions/create-label.js';
import './github/actions/create-or-update-file.js';
import './github/actions/create-pull-request.js';
import './github/actions/create-release.js';
import './github/actions/create-review-request.js';
import './github/actions/create-tag-object.js';
import './github/actions/delete-file.js';
import './github/actions/delete-label.js';
import './github/actions/delete-release.js';
import './github/actions/get-branch.js';
import './github/actions/get-commit.js';
import './github/actions/get-file-contents.js';
import './github/actions/get-issue.js';
import './github/actions/get-job-logs-download-url.js';
import './github/actions/get-label.js';
import './github/actions/get-pull-request.js';
import './github/actions/get-release.js';
import './github/actions/get-repository.js';
import './github/actions/get-review.js';
import './github/actions/get-tag-ref.js';
import './github/actions/get-workflow-run.js';
import './github/actions/get-workflow.js';
import './github/actions/list-branches.js';
import './github/actions/list-commits.js';
import './github/actions/list-issue-comments.js';
import './github/actions/list-issues.js';
import './github/actions/list-labels.js';
import './github/actions/list-pull-request-files.js';
import './github/actions/list-pull-request-reviews.js';
import './github/actions/list-pull-requests.js';
import './github/actions/list-release-assets.js';
import './github/actions/list-releases.js';
import './github/actions/list-workflow-jobs.js';
import './github/actions/list-workflow-runs.js';
import './github/actions/list-workflows.js';
import './github/actions/merge-pull-request.js';
import './github/actions/rerun-workflow-run.js';
import './github/actions/submit-pull-request-review.js';
import './github/actions/trigger-workflow-dispatch.js';
import './github/actions/update-issue.js';
import './github/actions/update-label.js';
import './github/actions/update-pull-request.js';
import './github/actions/update-release.js';

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
import './google-calendar/syncs/events.js';
import './google-calendar/syncs/calendars.js';
import './google-calendar/syncs/settings.js';
import './google-calendar/actions/add-attendee.js';
import './google-calendar/actions/clear-calendar.js';
import './google-calendar/actions/create-acl-rule.js';
import './google-calendar/actions/create-all-day-event.js';
import './google-calendar/actions/create-calendar.js';
import './google-calendar/actions/create-event.js';
import './google-calendar/actions/create-recurring-event.js';
import './google-calendar/actions/delete-acl-rule.js';
import './google-calendar/actions/delete-calendar.js';
import './google-calendar/actions/delete-event.js';
import './google-calendar/actions/find-free-slots.js';
import './google-calendar/actions/get-acl-rule.js';
import './google-calendar/actions/get-calendar-list-entry.js';
import './google-calendar/actions/get-calendar.js';
import './google-calendar/actions/get-colors.js';
import './google-calendar/actions/get-event.js';
import './google-calendar/actions/get-setting.js';
import './google-calendar/actions/import-event.js';
import './google-calendar/actions/insert-calendar-to-list.js';
import './google-calendar/actions/list-acl-rules.js';
import './google-calendar/actions/list-calendars.js';
import './google-calendar/actions/get-event-instances.js';
import './google-calendar/actions/list-events.js';
import './google-calendar/actions/list-settings.js';
import './google-calendar/actions/list-upcoming-events.js';
import './google-calendar/actions/move-event.js';
import './google-calendar/actions/patch-event.js';
import './google-calendar/actions/query-free-busy.js';
import './google-calendar/actions/quick-add-event.js';
import './google-calendar/actions/remove-attendee.js';
import './google-calendar/actions/remove-calendar-from-list.js';
import './google-calendar/actions/search-events.js';
import './google-calendar/actions/settings.js';
import './google-calendar/actions/stop-channel.js';
import './google-calendar/actions/update-acl-rule.js';
import './google-calendar/actions/update-attendee-response.js';
import './google-calendar/actions/update-calendar-list-entry.js';
import './google-calendar/actions/update-calendar.js';
import './google-calendar/actions/update-event.js';
import './google-calendar/actions/watch-calendar-list.js';
import './google-calendar/actions/watch-events.js';
import './google-calendar/actions/watch-settings.js';
import './google-calendar/actions/whoami.js';

// -- Integration: google-drive
import './google-drive/syncs/documents.js';
import './google-drive/syncs/folders.js';
import './google-drive/syncs/permissions.js';
import './google-drive/syncs/shared-drives.js';
import './google-drive/actions/copy-file.js';
import './google-drive/actions/create-comment.js';
import './google-drive/actions/create-folder.js';
import './google-drive/actions/create-shared-drive.js';
import './google-drive/actions/delete-comment.js';
import './google-drive/actions/delete-file.js';
import './google-drive/actions/delete-permission.js';
import './google-drive/actions/delete-shared-drive.js';
import './google-drive/actions/empty-trash.js';
import './google-drive/actions/find-file.js';
import './google-drive/actions/find-folder.js';
import './google-drive/actions/get-about.js';
import './google-drive/actions/get-changes-start-page-token.js';
import './google-drive/actions/get-comment.js';
import './google-drive/actions/get-permission.js';
import './google-drive/actions/get-revision.js';
import './google-drive/actions/get-shared-drive.js';
import './google-drive/actions/hide-shared-drive.js';
import './google-drive/actions/list-changes.js';
import './google-drive/actions/list-comments.js';
import './google-drive/actions/list-files-non-unified.js';
import './google-drive/actions/list-permissions.js';
import './google-drive/actions/list-drives.js';
import './google-drive/actions/move-file.js';
import './google-drive/actions/unhide-shared-drive.js';
import './google-drive/actions/update-comment.js';
import './google-drive/actions/update-file.js';
import './google-drive/actions/update-permission.js';
import './google-drive/actions/update-shared-drive.js';
import './google-drive/actions/upload-document.js';

// -- Integration: google-mail
import './google-mail/syncs/filters.js';
import './google-mail/syncs/labels.js';
import './google-mail/syncs/messages.js';
import './google-mail/syncs/send-as-aliases.js';
import './google-mail/syncs/threads.js';
import './google-mail/actions/batch-delete-messages.js';
import './google-mail/actions/batch-modify-messages.js';
import './google-mail/actions/create-draft.js';
import './google-mail/actions/create-filter.js';
import './google-mail/actions/create-label.js';
import './google-mail/actions/create-send-as-alias.js';
import './google-mail/actions/delete-draft.js';
import './google-mail/actions/delete-filter.js';
import './google-mail/actions/delete-forwarding-address.js';
import './google-mail/actions/delete-label.js';
import './google-mail/actions/delete-message.js';
import './google-mail/actions/delete-send-as-alias.js';
import './google-mail/actions/delete-thread.js';
import './google-mail/actions/get-attachment.js';
import './google-mail/actions/get-auto-forwarding-settings.js';
import './google-mail/actions/get-draft.js';
import './google-mail/actions/get-filter.js';
import './google-mail/actions/get-forwarding-address.js';
import './google-mail/actions/get-imap-settings.js';
import './google-mail/actions/get-label.js';
import './google-mail/actions/get-language-settings.js';
import './google-mail/actions/get-message.js';
import './google-mail/actions/get-pop-settings.js';
import './google-mail/actions/get-send-as-alias.js';
import './google-mail/actions/get-thread.js';
import './google-mail/actions/get-vacation-settings.js';
import './google-mail/actions/list-drafts.js';
import './google-mail/actions/list-filters.js';
import './google-mail/actions/list-forwarding-addresses.js';
import './google-mail/actions/list-labels.js';
import './google-mail/actions/list-messages.js';
import './google-mail/actions/list-send-as-aliases.js';
import './google-mail/actions/list-threads.js';
import './google-mail/actions/list-watch-history.js';
import './google-mail/actions/modify-message.js';
import './google-mail/actions/modify-thread.js';
import './google-mail/actions/send-draft.js';
import './google-mail/actions/send-message.js';
import './google-mail/actions/stop-watch.js';
import './google-mail/actions/trash-message.js';
import './google-mail/actions/trash-thread.js';
import './google-mail/actions/untrash-message.js';
import './google-mail/actions/untrash-thread.js';
import './google-mail/actions/update-auto-forwarding-settings.js';
import './google-mail/actions/update-draft.js';
import './google-mail/actions/update-imap-settings.js';
import './google-mail/actions/update-label.js';
import './google-mail/actions/update-language-settings.js';
import './google-mail/actions/update-pop-settings.js';
import './google-mail/actions/update-send-as-alias.js';
import './google-mail/actions/update-send-as-smtp-msa.js';
import './google-mail/actions/update-vacation-settings.js';
import './google-mail/actions/verify-send-as-alias.js';
import './google-mail/actions/watch-mailbox.js';

// -- Integration: google-sheet
import './google-sheet/syncs/rows.js';
import './google-sheet/syncs/worksheets.js';
import './google-sheet/actions/append-values-to-spreadsheet.js';
import './google-sheet/actions/batch-clear-values-by-data-filter.js';
import './google-sheet/actions/batch-clear-values.js';
import './google-sheet/actions/batch-get-values-by-data-filter.js';
import './google-sheet/actions/batch-get-values.js';
import './google-sheet/actions/batch-update-spreadsheet.js';
import './google-sheet/actions/clear-values.js';
import './google-sheet/actions/copy-sheet.js';
import './google-sheet/actions/create-column.js';
import './google-sheet/actions/create-spreadsheet-row.js';
import './google-sheet/actions/create-spreadsheet.js';
import './google-sheet/actions/delete-worksheet.js';
import './google-sheet/actions/get-spreadsheet-by-data-filter.js';
import './google-sheet/actions/get-values.js';
import './google-sheet/actions/search-developer-metadata.js';
import './google-sheet/actions/update-conditional-format-rule.js';
import './google-sheet/actions/update-values.js';
import './google-sheet/actions/upsert-row.js';

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
import './hubspot/syncs/deals.js';
import './hubspot/syncs/marketing-emails.js';
import './hubspot/syncs/owners.js';
import './hubspot/syncs/products.js';
import './hubspot/syncs/tasks.js';
import './hubspot/syncs/service-tickets.js';
import './hubspot/syncs/users.js';
import './hubspot/actions/batch-create-companies.js';
import './hubspot/actions/batch-update-companies.js';
import './hubspot/actions/change-user-role.js';
import './hubspot/actions/clone-marketing-email.js';
import './hubspot/actions/create-association.js';
import './hubspot/actions/create-company.js';
import './hubspot/actions/create-contact.js';
import './hubspot/actions/create-deal.js';
import './hubspot/actions/create-marketing-email.js';
import './hubspot/actions/create-note.js';
import './hubspot/actions/create-property.js';
import './hubspot/actions/create-task.js';
import './hubspot/actions/create-ticket.js';
import './hubspot/actions/create-user.js';
import './hubspot/actions/delete-a-workflow.js';
import './hubspot/actions/delete-company.js';
import './hubspot/actions/delete-contact.js';
import './hubspot/actions/delete-deal.js';
import './hubspot/actions/delete-marketing-email.js';
import './hubspot/actions/delete-task.js';
import './hubspot/actions/delete-ticket.js';
import './hubspot/actions/delete-user.js';
import './hubspot/actions/fetch-account-information.js';
import './hubspot/actions/fetch-custom-objects.js';
import './hubspot/actions/fetch-pipelines.js';
import './hubspot/actions/fetch-properties.js';
import './hubspot/actions/fetch-roles.js';
import './hubspot/actions/get-company.js';
import './hubspot/actions/get-contact.js';
import './hubspot/actions/get-deal.js';
import './hubspot/actions/get-marketing-email.js';
import './hubspot/actions/get-owner.js';
import './hubspot/actions/get-ticket.js';
import './hubspot/actions/list-companies.js';
import './hubspot/actions/list-contacts.js';
import './hubspot/actions/list-deals.js';
import './hubspot/actions/list-forms.js';
import './hubspot/actions/list-marketing-emails.js';
import './hubspot/actions/list-tickets.js';
import './hubspot/actions/search-companies.js';
import './hubspot/actions/search-deals.js';
import './hubspot/actions/search-tickets.js';
import './hubspot/actions/update-company.js';
import './hubspot/actions/update-contact.js';
import './hubspot/actions/update-deal.js';
import './hubspot/actions/update-marketing-email.js';
import './hubspot/actions/update-task.js';
import './hubspot/actions/update-ticket.js';
import './hubspot/actions/whoami.js';

// -- Integration: instantly
import './instantly/actions/set-campaign-name.js';

// -- Integration: intercom
import './intercom/syncs/admins.js';
import './intercom/syncs/articles.js';
import './intercom/syncs/companies.js';
import './intercom/syncs/contacts.js';
import './intercom/syncs/conversation-parts.js';
import './intercom/syncs/conversations.js';
import './intercom/syncs/help-center-collections.js';
import './intercom/syncs/segments.js';
import './intercom/syncs/tags.js';
import './intercom/actions/attach-contact-to-company.js';
import './intercom/actions/close-conversation.js';
import './intercom/actions/create-article.js';
import './intercom/actions/create-company.js';
import './intercom/actions/create-contact.js';
import './intercom/actions/create-conversation.js';
import './intercom/actions/create-note.js';
import './intercom/actions/create-tag.js';
import './intercom/actions/delete-article.js';
import './intercom/actions/delete-company.js';
import './intercom/actions/delete-contact.js';
import './intercom/actions/detach-contact-from-company.js';
import './intercom/actions/get-admin.js';
import './intercom/actions/get-article.js';
import './intercom/actions/get-company.js';
import './intercom/actions/get-contact.js';
import './intercom/actions/get-conversation.js';
import './intercom/actions/list-admins.js';
import './intercom/actions/list-articles.js';
import './intercom/actions/list-companies.js';
import './intercom/actions/list-company-contacts.js';
import './intercom/actions/list-contacts.js';
import './intercom/actions/list-conversations.js';
import './intercom/actions/list-help-center-collections.js';
import './intercom/actions/list-notes.js';
import './intercom/actions/list-tags.js';
import './intercom/actions/merge-contacts.js';
import './intercom/actions/reopen-conversation.js';
import './intercom/actions/reply-to-conversation.js';
import './intercom/actions/search-contacts.js';
import './intercom/actions/search-conversations.js';
import './intercom/actions/send-message.js';
import './intercom/actions/snooze-conversation.js';
import './intercom/actions/tag-companies.js';
import './intercom/actions/tag-contacts.js';
import './intercom/actions/tag-conversation.js';
import './intercom/actions/untag-contacts.js';
import './intercom/actions/untag-conversation.js';
import './intercom/actions/update-article.js';
import './intercom/actions/update-company.js';
import './intercom/actions/update-contact.js';
import './intercom/actions/update-conversation.js';

// -- Integration: jira
import './jira/syncs/fields.js';
import './jira/syncs/issue-types.js';
import './jira/syncs/issues.js';
import './jira/syncs/project-components.js';
import './jira/syncs/project-versions.js';
import './jira/syncs/projects.js';
import './jira/syncs/users.js';
import './jira/actions/add-attachment.js';
import './jira/actions/add-comment.js';
import './jira/actions/add-watcher.js';
import './jira/actions/add-worklog.js';
import './jira/actions/create-issue-link.js';
import './jira/actions/create-issue.js';
import './jira/actions/delete-attachment.js';
import './jira/actions/delete-comment.js';
import './jira/actions/delete-issue-link.js';
import './jira/actions/delete-issue.js';
import './jira/actions/delete-worklog.js';
import './jira/actions/get-create-issue-metadata.js';
import './jira/actions/get-edit-issue-metadata.js';
import './jira/actions/get-field.js';
import './jira/actions/get-issue-changelog.js';
import './jira/actions/get-issue-type.js';
import './jira/actions/get-issue.js';
import './jira/actions/get-myself.js';
import './jira/actions/get-priority.js';
import './jira/actions/get-project.js';
import './jira/actions/get-status.js';
import './jira/actions/get-user.js';
import './jira/actions/list-fields.js';
import './jira/actions/list-issue-comments.js';
import './jira/actions/list-issue-types.js';
import './jira/actions/list-priorities.js';
import './jira/actions/list-project-components.js';
import './jira/actions/list-project-versions.js';
import './jira/actions/list-projects.js';
import './jira/actions/list-statuses.js';
import './jira/actions/list-transitions.js';
import './jira/actions/list-users.js';
import './jira/actions/list-watchers.js';
import './jira/actions/list-worklogs.js';
import './jira/actions/remove-watcher.js';
import './jira/actions/search-issues.js';
import './jira/actions/transition-issue.js';
import './jira/actions/update-comment.js';
import './jira/actions/update-issue.js';
import './jira/actions/update-worklog.js';

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
import './linear/syncs/cycles.js';
import './linear/syncs/issue-labels.js';
import './linear/syncs/issues.js';
import './linear/syncs/milestones.js';
import './linear/syncs/projects.js';
import './linear/syncs/roadmaps.js';
import './linear/syncs/teams.js';
import './linear/syncs/users.js';
import './linear/syncs/workflow-states.js';
import './linear/actions/add-issue-label.js';
import './linear/actions/archive-cycle.js';
import './linear/actions/archive-issue.js';
import './linear/actions/create-attachment.js';
import './linear/actions/create-comment.js';
import './linear/actions/create-cycle.js';
import './linear/actions/create-issue-label.js';
import './linear/actions/create-issue-relation.js';
import './linear/actions/create-issue.js';
import './linear/actions/create-project.js';
import './linear/actions/delete-attachment.js';
import './linear/actions/delete-comment.js';
import './linear/actions/delete-issue-label.js';
import './linear/actions/delete-issue-relation.js';
import './linear/actions/delete-issue.js';
import './linear/actions/get-attachment.js';
import './linear/actions/get-comment.js';
import './linear/actions/get-cycle.js';
import './linear/actions/get-issue-label.js';
import './linear/actions/get-issue.js';
import './linear/actions/get-project.js';
import './linear/actions/get-team.js';
import './linear/actions/get-user.js';
import './linear/actions/get-viewer.js';
import './linear/actions/get-workflow-state.js';
import './linear/actions/list-attachments.js';
import './linear/actions/list-comments.js';
import './linear/actions/list-cycles.js';
import './linear/actions/list-issue-labels.js';
import './linear/actions/list-issues.js';
import './linear/actions/list-projects.js';
import './linear/actions/list-teams.js';
import './linear/actions/list-users.js';
import './linear/actions/list-workflow-states.js';
import './linear/actions/remove-issue-label.js';
import './linear/actions/resolve-comment.js';
import './linear/actions/search-issues.js';
import './linear/actions/unarchive-issue.js';
import './linear/actions/unarchive-project.js';
import './linear/actions/unresolve-comment.js';
import './linear/actions/update-comment.js';
import './linear/actions/update-cycle.js';
import './linear/actions/update-issue-label.js';
import './linear/actions/update-issue-relation.js';
import './linear/actions/update-issue.js';
import './linear/actions/update-project.js';

// -- Integration: linkedin
import './linkedin/syncs/messages.js';
import './linkedin/actions/post.js';
import './linkedin/actions/create-comment.js';
import './linkedin/actions/create-like.js';
import './linkedin/actions/create-post.js';
import './linkedin/actions/delete-comment.js';
import './linkedin/actions/delete-like.js';
import './linkedin/actions/delete-post.js';
import './linkedin/actions/get-current-member-profile.js';
import './linkedin/actions/list-post-likes.js';
import './linkedin/actions/update-post.js';

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
import './microsoft-teams/syncs/channel-message-replies.js';
import './microsoft-teams/syncs/channel-messages.js';
import './microsoft-teams/syncs/chat-members.js';
import './microsoft-teams/syncs/chat-messages.js';
import './microsoft-teams/syncs/chats.js';
import './microsoft-teams/syncs/joined-teams.js';
import './microsoft-teams/syncs/org-units.js';
import './microsoft-teams/syncs/team-channels.js';
import './microsoft-teams/syncs/team-members.js';
import './microsoft-teams/syncs/users.js';
import './microsoft-teams/actions/add-team-member.js';
import './microsoft-teams/actions/create-channel-message.js';
import './microsoft-teams/actions/create-channel-tab.js';
import './microsoft-teams/actions/create-channel.js';
import './microsoft-teams/actions/create-chat-message.js';
import './microsoft-teams/actions/create-chat.js';
import './microsoft-teams/actions/create-team.js';
import './microsoft-teams/actions/delete-channel.js';
import './microsoft-teams/actions/get-channel-message.js';
import './microsoft-teams/actions/get-channel.js';
import './microsoft-teams/actions/get-chat-message.js';
import './microsoft-teams/actions/get-chat.js';
import './microsoft-teams/actions/get-team.js';
import './microsoft-teams/actions/list-channel-messages.js';
import './microsoft-teams/actions/list-channel-replies.js';
import './microsoft-teams/actions/list-channel-tabs.js';
import './microsoft-teams/actions/list-channels.js';
import './microsoft-teams/actions/list-chat-members.js';
import './microsoft-teams/actions/list-chat-messages.js';
import './microsoft-teams/actions/list-chats.js';
import './microsoft-teams/actions/list-joined-teams.js';
import './microsoft-teams/actions/list-team-members.js';
import './microsoft-teams/actions/remove-team-member.js';
import './microsoft-teams/actions/reply-to-channel-message.js';
import './microsoft-teams/actions/update-channel.js';

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
import './notion/syncs/data-source-entries.js';
import './notion/syncs/data-source-templates.js';
import './notion/syncs/data-sources.js';
import './notion/syncs/users.js';
import './notion/actions/append-block-children.js';
import './notion/actions/append-bulleted-list.js';
import './notion/actions/append-callout-block.js';
import './notion/actions/append-code-block.js';
import './notion/actions/append-divider.js';
import './notion/actions/append-heading-block.js';
import './notion/actions/append-todo-block.js';
import './notion/actions/archive-page.js';
import './notion/actions/create-comment.js';
import './notion/actions/create-data-source.js';
import './notion/actions/create-page.js';
import './notion/actions/delete-block.js';
import './notion/actions/duplicate-page.js';
import './notion/actions/get-bot-user.js';
import './notion/actions/get-page-as-markdown.js';
import './notion/actions/get-page-property-item.js';
import './notion/actions/get-user.js';
import './notion/actions/list-block-children.js';
import './notion/actions/list-comments.js';
import './notion/actions/list-data-source-templates.js';
import './notion/actions/list-users.js';
import './notion/actions/query-database-filtered.js';
import './notion/actions/query-database-sorted.js';
import './notion/actions/query-database.js';
import './notion/actions/move-page.js';
import './notion/actions/query-data-source.js';
import './notion/actions/restore-page.js';
import './notion/actions/retrieve-block.js';
import './notion/actions/retrieve-block-children.js';
import './notion/actions/retrieve-comment.js';
import './notion/actions/retrieve-data-source.js';
import './notion/actions/retrieve-database.js';
import './notion/actions/retrieve-page-property.js';
import './notion/actions/retrieve-page.js';
import './notion/actions/retrieve-user.js';
import './notion/actions/search-databases.js';
import './notion/actions/search-pages.js';
import './notion/actions/search.js';
import './notion/actions/update-block.js';
import './notion/actions/update-data-source.js';
import './notion/actions/update-database.js';
import './notion/actions/update-page-markdown.js';
import './notion/actions/update-page.js';

// -- Integration: okta
import './okta/syncs/users.js';
import './okta/actions/add-group.js';
import './okta/actions/add-user-group.js';
import './okta/actions/create-user.js';
import './okta/actions/remove-user-group.js';

// -- Integration: one-drive
import './one-drive/syncs/drive-items.js';
import './one-drive/syncs/folder-children.js';
import './one-drive/syncs/recent-items.js';
import './one-drive/syncs/shared-items.js';
import './one-drive/syncs/user-files-selection.js';
import './one-drive/syncs/user-files.js';
import './one-drive/actions/copy-item.js';
import './one-drive/actions/create-folder.js';
import './one-drive/actions/create-sharing-link.js';
import './one-drive/actions/create-upload-session.js';
import './one-drive/actions/delete-item.js';
import './one-drive/actions/delete-permission.js';
import './one-drive/actions/get-drive.js';
import './one-drive/actions/get-item.js';
import './one-drive/actions/get-permission.js';
import './one-drive/actions/invite-recipients.js';
import './one-drive/actions/list-children.js';
import './one-drive/actions/list-drives.js';
import './one-drive/actions/list-permissions.js';
import './one-drive/actions/list-recent-items.js';
import './one-drive/actions/list-shared-items.js';
import './one-drive/actions/list-versions.js';
import './one-drive/actions/move-item.js';
import './one-drive/actions/search-items.js';
import './one-drive/actions/update-item.js';
import './one-drive/actions/upload-small-file.js';

// -- Integration: one-drive-personal
import './one-drive-personal/syncs/folder-children.js';
import './one-drive-personal/syncs/user-files-selection.js';
import './one-drive-personal/syncs/user-files.js';
import './one-drive-personal/actions/create-folder.js';
import './one-drive-personal/actions/create-sharing-link.js';
import './one-drive-personal/actions/create-upload-session.js';
import './one-drive-personal/actions/delete-item.js';
import './one-drive-personal/actions/delete-permission.js';
import './one-drive-personal/actions/download-item-content.js';
import './one-drive-personal/actions/get-drive.js';
import './one-drive-personal/actions/get-item.js';
import './one-drive-personal/actions/get-permission.js';
import './one-drive-personal/actions/invite-recipients.js';
import './one-drive-personal/actions/list-children.js';
import './one-drive-personal/actions/list-permissions.js';
import './one-drive-personal/actions/list-versions.js';
import './one-drive-personal/actions/move-item.js';
import './one-drive-personal/actions/search-items.js';
import './one-drive-personal/actions/update-item.js';
import './one-drive-personal/actions/upload-small-file.js';

// -- Integration: oracle-hcm
import './oracle-hcm/syncs/employees.js';
import './oracle-hcm/syncs/unified-employees.js';

// -- Integration: outlook
import './outlook/syncs/calendars.js';
import './outlook/syncs/events.js';
import './outlook/syncs/mail-folders.js';
import './outlook/syncs/messages.js';
import './outlook/actions/add-event-attachment.js';
import './outlook/actions/add-message-attachment.js';
import './outlook/actions/cancel-event.js';
import './outlook/actions/copy-message.js';
import './outlook/actions/create-calendar.js';
import './outlook/actions/create-draft-message.js';
import './outlook/actions/create-event.js';
import './outlook/actions/create-mail-folder.js';
import './outlook/actions/delete-calendar.js';
import './outlook/actions/delete-event.js';
import './outlook/actions/delete-message.js';
import './outlook/actions/download-message-attachment.js';
import './outlook/actions/get-calendar.js';
import './outlook/actions/get-event.js';
import './outlook/actions/get-message.js';
import './outlook/actions/list-calendar-events.js';
import './outlook/actions/list-calendars.js';
import './outlook/actions/list-event-attachments.js';
import './outlook/actions/list-mail-folder-children.js';
import './outlook/actions/list-mail-folders.js';
import './outlook/actions/list-message-attachments.js';
import './outlook/actions/list-messages.js';
import './outlook/actions/move-message.js';
import './outlook/actions/reply-all-to-message.js';
import './outlook/actions/reply-to-message.js';
import './outlook/actions/send-draft-message.js';
import './outlook/actions/send-mail.js';
import './outlook/actions/update-calendar.js';
import './outlook/actions/update-event.js';
import './outlook/actions/update-message.js';

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
import './pipedrive/syncs/leads.js';
import './pipedrive/syncs/notes.js';
import './pipedrive/syncs/organizations.js';
import './pipedrive/syncs/persons.js';
import './pipedrive/syncs/pipelines.js';
import './pipedrive/syncs/products.js';
import './pipedrive/syncs/stages.js';
import './pipedrive/syncs/users.js';
import './pipedrive/actions/create-activity.js';
import './pipedrive/actions/create-deal.js';
import './pipedrive/actions/create-lead.js';
import './pipedrive/actions/create-note.js';
import './pipedrive/actions/create-organization.js';
import './pipedrive/actions/create-person.js';
import './pipedrive/actions/create-pipeline.js';
import './pipedrive/actions/create-product.js';
import './pipedrive/actions/create-stage.js';
import './pipedrive/actions/delete-activity.js';
import './pipedrive/actions/delete-deal.js';
import './pipedrive/actions/delete-lead.js';
import './pipedrive/actions/delete-note.js';
import './pipedrive/actions/delete-organization.js';
import './pipedrive/actions/delete-person.js';
import './pipedrive/actions/delete-pipeline.js';
import './pipedrive/actions/delete-product.js';
import './pipedrive/actions/delete-stage.js';
import './pipedrive/actions/get-activity.js';
import './pipedrive/actions/get-deal.js';
import './pipedrive/actions/get-lead.js';
import './pipedrive/actions/get-note.js';
import './pipedrive/actions/get-organization.js';
import './pipedrive/actions/get-person.js';
import './pipedrive/actions/get-pipeline.js';
import './pipedrive/actions/get-product.js';
import './pipedrive/actions/get-stage.js';
import './pipedrive/actions/get-user.js';
import './pipedrive/actions/list-activities.js';
import './pipedrive/actions/list-deals.js';
import './pipedrive/actions/list-leads.js';
import './pipedrive/actions/list-notes.js';
import './pipedrive/actions/list-organizations.js';
import './pipedrive/actions/list-persons.js';
import './pipedrive/actions/list-pipelines.js';
import './pipedrive/actions/list-products.js';
import './pipedrive/actions/list-stages.js';
import './pipedrive/actions/list-users.js';
import './pipedrive/actions/update-activity.js';
import './pipedrive/actions/update-deal.js';
import './pipedrive/actions/update-lead.js';
import './pipedrive/actions/update-note.js';
import './pipedrive/actions/update-organization.js';
import './pipedrive/actions/update-person.js';
import './pipedrive/actions/update-pipeline.js';
import './pipedrive/actions/update-product.js';
import './pipedrive/actions/update-stage.js';

// -- Integration: quickbooks
import './quickbooks/syncs/accounts.js';
import './quickbooks/syncs/bill-payments.js';
import './quickbooks/syncs/bills.js';
import './quickbooks/syncs/credit-memos.js';
import './quickbooks/syncs/customers.js';
import './quickbooks/syncs/deposits.js';
import './quickbooks/syncs/estimates.js';
import './quickbooks/syncs/invoices.js';
import './quickbooks/syncs/items.js';
import './quickbooks/syncs/journal-entries.js';
import './quickbooks/syncs/payments.js';
import './quickbooks/syncs/purchases.js';
import './quickbooks/syncs/transfers.js';
import './quickbooks/syncs/vendors.js';
import './quickbooks/actions/create-account.js';
import './quickbooks/actions/create-bill.js';
import './quickbooks/actions/create-credit-memo.js';
import './quickbooks/actions/create-customer.js';
import './quickbooks/actions/create-deposit.js';
import './quickbooks/actions/create-estimate.js';
import './quickbooks/actions/create-invoice.js';
import './quickbooks/actions/create-item.js';
import './quickbooks/actions/create-journal-entry.js';
import './quickbooks/actions/create-payment.js';
import './quickbooks/actions/create-purchase-order.js';
import './quickbooks/actions/create-vendor.js';
import './quickbooks/actions/get-account.js';
import './quickbooks/actions/get-bill.js';
import './quickbooks/actions/get-credit-memo.js';
import './quickbooks/actions/get-customer.js';
import './quickbooks/actions/get-deposit.js';
import './quickbooks/actions/get-estimate.js';
import './quickbooks/actions/get-invoice.js';
import './quickbooks/actions/get-item.js';
import './quickbooks/actions/get-journal-entry.js';
import './quickbooks/actions/get-payment.js';
import './quickbooks/actions/get-purchase-order.js';
import './quickbooks/actions/get-vendor.js';
import './quickbooks/actions/list-accounts.js';
import './quickbooks/actions/list-bills.js';
import './quickbooks/actions/list-credit-memos.js';
import './quickbooks/actions/list-customers.js';
import './quickbooks/actions/list-deposits.js';
import './quickbooks/actions/list-estimates.js';
import './quickbooks/actions/list-invoices.js';
import './quickbooks/actions/list-items.js';
import './quickbooks/actions/list-journal-entries.js';
import './quickbooks/actions/list-payments.js';
import './quickbooks/actions/list-purchase-orders.js';
import './quickbooks/actions/list-vendors.js';
import './quickbooks/actions/query-entities.js';
import './quickbooks/actions/send-invoice.js';
import './quickbooks/actions/update-account.js';
import './quickbooks/actions/update-bill.js';
import './quickbooks/actions/update-credit-memo.js';
import './quickbooks/actions/update-customer.js';
import './quickbooks/actions/update-deposit.js';
import './quickbooks/actions/update-estimate.js';
import './quickbooks/actions/update-invoice.js';
import './quickbooks/actions/update-item.js';
import './quickbooks/actions/update-journal-entry.js';
import './quickbooks/actions/update-payment.js';
import './quickbooks/actions/update-purchase-order.js';
import './quickbooks/actions/update-vendor.js';

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
import './salesforce/syncs/cases.js';
import './salesforce/syncs/contacts.js';
import './salesforce/syncs/opportunities.js';
import './salesforce/syncs/records-by-soql.js';
import './salesforce/syncs/tickets.js';
import './salesforce/syncs/users.js';
import './salesforce/actions/composite-batch-request.js';
import './salesforce/actions/composite-graph-request.js';
import './salesforce/actions/composite-request.js';
import './salesforce/actions/create-record.js';
import './salesforce/actions/create-sobject-collection.js';
import './salesforce/actions/delete-record.js';
import './salesforce/actions/delete-sobject-collection.js';
import './salesforce/actions/describe-global.js';
import './salesforce/actions/describe-sobject.js';
import './salesforce/actions/get-current-user.js';
import './salesforce/actions/get-limits.js';
import './salesforce/actions/get-quick-action-defaults.js';
import './salesforce/actions/get-record-by-external-id.js';
import './salesforce/actions/get-record.js';
import './salesforce/actions/get-sobject-basic-info.js';
import './salesforce/actions/list-available-resources.js';
import './salesforce/actions/list-quick-actions.js';
import './salesforce/actions/list-recent-items.js';
import './salesforce/actions/parameterized-search-records.js';
import './salesforce/actions/query-all-records.js';
import './salesforce/actions/query-records.js';
import './salesforce/actions/retrieve-query-more.js';
import './salesforce/actions/search-records.js';
import './salesforce/actions/update-record-by-external-id.js';
import './salesforce/actions/update-record.js';
import './salesforce/actions/update-sobject-collection.js';
import './salesforce/actions/upsert-record.js';
import './salesforce/actions/upsert-sobject-collection.js';

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
import './slack/syncs/conversations.js';
import './slack/syncs/messages-received.js';
import './slack/syncs/users.js';
import './slack/actions/add-reaction.js';
import './slack/actions/archive-channel.js';
import './slack/actions/create-channel.js';
import './slack/actions/create-reminder.js';
import './slack/actions/delete-message.js';
import './slack/actions/delete-scheduled-message.js';
import './slack/actions/search-messages.js';
import './slack/actions/lookup-user-by-email.js';
import './slack/actions/get-channel-info.js';
import './slack/actions/get-conversation-history.js';
import './slack/actions/get-dnd-info.js';
import './slack/actions/get-message-permalink.js';
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
import './slack/actions/get-channel-members.js';
import './slack/actions/list-channels.js';
import './slack/actions/list-custom-emoji.js';
import './slack/actions/list-files.js';
import './slack/actions/list-pins.js';
import './slack/actions/list-scheduled-messages.js';
import './slack/actions/list-user-group-members.js';
import './slack/actions/list-user-groups.js';
import './slack/actions/list-user-reactions.js';
import './slack/actions/list-users.js';
import './slack/actions/mark-as-read.js';
import './slack/actions/open-dm.js';
import './slack/actions/pin-message.js';
import './slack/actions/post-message.js';
import './slack/actions/remove-reaction.js';
import './slack/actions/remove-from-channel.js';
import './slack/actions/rename-channel.js';
import './slack/actions/schedule-message.js';
import './slack/actions/search-files.js';
import './slack/actions/send-ephemeral-message.js';
import './slack/actions/send-message.js';
import './slack/actions/set-channel-purpose.js';
import './slack/actions/set-channel-topic.js';
import './slack/actions/set-status.js';
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

// -- Integration: twitter-v2
import './twitter-v2/syncs/liked-tweets.js';
import './twitter-v2/syncs/lists.js';
import './twitter-v2/syncs/mentions.js';
import './twitter-v2/syncs/spaces.js';
import './twitter-v2/syncs/tweets.js';
import './twitter-v2/syncs/users.js';
import './twitter-v2/actions/bookmark-tweet.js';
import './twitter-v2/actions/create-liked-tweet.js';
import './twitter-v2/actions/create-list.js';
import './twitter-v2/actions/create-tweet.js';
import './twitter-v2/actions/delete-liked-tweet.js';
import './twitter-v2/actions/delete-list.js';
import './twitter-v2/actions/delete-tweet.js';
import './twitter-v2/actions/follow-user.js';
import './twitter-v2/actions/get-liked-tweet.js';
import './twitter-v2/actions/get-list.js';
import './twitter-v2/actions/get-mention.js';
import './twitter-v2/actions/get-space.js';
import './twitter-v2/actions/get-tweet.js';
import './twitter-v2/actions/get-user.js';
import './twitter-v2/actions/like-tweet.js';
import './twitter-v2/actions/list-liked-tweets.js';
import './twitter-v2/actions/list-lists.js';
import './twitter-v2/actions/list-mentions.js';
import './twitter-v2/actions/list-spaces.js';
import './twitter-v2/actions/list-tweets.js';
import './twitter-v2/actions/list-users.js';
import './twitter-v2/actions/remove-bookmark.js';
import './twitter-v2/actions/unfollow-user.js';
import './twitter-v2/actions/unlike-tweet.js';
import './twitter-v2/actions/update-list.js';

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
import './xero/syncs/purchase-orders.js';
import './xero/actions/create-account.js';
import './xero/actions/create-bank-transaction.js';
import './xero/actions/create-contact.js';
import './xero/actions/create-credit-note.js';
import './xero/actions/create-invoice.js';
import './xero/actions/create-item.js';
import './xero/actions/create-payment.js';
import './xero/actions/create-purchase-order.js';
import './xero/actions/get-account.js';
import './xero/actions/get-bank-transaction.js';
import './xero/actions/get-contact.js';
import './xero/actions/get-credit-note.js';
import './xero/actions/get-invoice.js';
import './xero/actions/get-item.js';
import './xero/actions/get-payment.js';
import './xero/actions/get-purchase-order.js';
import './xero/actions/get-tenants.js';
import './xero/actions/list-accounts.js';
import './xero/actions/list-bank-transactions.js';
import './xero/actions/list-contacts.js';
import './xero/actions/list-credit-notes.js';
import './xero/actions/list-invoices.js';
import './xero/actions/list-items.js';
import './xero/actions/list-payments.js';
import './xero/actions/list-purchase-orders.js';
import './xero/actions/list-tenants.js';
import './xero/actions/update-account.js';
import './xero/actions/update-bank-transaction.js';
import './xero/actions/update-contact.js';
import './xero/actions/update-credit-note.js';
import './xero/actions/update-invoice.js';
import './xero/actions/update-item.js';
import './xero/actions/update-purchase-order.js';

// -- Integration: youtube
import './youtube/syncs/caption-tracks.js';
import './youtube/syncs/channel-playlists.js';
import './youtube/syncs/channels.js';
import './youtube/syncs/comment-threads.js';
import './youtube/syncs/playlist-items.js';
import './youtube/syncs/uploaded-videos.js';
import './youtube/actions/add-playlist-item.js';
import './youtube/actions/create-comment-reply.js';
import './youtube/actions/create-comment.js';
import './youtube/actions/create-playlist.js';
import './youtube/actions/delete-comment.js';
import './youtube/actions/delete-playlist-item.js';
import './youtube/actions/delete-playlist.js';
import './youtube/actions/delete-video.js';
import './youtube/actions/get-channel.js';
import './youtube/actions/get-comment.js';
import './youtube/actions/get-playlist.js';
import './youtube/actions/get-video.js';
import './youtube/actions/list-captions.js';
import './youtube/actions/list-channel-playlists.js';
import './youtube/actions/list-comment-threads.js';
import './youtube/actions/list-playlist-items.js';
import './youtube/actions/list-uploaded-videos.js';
import './youtube/actions/update-comment.js';
import './youtube/actions/update-playlist-item.js';
import './youtube/actions/update-playlist.js';
import './youtube/actions/update-video.js';

// -- Integration: zendesk
import './zendesk/syncs/articles.js';
import './zendesk/syncs/categories.js';
import './zendesk/syncs/groups.js';
import './zendesk/syncs/macros.js';
import './zendesk/syncs/organizations.js';
import './zendesk/syncs/sections.js';
import './zendesk/syncs/ticket-comments.js';
import './zendesk/syncs/ticket-fields.js';
import './zendesk/syncs/ticket-forms.js';
import './zendesk/syncs/tickets.js';
import './zendesk/syncs/users.js';
import './zendesk/syncs/views.js';
import './zendesk/actions/create-category.js';
import './zendesk/actions/create-organization.js';
import './zendesk/actions/create-section.js';
import './zendesk/actions/create-ticket.js';
import './zendesk/actions/create-user.js';
import './zendesk/actions/delete-user.js';
import './zendesk/actions/get-article.js';
import './zendesk/actions/get-group.js';
import './zendesk/actions/get-organization.js';
import './zendesk/actions/get-ticket-comments.js';
import './zendesk/actions/get-ticket-field.js';
import './zendesk/actions/get-ticket-form.js';
import './zendesk/actions/get-ticket.js';
import './zendesk/actions/get-user.js';
import './zendesk/actions/list-articles.js';
import './zendesk/actions/list-groups.js';
import './zendesk/actions/list-macros.js';
import './zendesk/actions/list-organizations.js';
import './zendesk/actions/list-ticket-fields.js';
import './zendesk/actions/list-ticket-forms.js';
import './zendesk/actions/list-tickets.js';
import './zendesk/actions/list-users.js';
import './zendesk/actions/list-views.js';
import './zendesk/actions/search-tickets.js';
import './zendesk/actions/update-organization.js';
import './zendesk/actions/update-ticket.js';
import './zendesk/actions/update-user.js';

// -- Integration: zoho-crm
import './zoho-crm/syncs/accounts.js';
import './zoho-crm/syncs/calls.js';
import './zoho-crm/syncs/contacts.js';
import './zoho-crm/syncs/deals.js';
import './zoho-crm/syncs/events.js';
import './zoho-crm/syncs/leads.js';
import './zoho-crm/syncs/notes.js';
import './zoho-crm/syncs/products.js';
import './zoho-crm/syncs/tasks.js';
import './zoho-crm/syncs/users.js';
import './zoho-crm/actions/convert-lead.js';
import './zoho-crm/actions/create-account.js';
import './zoho-crm/actions/create-call.js';
import './zoho-crm/actions/create-contact.js';
import './zoho-crm/actions/create-deal.js';
import './zoho-crm/actions/create-event.js';
import './zoho-crm/actions/create-lead.js';
import './zoho-crm/actions/create-note.js';
import './zoho-crm/actions/create-product.js';
import './zoho-crm/actions/create-task.js';
import './zoho-crm/actions/delete-account.js';
import './zoho-crm/actions/delete-call.js';
import './zoho-crm/actions/delete-contact.js';
import './zoho-crm/actions/delete-deal.js';
import './zoho-crm/actions/delete-event.js';
import './zoho-crm/actions/delete-lead.js';
import './zoho-crm/actions/delete-note.js';
import './zoho-crm/actions/delete-product.js';
import './zoho-crm/actions/delete-task.js';
import './zoho-crm/actions/get-account.js';
import './zoho-crm/actions/get-call.js';
import './zoho-crm/actions/get-contact.js';
import './zoho-crm/actions/get-deal.js';
import './zoho-crm/actions/get-event.js';
import './zoho-crm/actions/get-lead.js';
import './zoho-crm/actions/get-note.js';
import './zoho-crm/actions/get-product.js';
import './zoho-crm/actions/get-task.js';
import './zoho-crm/actions/get-user.js';
import './zoho-crm/actions/list-accounts.js';
import './zoho-crm/actions/list-calls.js';
import './zoho-crm/actions/list-contacts.js';
import './zoho-crm/actions/list-deals.js';
import './zoho-crm/actions/list-events.js';
import './zoho-crm/actions/list-leads.js';
import './zoho-crm/actions/list-notes.js';
import './zoho-crm/actions/list-products.js';
import './zoho-crm/actions/list-tasks.js';
import './zoho-crm/actions/list-users.js';
import './zoho-crm/actions/search-records.js';
import './zoho-crm/actions/update-account.js';
import './zoho-crm/actions/update-call.js';
import './zoho-crm/actions/update-contact.js';
import './zoho-crm/actions/update-deal.js';
import './zoho-crm/actions/update-event.js';
import './zoho-crm/actions/update-lead.js';
import './zoho-crm/actions/update-note.js';
import './zoho-crm/actions/update-product.js';
import './zoho-crm/actions/update-task.js';
import './zoho-crm/actions/upsert-records.js';

// -- Integration: zoho-mail
import './zoho-mail/syncs/emails.js';
import './zoho-mail/syncs/tasks.js';
import './zoho-mail/actions/add-user.js';
import './zoho-mail/actions/send-email.js';

// -- Integration: zoom
import './zoom/syncs/meetings.js';
import './zoom/syncs/recordings.js';
import './zoom/syncs/users.js';
import './zoom/syncs/webinars.js';
import './zoom/actions/create-meeting-registrant.js';
import './zoom/actions/create-meeting.js';
import './zoom/actions/create-user.js';
import './zoom/actions/create-webinar.js';
import './zoom/actions/delete-meeting-registrant.js';
import './zoom/actions/delete-meeting.js';
import './zoom/actions/delete-recording.js';
import './zoom/actions/delete-user.js';
import './zoom/actions/delete-webinar.js';
import './zoom/actions/get-current-user.js';
import './zoom/actions/get-meeting-registrant.js';
import './zoom/actions/get-meeting.js';
import './zoom/actions/get-recording.js';
import './zoom/actions/get-user.js';
import './zoom/actions/get-webinar.js';
import './zoom/actions/list-meeting-registrants.js';
import './zoom/actions/list-meetings.js';
import './zoom/actions/list-recordings.js';
import './zoom/actions/list-users.js';
import './zoom/actions/list-webinars.js';
import './zoom/actions/update-meeting-registrant.js';
import './zoom/actions/update-meeting.js';
import './zoom/actions/update-user.js';
import './zoom/actions/update-webinar.js';
