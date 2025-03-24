import type { CreateJournalEntry, JournalEntry, JournalEntryLine, UpdateJournalEntry } from '../../models';
import type { QuickBooksJournalEntry, QuickBooksJournalLine } from '../types';

export function toJournalEntry(journalEntries: QuickBooksJournalEntry): JournalEntry {
    return {
        id: journalEntries.Id || '',
        date: journalEntries.TxnDate ? new Date(journalEntries.TxnDate).toISOString() : '',
        created_at: journalEntries.MetaData?.CreateTime ? new Date(journalEntries.MetaData.CreateTime).toISOString() : '',
        updated_at: journalEntries.MetaData?.LastUpdatedTime ? new Date(journalEntries.MetaData.LastUpdatedTime).toISOString() : '',
        currency: journalEntries.CurrencyRef?.value?.toLowerCase() || '',
        note: journalEntries.PrivateNote,
        lines: journalEntries.Line?.map(toJournalEntryLine) || []
    };
}

// separate journal entry line to its own function
function toJournalEntryLine(line: QuickBooksJournalLine): JournalEntryLine {
    return {
        id: line.Id || '',
        type: line.DetailType,
        account_id: line.JournalEntryLineDetail.AccountRef?.value || '',
        account_name: line.JournalEntryLineDetail.AccountRef?.name || '',
        net_amount: line.Amount || 0,
        posting_type: line.JournalEntryLineDetail.PostingType as 'Debit' | 'Credit',
        description: line.Description || '',
        entity_type: line.JournalEntryLineDetail.Entity?.Type,
        entity_type_id: line.JournalEntryLineDetail.Entity?.EntityRef?.value,
        entity_type_name: line.JournalEntryLineDetail.Entity?.EntityRef?.name,
        department_id: line.JournalEntryLineDetail.DepartmentRef?.value,
        department_name: line.JournalEntryLineDetail.DepartmentRef?.name,
        class_id: line.JournalEntryLineDetail.ClassRef?.value,
        class_name: line.JournalEntryLineDetail.ClassRef?.name
    };
}
/**
 * Maps journal entry data for creation to the QuickBooks journal entry structure.
 * This function takes a CreateJournalEntry object and maps it to the format expected by QuickBooks API.
 *
 * @param {CreateJournalEntry} input - The journal entry data input object.
 * @returns {Partial<QuickBooksJournalEntry>} - The mapped QuickBooks journal entry object.
 */
export function toQuickBooksJournalEntriesCreate(input: CreateJournalEntry): Partial<QuickBooksJournalEntry> {
    const quickBooksJournalEntry: Partial<QuickBooksJournalEntry> = {
        Line: input.line_items.map((line) => {
            const mappedLine: QuickBooksJournalLine = {
                DetailType: line.detail_type,
                Amount: line.amount,
                ...(line.description && { Description: line.description }),
                ...(line.line_num && { LineNum: line.line_num }),
                ...(line.project_ref && {
                    ProjectRef: {
                        value: line.project_ref.value,
                        ...(line.project_ref.name && { name: line.project_ref.name })
                    }
                }),
                JournalEntryLineDetail: {
                    PostingType: line.journal_entry_line_detail.posting_type,
                    AccountRef: {
                        value: line.journal_entry_line_detail.account_ref.value,
                        ...(line.journal_entry_line_detail.account_ref.name && {
                            name: line.journal_entry_line_detail.account_ref.name
                        })
                    },
                    ...(line.journal_entry_line_detail.tax_applicable_on && {
                        TaxApplicableOn: line.journal_entry_line_detail.tax_applicable_on
                    }),
                    ...(line.journal_entry_line_detail.entity &&
                        line.journal_entry_line_detail.entity.entity_ref && {
                            Entity: {
                                ...(line.journal_entry_line_detail.entity.type && {
                                    Type: line.journal_entry_line_detail.entity.type
                                }),
                                EntityRef: {
                                    value: line.journal_entry_line_detail.entity.entity_ref.value,
                                    ...(line.journal_entry_line_detail.entity.entity_ref.name && {
                                        name: line.journal_entry_line_detail.entity.entity_ref.name
                                    })
                                }
                            }
                        }),
                    ...(line.journal_entry_line_detail.tax_inclusive_amt && {
                        TaxInclusiveAmt: line.journal_entry_line_detail.tax_inclusive_amt
                    }),
                    ...(line.journal_entry_line_detail.class_ref && {
                        ClassRef: {
                            value: line.journal_entry_line_detail.class_ref.value,
                            ...(line.journal_entry_line_detail.class_ref.name && {
                                name: line.journal_entry_line_detail.class_ref.name
                            })
                        }
                    }),
                    ...(line.journal_entry_line_detail.department_ref && {
                        DepartmentRef: {
                            value: line.journal_entry_line_detail.department_ref.value,
                            ...(line.journal_entry_line_detail.department_ref.name && {
                                name: line.journal_entry_line_detail.department_ref.name
                            })
                        }
                    }),
                    ...(line.journal_entry_line_detail.tax_code_ref && {
                        TaxCodeRef: {
                            value: line.journal_entry_line_detail.tax_code_ref.value,
                            ...(line.journal_entry_line_detail.tax_code_ref.name && {
                                name: line.journal_entry_line_detail.tax_code_ref.name
                            })
                        }
                    }),
                    ...(line.journal_entry_line_detail.billable_status && {
                        BillableStatus: line.journal_entry_line_detail.billable_status
                    }),
                    ...(line.journal_entry_line_detail.tax_amount && {
                        TaxAmount: line.journal_entry_line_detail.tax_amount
                    }),
                    ...(line.journal_entry_line_detail.journal_code_ref && {
                        JournalCodeRef: {
                            value: line.journal_entry_line_detail.journal_code_ref.value,
                            ...(line.journal_entry_line_detail.journal_code_ref.name && {
                                name: line.journal_entry_line_detail.journal_code_ref.name
                            })
                        }
                    })
                }
            };
            return mappedLine;
        }),
        ...(input.currency_ref && {
            CurrencyRef: {
                value: input.currency_ref.value,
                ...(input.currency_ref.name && { name: input.currency_ref.name })
            }
        }),
        ...(input.journal_code_ref && {
            JournalCodeRef: {
                value: input.journal_code_ref.value,
                ...(input.journal_code_ref.name && { name: input.journal_code_ref.name })
            }
        })
    };

    return quickBooksJournalEntry;
}

export function toQuickBooksJournalEntriesUpdate(input: UpdateJournalEntry): Partial<QuickBooksJournalEntry> {
    const quickBooksJournalEntry: Partial<QuickBooksJournalEntry> = {
        Id: input.id,
        SyncToken: input.sync_token,
        sparse: input.sparse ?? true,
        Line:
            input.line_items?.map((line) => {
                const mappedLine: QuickBooksJournalLine = {
                    ...(line.id && { Id: line.id }),
                    DetailType: line.detail_type,
                    ...(line.amount && { Amount: line.amount }),
                    ...(line.description && { Description: line.description }),
                    ...(line.line_num && { LineNum: line.line_num }),
                    ...(line.project_ref && {
                        ProjectRef: {
                            value: line.project_ref.value,
                            ...(line.project_ref.name && { name: line.project_ref.name })
                        }
                    }),
                    JournalEntryLineDetail: {
                        PostingType: line.journal_entry_line_detail.posting_type,
                        AccountRef: {
                            value: line.journal_entry_line_detail.account_ref.value,
                            ...(line.journal_entry_line_detail.account_ref.name && {
                                name: line.journal_entry_line_detail.account_ref.name
                            })
                        },
                        ...(line.journal_entry_line_detail.tax_applicable_on && {
                            TaxApplicableOn: line.journal_entry_line_detail.tax_applicable_on
                        }),
                        ...(line.journal_entry_line_detail.entity && {
                            Entity: {
                                ...(line.journal_entry_line_detail.entity.type && {
                                    Type: line.journal_entry_line_detail.entity.type
                                }),
                                ...(line.journal_entry_line_detail.entity.entity_ref && {
                                    EntityRef: {
                                        value: line.journal_entry_line_detail.entity.entity_ref.value,
                                        ...(line.journal_entry_line_detail.entity.entity_ref.name && {
                                            name: line.journal_entry_line_detail.entity.entity_ref.name
                                        })
                                    }
                                })
                            }
                        }),
                        ...(line.journal_entry_line_detail.tax_inclusive_amt && {
                            TaxInclusiveAmt: line.journal_entry_line_detail.tax_inclusive_amt
                        }),
                        ...(line.journal_entry_line_detail.class_ref && {
                            ClassRef: {
                                value: line.journal_entry_line_detail.class_ref.value,
                                ...(line.journal_entry_line_detail.class_ref.name && {
                                    name: line.journal_entry_line_detail.class_ref.name
                                })
                            }
                        }),
                        ...(line.journal_entry_line_detail.department_ref && {
                            DepartmentRef: {
                                value: line.journal_entry_line_detail.department_ref.value,
                                ...(line.journal_entry_line_detail.department_ref.name && {
                                    name: line.journal_entry_line_detail.department_ref.name
                                })
                            }
                        }),
                        ...(line.journal_entry_line_detail.tax_code_ref && {
                            TaxCodeRef: {
                                value: line.journal_entry_line_detail.tax_code_ref.value,
                                ...(line.journal_entry_line_detail.tax_code_ref.name && {
                                    name: line.journal_entry_line_detail.tax_code_ref.name
                                })
                            }
                        }),
                        ...(line.journal_entry_line_detail.billable_status && {
                            BillableStatus: line.journal_entry_line_detail.billable_status
                        }),
                        ...(line.journal_entry_line_detail.tax_amount && {
                            TaxAmount: line.journal_entry_line_detail.tax_amount
                        }),
                        ...(line.journal_entry_line_detail.journal_code_ref && {
                            JournalCodeRef: {
                                value: line.journal_entry_line_detail.journal_code_ref.value,
                                ...(line.journal_entry_line_detail.journal_code_ref.name && {
                                    name: line.journal_entry_line_detail.journal_code_ref.name
                                })
                            }
                        })
                    }
                };
                return mappedLine;
            }) || [],
        ...(input.currency_ref && {
            CurrencyRef: {
                value: input.currency_ref.value,
                ...(input.currency_ref.name && { name: input.currency_ref.name })
            }
        }),
        ...(input.global_tax_calculation && { GlobalTaxCalculation: input.global_tax_calculation }),
        ...(input.doc_number && { DocNumber: input.doc_number }),
        ...(input.private_note && { PrivateNote: input.private_note }),
        ...(input.exchange_rate && { ExchangeRate: input.exchange_rate }),
        ...(input.transaction_location_type && { TransactionLocationType: input.transaction_location_type }),
        ...(input.txn_tax_detail && {
            TxnTaxDetail: {
                ...(input.txn_tax_detail.txn_tax_code_ref && {
                    TxnTaxCodeRef: {
                        value: input.txn_tax_detail.txn_tax_code_ref.value,
                        ...(input.txn_tax_detail.txn_tax_code_ref.name && {
                            name: input.txn_tax_detail.txn_tax_code_ref.name
                        })
                    }
                }),
                ...(input.txn_tax_detail.total_tax && { TotalTax: input.txn_tax_detail.total_tax }),
                ...(input.txn_tax_detail.tax_line && {
                    TaxLine: input.txn_tax_detail.tax_line.map((taxLine) => ({
                        DetailType: taxLine.detail_type,
                        ...(taxLine.tax_line_detail && {
                            TaxLineDetail: {
                                ...(taxLine.tax_line_detail.tax_rate_ref && {
                                    TaxRateRef: {
                                        value: taxLine.tax_line_detail.tax_rate_ref.value,
                                        ...(taxLine.tax_line_detail.tax_rate_ref.name && {
                                            name: taxLine.tax_line_detail.tax_rate_ref.name
                                        })
                                    }
                                }),
                                ...(taxLine.tax_line_detail.net_amount_taxable && {
                                    NetAmountTaxable: taxLine.tax_line_detail.net_amount_taxable
                                }),
                                ...(taxLine.tax_line_detail.percent_based && {
                                    PercentBased: taxLine.tax_line_detail.percent_based
                                }),
                                ...(taxLine.tax_line_detail.tax_percent && {
                                    TaxPercent: taxLine.tax_line_detail.tax_percent
                                })
                            }
                        }),
                        ...(taxLine.amount && { Amount: taxLine.amount })
                    }))
                })
            }
        }),
        ...(input.adjustment !== undefined && { Adjustment: input.adjustment })
    };

    return quickBooksJournalEntry;
}
