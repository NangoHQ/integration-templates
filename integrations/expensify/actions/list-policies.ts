import type { NangoAction, Policy, ExpensifyListPolicyOutput } from '../../models';
import { getPolicies } from '../helpers/policies.js';
import type { ExpensifyPolicy } from '../types';

export default async function runAction(nango: NangoAction): Promise<ExpensifyListPolicyOutput> {
    const { policyList } = await getPolicies(nango);

    const policies: Policy[] = policyList.map((policy: ExpensifyPolicy) => {
        const outputPolicy: Policy = {
            id: policy.id,
            type: policy.type,
            name: policy.name,
            shouldShowAutoApprovalOptions: policy.shouldShowAutoApprovalOptions,
            role: policy.role,
            areCompanyCardsEnabled: policy.areCategoriesEnabled,
            shouldShowCustomReportTitleOption: policy.shouldShowCustomReportTitleOption,
            areExpensifyCardsEnabled: policy.areExpensifyCardsEnabled,
            areRulesEnabled: policy.areRulesEnabled,
            areConnectionsEnabled: policy.areConnectionsEnabled,
            approvalMode: policy.approvalMode,
            areCategoriesEnabled: policy.areCategoriesEnabled,
            areReportFieldsEnabled: policy.areReportFieldsEnabled,
            areWorkflowsEnabled: policy.areWorkflowsEnabled,
            outputCurrency: policy.outputCurrency,
            owner: policy.owner,
            areInvoicesEnabled: policy.areInvoicesEnabled,
            createdAt: policy.created,
            eReceipts: policy.eReceipts,
            shouldShowAutoReimbursementLimitOption: policy.shouldShowAutoReimbursementLimitOption,
            areDistanceRatesEnabled: policy.areDistanceRatesEnabled,
            isPolicyExpenseChatEnabled: policy.isPolicyExpenseChatEnabled,
            ownerAccountID: policy.ownerAccountID,
            areTagsEnabled: policy.areTagsEnabled
        };

        return outputPolicy;
    });

    return { policies };
}
