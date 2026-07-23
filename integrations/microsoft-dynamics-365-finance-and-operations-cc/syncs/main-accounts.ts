import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMainAccountSchema = z.object({
    ChartOfAccounts: z.string().optional(),
    MainAccountId: z.string().optional(),
    MainAccountRecId: z.number(),
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

        if (skip === 0) {
            await nango.trackDeletesStart('MainAccount');
        }

        let hasMore = true;
        const limit = 100;

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
                    ...(data.ChartOfAccounts !== undefined && { ChartOfAccounts: data.ChartOfAccounts }),
                    ...(data.MainAccountId !== undefined && { MainAccountId: data.MainAccountId }),
                    ...(data.MainAccountRecId !== undefined && { MainAccountRecId: data.MainAccountRecId }),
                    ...(data.SRUCode !== undefined && { SRUCode: data.SRUCode }),
                    ...(data.MainAccountType !== undefined && { MainAccountType: data.MainAccountType }),
                    ...(data.Name !== undefined && { Name: data.Name }),
                    ...(data.ReportingExchangeAdjustmentRateType !== undefined && {
                        ReportingExchangeAdjustmentRateType: data.ReportingExchangeAdjustmentRateType
                    }),
                    ...(data.User !== undefined && { User: data.User }),
                    ...(data.Closing !== undefined && { Closing: data.Closing }),
                    ...(data.AccountCategoryDescription !== undefined && { AccountCategoryDescription: data.AccountCategoryDescription }),
                    ...(data.ForeignCurrencyRevaluation !== undefined && { ForeignCurrencyRevaluation: data.ForeignCurrencyRevaluation }),
                    ...(data.InflationAdjustment !== undefined && { InflationAdjustment: data.InflationAdjustment }),
                    ...(data.OffsetAccountDisplayValue !== undefined && { OffsetAccountDisplayValue: data.OffsetAccountDisplayValue }),
                    ...(data.ParentMainAccountId !== undefined && { ParentMainAccountId: data.ParentMainAccountId }),
                    ...(data.FinancialReportingCurrencyTranslationType !== undefined && {
                        FinancialReportingCurrencyTranslationType: data.FinancialReportingCurrencyTranslationType
                    }),
                    ...(data.DefaultCurrency !== undefined && { DefaultCurrency: data.DefaultCurrency }),
                    ...(data.DebitCreditDefault !== undefined && { DebitCreditDefault: data.DebitCreditDefault }),
                    ...(data.ActiveTo !== undefined && { ActiveTo: data.ActiveTo }),
                    ...(data.MandatoryPaymentReference !== undefined && { MandatoryPaymentReference: data.MandatoryPaymentReference }),
                    ...(data.Monetary !== undefined && { Monetary: data.Monetary }),
                    ...(data.BalanceControl !== undefined && { BalanceControl: data.BalanceControl }),
                    ...(data.OpeningAccountId !== undefined && { OpeningAccountId: data.OpeningAccountId }),
                    ...(data.ValidatePostingType !== undefined && { ValidatePostingType: data.ValidatePostingType }),
                    ...(data.RepomoType !== undefined && { RepomoType: data.RepomoType }),
                    ...(data.ExchangeAdjustmentRateType !== undefined && { ExchangeAdjustmentRateType: data.ExchangeAdjustmentRateType }),
                    ...(data.IsSuspended !== undefined && { IsSuspended: data.IsSuspended }),
                    ...(data.AdjustmentMethod !== undefined && { AdjustmentMethod: data.AdjustmentMethod }),
                    ...(data.PostingType !== undefined && { PostingType: data.PostingType }),
                    ...(data.ChartOfAccountsRecId !== undefined && { ChartOfAccountsRecId: data.ChartOfAccountsRecId }),
                    ...(data.ValidateCurrency !== undefined && { ValidateCurrency: data.ValidateCurrency }),
                    ...(data.MainAccountCategory !== undefined && { MainAccountCategory: data.MainAccountCategory }),
                    ...(data.ReportingAccountType !== undefined && { ReportingAccountType: data.ReportingAccountType }),
                    ...(data.FinancialReportingExchangeRateType !== undefined && {
                        FinancialReportingExchangeRateType: data.FinancialReportingExchangeRateType
                    }),
                    ...(data.DefaultConsolidationAccount !== undefined && { DefaultConsolidationAccount: data.DefaultConsolidationAccount }),
                    ...(data.DoNotAllowManualEntry !== undefined && { DoNotAllowManualEntry: data.DoNotAllowManualEntry }),
                    ...(data.DebitCreditRequirement !== undefined && { DebitCreditRequirement: data.DebitCreditRequirement }),
                    ...(data.ValidateUser !== undefined && { ValidateUser: data.ValidateUser }),
                    ...(data.ActiveFrom !== undefined && { ActiveFrom: data.ActiveFrom }),
                    ...(data.NatureCode_BR !== undefined && { NatureCode_BR: data.NatureCode_BR })
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
        await nango.trackDeletesEnd('MainAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
