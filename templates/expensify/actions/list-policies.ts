import { createAction } from "nango";
import { getPolicies } from '../helpers/policies.js';
import type { ExpensifyPolicy } from '../types.js';

import { Policy, ExpensifyListPolicyOutput } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Action to fetch a list of policies with some relevant information about them",
    version: "2.0.1",

    endpoint: {
        method: "POST",
        path: "/policies"
    },

    input: z.void(),
    output: ExpensifyListPolicyOutput,

    exec: async (nango): Promise<ExpensifyListPolicyOutput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
