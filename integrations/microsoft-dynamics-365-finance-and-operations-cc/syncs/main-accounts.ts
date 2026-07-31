import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderRecordSchema = z.object({}).passthrough();

const MainAccountSchema = z.object({
    id: z.string(),
    chartOfAccounts: z.string().optional(),
    mainAccountId: z.string().optional(),
    name: z.string().optional(),
    mainAccountType: z.string().optional(),
    debitCreditRequirement: z.string().optional(),
    currencyCode: z.string().optional(),
    accountCategory: z.string().optional(),
    accountCategoryRef: z.string().optional(),
    accountCategoryDescription: z.string().optional(),
    openingAccountForYearEnd: z.string().optional(),
    closingAccountForYearEnd: z.string().optional(),
    fixedDimensions: z.string().optional(),
    defaultDimensions: z.string().optional(),
    offsetAccount: z.string().optional(),
    searchText: z.string().optional(),
    doNotAllowManualEntry: z.string().optional(),
    suspenseAccount: z.string().optional(),
    exchangeRateType: z.string().optional(),
    chartOfAccountsName: z.string().optional(),
    chartOfAccountsDescription: z.string().optional(),
    financialDimensionFormat: z.string().optional(),
    parentMainAccount: z.string().optional(),
    parentMainAccountDisplayValue: z.string().optional(),
    doNotAllowDivisionOfAccount: z.string().optional(),
    postingType: z.string().optional(),
    mainAccountTypeDisplayValue: z.string().optional(),
    accountCategoryDisplayValue: z.string().optional(),
    debitCreditRequirementDisplayValue: z.string().optional(),
    accountCategoryRefDisplayValue: z.string().optional(),
    openingAccountForYearEndDisplayValue: z.string().optional(),
    closingAccountForYearEndDisplayValue: z.string().optional(),
    parentMainAccountId: z.string().optional(),
    dataAreaId: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync general ledger main accounts',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        MainAccount: MainAccountSchema
    },

    exec: async (nango) => {
        // Blocker: MainAccounts exposes no reliable modified-timestamp filter
        // in this environment, so full refresh with delete tracking is required.
        // Persist the current $skip offset so a long crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/MainAccounts',
            params: {
                $orderby: 'ChartOfAccounts asc,MainAccountId asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!trackingStarted) {
                await nango.trackDeletesStart('MainAccount');
                trackingStarted = true;
            }

            const accounts = page.map((record) => {
                const parsed = ProviderRecordSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse MainAccount record: ${parsed.error.message}`);
                }

                const raw = parsed.data;
                const chartOfAccounts = typeof raw['ChartOfAccounts'] === 'string' ? raw['ChartOfAccounts'] : '';
                const mainAccountId = typeof raw['MainAccountId'] === 'string' ? raw['MainAccountId'] : '';
                const id = `${chartOfAccounts}|${mainAccountId}`;

                return {
                    id,
                    ...(typeof raw['ChartOfAccounts'] === 'string' && { chartOfAccounts: raw['ChartOfAccounts'] }),
                    ...(typeof raw['MainAccountId'] === 'string' && { mainAccountId: raw['MainAccountId'] }),
                    ...(typeof raw['Name'] === 'string' && { name: raw['Name'] }),
                    ...(typeof raw['MainAccountType'] === 'string' && { mainAccountType: raw['MainAccountType'] }),
                    ...(typeof raw['DebitCreditRequirement'] === 'string' && { debitCreditRequirement: raw['DebitCreditRequirement'] }),
                    ...(typeof raw['CurrencyCode'] === 'string' && { currencyCode: raw['CurrencyCode'] }),
                    ...(typeof raw['AccountCategory'] === 'string' && { accountCategory: raw['AccountCategory'] }),
                    ...(typeof raw['AccountCategoryRef'] === 'string' && { accountCategoryRef: raw['AccountCategoryRef'] }),
                    ...(typeof raw['AccountCategoryDescription'] === 'string' && { accountCategoryDescription: raw['AccountCategoryDescription'] }),
                    ...(typeof raw['OpeningAccountForYearEnd'] === 'string' && { openingAccountForYearEnd: raw['OpeningAccountForYearEnd'] }),
                    ...(typeof raw['ClosingAccountForYearEnd'] === 'string' && { closingAccountForYearEnd: raw['ClosingAccountForYearEnd'] }),
                    ...(typeof raw['FixedDimensions'] === 'string' && { fixedDimensions: raw['FixedDimensions'] }),
                    ...(typeof raw['DefaultDimensions'] === 'string' && { defaultDimensions: raw['DefaultDimensions'] }),
                    ...(typeof raw['OffsetAccount'] === 'string' && { offsetAccount: raw['OffsetAccount'] }),
                    ...(typeof raw['SearchText'] === 'string' && { searchText: raw['SearchText'] }),
                    ...(typeof raw['DoNotAllowManualEntry'] === 'string' && { doNotAllowManualEntry: raw['DoNotAllowManualEntry'] }),
                    ...(typeof raw['SuspenseAccount'] === 'string' && { suspenseAccount: raw['SuspenseAccount'] }),
                    ...(typeof raw['ExchangeRateType'] === 'string' && { exchangeRateType: raw['ExchangeRateType'] }),
                    ...(typeof raw['ChartOfAccountsName'] === 'string' && { chartOfAccountsName: raw['ChartOfAccountsName'] }),
                    ...(typeof raw['ChartOfAccountsDescription'] === 'string' && { chartOfAccountsDescription: raw['ChartOfAccountsDescription'] }),
                    ...(typeof raw['FinancialDimensionFormat'] === 'string' && { financialDimensionFormat: raw['FinancialDimensionFormat'] }),
                    ...(typeof raw['ParentMainAccount'] === 'string' && { parentMainAccount: raw['ParentMainAccount'] }),
                    ...(typeof raw['ParentMainAccountDisplayValue'] === 'string' && { parentMainAccountDisplayValue: raw['ParentMainAccountDisplayValue'] }),
                    ...(typeof raw['DoNotAllowDivisionOfAccount'] === 'string' && { doNotAllowDivisionOfAccount: raw['DoNotAllowDivisionOfAccount'] }),
                    ...(typeof raw['PostingType'] === 'string' && { postingType: raw['PostingType'] }),
                    ...(typeof raw['MainAccountTypeDisplayValue'] === 'string' && { mainAccountTypeDisplayValue: raw['MainAccountTypeDisplayValue'] }),
                    ...(typeof raw['AccountCategoryDisplayValue'] === 'string' && { accountCategoryDisplayValue: raw['AccountCategoryDisplayValue'] }),
                    ...(typeof raw['DebitCreditRequirementDisplayValue'] === 'string' && {
                        debitCreditRequirementDisplayValue: raw['DebitCreditRequirementDisplayValue']
                    }),
                    ...(typeof raw['AccountCategoryRefDisplayValue'] === 'string' && { accountCategoryRefDisplayValue: raw['AccountCategoryRefDisplayValue'] }),
                    ...(typeof raw['OpeningAccountForYearEndDisplayValue'] === 'string' && {
                        openingAccountForYearEndDisplayValue: raw['OpeningAccountForYearEndDisplayValue']
                    }),
                    ...(typeof raw['ClosingAccountForYearEndDisplayValue'] === 'string' && {
                        closingAccountForYearEndDisplayValue: raw['ClosingAccountForYearEndDisplayValue']
                    }),
                    ...(typeof raw['ParentMainAccountId'] === 'string' && { parentMainAccountId: raw['ParentMainAccountId'] }),
                    ...(typeof raw['dataAreaId'] === 'string' && { dataAreaId: raw['dataAreaId'] })
                };
            });

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'MainAccount');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('MainAccount');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
