import type { GeneralLedgerAccount } from '../types.js';
import type { Account } from '../../models.js';

export function toAccount(account: GeneralLedgerAccount): Account {
    return {
        id: account.id,
        key: account.key,
        name: account.name,
        account_type: account.accountType,
        normal_balance: account.normalBalance,
        status: account.status,
        disallow_direct_posting: account.disallowDirectPosting,
        closing_type: account.closingType,
        alternative_GLAccount: account.alternativeGLAccount,
        audit: {
            created_date_time: account.audit.createdDateTime,
            modified_date_time: account.audit.modifiedDateTime,
            created_by: account.audit.createdBy,
            modified_by: account.audit.modifiedBy
        }
    };
}
