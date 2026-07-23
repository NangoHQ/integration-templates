import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMainAccountSchema = z.object({
    ChartOfAccounts: z.string().nullish(),
    MainAccountId: z.string().nullish(),
    MainAccountRecId: z.number(),
    SRUCode: z.string().nullish(),
    MainAccountType: z.string().nullish(),
    Name: z.string().nullish(),
    ReportingExchangeAdjustmentRateType: z.string().nullish(),
    User: z.string().nullish(),
    Closing: z.string().nullish(),
    AccountCategoryDescription: z.string().nullish(),
    ForeignCurrencyRevaluation: z.string().nullish(),
    InflationAdjustment: z.string().nullish(),
    OffsetAccountDisplayValue: z.string().nullish(),
    ParentMainAccountId: z.string().nullish(),
    FinancialReportingCurrencyTranslationType: z.string().nullish(),
    DefaultCurrency: z.string().nullish(),
    DebitCreditDefault: z.string().nullish(),
    ActiveTo: z.string().nullish(),
    MandatoryPaymentReference: z.string().nullish(),
    Monetary: z.string().nullish(),
    BalanceControl: z.string().nullish(),
    OpeningAccountId: z.string().nullish(),
    ValidatePostingType: z.string().nullish(),
    RepomoType: z.string().nullish(),
    ExchangeAdjustmentRateType: z.string().nullish(),
    IsSuspended: z.string().nullish(),
    AdjustmentMethod: z.string().nullish(),
    PostingType: z.string().nullish(),
    ChartOfAccountsRecId: z.number().optional(),
    ValidateCurrency: z.string().nullish(),
    MainAccountCategory: z.string().nullish(),
    ReportingAccountType: z.string().nullish(),
    FinancialReportingExchangeRateType: z.string().nullish(),
    DefaultConsolidationAccount: z.string().nullish(),
    DoNotAllowManualEntry: z.string().nullish(),
    DebitCreditRequirement: z.string().nullish(),
    ValidateUser: z.string().nullish(),
    ActiveFrom: z.string().nullish(),
    NatureCode_BR: z.string().nullish()
});

const MainAccountsResponseSchema = z.object({
    value: z.array(z.unknown())
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const MainAccountSchema = z.object({
    id: z.string(),
    ChartOfAccounts: z.string().optional(),
    MainAccountId: z.string().optional(),
    MainAccountRecId: z.number().optional(),
    SRUCode: z.string().optional(),
    MainAccountType: z.string().optional(),
    Name: z.string().optional(),
    ReportingExchangeAdjustmentRateType: z.string().optional(),
    User: z.string().optional(),
    Closing: z.string().optional(),
    AccountCategoryDescription: z.string().optional(),
    ForeignCurrencyRevaluation: z.string().optional(),
    InflationAdjustment: z.string().optional(),
    OffsetAccountDisplayValue: z.string().optional(),
    ParentMainAccountId: z.string().optional(),
    FinancialReportingCurrencyTranslationType: z.string().optional(),
    DefaultCurrency: z.string().optional(),
    DebitCreditDefault: z.string().optional(),
    ActiveTo: z.string().optional(),
    MandatoryPaymentReference: z.string().optional(),
    Monetary: z.string().optional(),
    BalanceControl: z.string().optional(),
    OpeningAccountId: z.string().optional(),
    ValidatePostingType: z.string().optional(),
    RepomoType: z.string().optional(),
    ExchangeAdjustmentRateType: z.string().optional(),
    IsSuspended: z.string().optional(),
    AdjustmentMethod: z.string().optional(),
    PostingType: z.string().optional(),
    ChartOfAccountsRecId: z.number().optional(),
    ValidateCurrency: z.string().optional(),
    MainAccountCategory: z.string().optional(),
    ReportingAccountType: z.string().optional(),
    FinancialReportingExchangeRateType: z.string().optional(),
    DefaultConsolidationAccount: z.string().optional(),
    DoNotAllowManualEntry: z.string().optional(),
    DebitCreditRequirement: z.string().optional(),
    ValidateUser: z.string().optional(),
    ActiveFrom: z.string().optional(),
    NatureCode_BR: z.string().optional()
});

const sync = createSync({
    description: 'Sync general ledger main accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MainAccount: MainAccountSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        let hasMore = true;
        const limit = 100;
        let trackingStarted = false;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
                endpoint: '/data/MainAccounts',
                params: {
                    $top: limit,
                    $skip: skip,
                    $orderby: 'MainAccountRecId asc'
                },
                retries: 3
            };

            const response = await nango.get(proxyConfig);
            const parsedResponse = MainAccountsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse MainAccounts response: ${parsedResponse.error.message}`);
            }

            if (!trackingStarted) {
                await nango.trackDeletesStart('MainAccount');
                trackingStarted = true;
            }

            const page = parsedResponse.data.value;
            if (page.length === 0) {
                hasMore = false;
                break;
            }

            const mainAccounts = page.map((record: unknown) => {
                const parsed = ProviderMainAccountSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse MainAccount: ${parsed.error.message}`);
                }

                const data = parsed.data;

                return {
                    id: String(data.MainAccountRecId),
                    ...(data.ChartOfAccounts != null && { ChartOfAccounts: data.ChartOfAccounts }),
                    ...(data.MainAccountId != null && { MainAccountId: data.MainAccountId }),
                    ...(data.MainAccountRecId !== undefined && { MainAccountRecId: data.MainAccountRecId }),
                    ...(data.SRUCode != null && { SRUCode: data.SRUCode }),
                    ...(data.MainAccountType != null && { MainAccountType: data.MainAccountType }),
                    ...(data.Name != null && { Name: data.Name }),
                    ...(data.ReportingExchangeAdjustmentRateType != null && {
                        ReportingExchangeAdjustmentRateType: data.ReportingExchangeAdjustmentRateType
                    }),
                    ...(data.User != null && { User: data.User }),
                    ...(data.Closing != null && { Closing: data.Closing }),
                    ...(data.AccountCategoryDescription != null && { AccountCategoryDescription: data.AccountCategoryDescription }),
                    ...(data.ForeignCurrencyRevaluation != null && { ForeignCurrencyRevaluation: data.ForeignCurrencyRevaluation }),
                    ...(data.InflationAdjustment != null && { InflationAdjustment: data.InflationAdjustment }),
                    ...(data.OffsetAccountDisplayValue != null && { OffsetAccountDisplayValue: data.OffsetAccountDisplayValue }),
                    ...(data.ParentMainAccountId != null && { ParentMainAccountId: data.ParentMainAccountId }),
                    ...(data.FinancialReportingCurrencyTranslationType != null && {
                        FinancialReportingCurrencyTranslationType: data.FinancialReportingCurrencyTranslationType
                    }),
                    ...(data.DefaultCurrency != null && { DefaultCurrency: data.DefaultCurrency }),
                    ...(data.DebitCreditDefault != null && { DebitCreditDefault: data.DebitCreditDefault }),
                    ...(data.ActiveTo != null && { ActiveTo: data.ActiveTo }),
                    ...(data.MandatoryPaymentReference != null && { MandatoryPaymentReference: data.MandatoryPaymentReference }),
                    ...(data.Monetary != null && { Monetary: data.Monetary }),
                    ...(data.BalanceControl != null && { BalanceControl: data.BalanceControl }),
                    ...(data.OpeningAccountId != null && { OpeningAccountId: data.OpeningAccountId }),
                    ...(data.ValidatePostingType != null && { ValidatePostingType: data.ValidatePostingType }),
                    ...(data.RepomoType != null && { RepomoType: data.RepomoType }),
                    ...(data.ExchangeAdjustmentRateType != null && { ExchangeAdjustmentRateType: data.ExchangeAdjustmentRateType }),
                    ...(data.IsSuspended != null && { IsSuspended: data.IsSuspended }),
                    ...(data.AdjustmentMethod != null && { AdjustmentMethod: data.AdjustmentMethod }),
                    ...(data.PostingType != null && { PostingType: data.PostingType }),
                    ...(data.ChartOfAccountsRecId !== undefined && { ChartOfAccountsRecId: data.ChartOfAccountsRecId }),
                    ...(data.ValidateCurrency != null && { ValidateCurrency: data.ValidateCurrency }),
                    ...(data.MainAccountCategory != null && { MainAccountCategory: data.MainAccountCategory }),
                    ...(data.ReportingAccountType != null && { ReportingAccountType: data.ReportingAccountType }),
                    ...(data.FinancialReportingExchangeRateType != null && {
                        FinancialReportingExchangeRateType: data.FinancialReportingExchangeRateType
                    }),
                    ...(data.DefaultConsolidationAccount != null && { DefaultConsolidationAccount: data.DefaultConsolidationAccount }),
                    ...(data.DoNotAllowManualEntry != null && { DoNotAllowManualEntry: data.DoNotAllowManualEntry }),
                    ...(data.DebitCreditRequirement != null && { DebitCreditRequirement: data.DebitCreditRequirement }),
                    ...(data.ValidateUser != null && { ValidateUser: data.ValidateUser }),
                    ...(data.ActiveFrom != null && { ActiveFrom: data.ActiveFrom }),
                    ...(data.NatureCode_BR != null && { NatureCode_BR: data.NatureCode_BR })
                };
            });

            if (mainAccounts.length > 0) {
                await nango.batchSave(mainAccounts, 'MainAccount');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });

            if (page.length < limit) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('MainAccount');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
