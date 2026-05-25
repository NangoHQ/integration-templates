import { vi, expect, it, describe, beforeEach } from 'vitest';

import createSync from '../syncs/job-profiles.js';
import soap from 'soap';

describe('workday job-profiles tests', () => {
    const models = 'JobProfile'.split(',');

    const createTestContext = () => {
        const nangoMock = new global.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'job-profiles',
            Model: 'JobProfile'
        });

        return {
            nangoMock,
            batchSaveSpy: vi.spyOn(nangoMock, 'batchSave')
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should get, map correctly the data and batchSave the result', async () => {
        const { nangoMock, batchSaveSpy } = createTestContext();

        // Mock the connection data
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test@tenant',
                password: 'testpass'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test'
            }
        } as any);

        // Create mock SOAP client that returns job profiles matching fixture structure
        const generateMockJobProfiles = () => {
            // Generate 299 job profiles like the real API response (mostly empty names)
            const profiles = [];
            const ids = [
                '25000',
                '26000',
                '27000',
                '28000',
                '24000',
                '23000',
                '30100',
                '30200',
                '30300',
                '30400',
                '30150',
                '30250',
                '30350',
                '30450',
                '30110',
                '30500',
                '30310',
                '30210',
                '30410',
                '30550',
                '30510',
                '34100',
                '34110',
                '34120',
                '34130',
                '37110',
                '35100',
                '36100',
                '37100',
                '38100',
                '37120',
                '29000',
                '35000',
                '39100',
                '39200',
                '39300',
                '36120',
                '36110',
                '35110',
                '35120',
                '35121',
                '35111',
                '35122',
                '39050',
                '39150',
                '39115',
                '39145',
                '39125',
                '39180',
                '38500',
                '39500',
                '39510',
                '39560',
                '39610',
                '35750',
                '37650',
                '37780',
                '38600',
                '38700',
                '38550',
                '38850',
                '38950',
                '39875',
                '38955',
                '38520',
                '39250',
                '39260',
                '40000',
                '40100',
                '40200',
                '39855',
                '39885',
                '21000',
                '39255',
                '39045',
                '39025',
                '37525',
                '38405',
                '37980',
                '39160',
                '39895',
                '39905',
                '35225',
                '35113',
                '37950',
                '39620',
                '35140',
                '35180',
                '39035',
                '38420',
                '38410',
                '37485',
                '33200',
                '35850',
                '45100',
                '40300',
                '45300',
                '45500',
                '45700',
                '45200',
                '45400',
                'FS001',
                '37900',
                '30460',
                '37600',
                '37130',
                '9120',
                '9130',
                '9100',
                '9110',
                '30260',
                '50100',
                '50200',
                '50300',
                '50400',
                '50500',
                '39054',
                '37140',
                '38415',
                '38419',
                '40210',
                '38450',
                '38430',
                '37486',
                'wd_consultant_008',
                'R-00042',
                'R-00043',
                'R-00044',
                'R-00045',
                'R-00046',
                'R-00047',
                'CEO',
                'Sales-Business Development',
                'SALES ADMIN ASSISTANCE',
                'IMPLEMENTATION SPECIALIST',
                'Logistics Manager',
                'Test Engineer',
                'IMPLEMENTATION LEAD',
                'Technical Support',
                'Sales Account Executive',
                'Hardware Support',
                'HR',
                'Development Manager',
                'Development Engineer',
                'Graphic Designer',
                'Intern',
                'Account Executive',
                'VP Business Development -Engineering',
                'Support Technician',
                'Tech Support ZK Access',
                'Sales Latin America',
                'VP of Sales',
                'software Architect',
                'Software Developer',
                'R-00048',
                'R-00049',
                'Mango_executive',
                'MANGO_CXO',
                'MANGO_MANAGER',
                'R-00050',
                'R-00051',
                'R-00052',
                'R-00053',
                'R-00054',
                'R-00055',
                'R-00056',
                'R-00057',
                'R-00058',
                'R-00059',
                'R-00060',
                'R-00061',
                'R-00062',
                'R-00063',
                'CEO_PROFILE',
                'SNOW EVP',
                'CONTRACTOR',
                'SNOW VICE PRESIDENT',
                'SNOW DIRECTOR',
                'SN MANAGER',
                'SNOW SUPERVISOR',
                'SNOW WORKDAY CONSULTATANT',
                'R-00064',
                'R-00065',
                'R-00066',
                'R-00067',
                'R-00068',
                'R-00069',
                'R-00073',
                'SI-1',
                'SI2',
                'SI-2',
                'SI-3',
                'R-00081',
                'SI-5',
                'SI-7',
                'SI-8',
                'SI-9',
                'SI-10',
                'SIS-2',
                'R-00086',
                'R-00087',
                'R-00088',
                'R-00089',
                'R-00090',
                'R-00091',
                'R-00095',
                'R-00092',
                'R-00096',
                'LOR-01',
                'Lor-2',
                'Lor-3',
                'Lor-4',
                'Lor-5',
                'Lor-6',
                'lor-7',
                'Lor-1-1',
                'R-00102',
                'R-00103',
                'R-00117',
                'R-00120',
                'R-00121',
                'Net2Apps001',
                'Net2Apps0002',
                'Net2Apps0003',
                'Net2Apps0004',
                'Net2Apps0005',
                'Net2Apps0006',
                'Net2Apps0007',
                'Net2Apps0008',
                'Net2Apps0009',
                'L2',
                'L3',
                'L4',
                'L5',
                'L6',
                'L7',
                'L8',
                'L9',
                'Test_DCS_01',
                'PM001',
                'SPM 002',
                'R-00199',
                'R-00200',
                'R-00205',
                'R-00206',
                'ML003',
                'R-00273',
                'R-00277',
                'R-00354',
                'R-00429',
                'R-00430',
                'R-00431',
                'R-00432',
                'R-00433',
                'R-00434',
                'R-00435',
                'R-00436',
                'R-00437',
                'R-00438',
                'R-00484',
                'R-00491',
                'WDAYINTD',
                'R-00546',
                'R-00548',
                'R-00561',
                'sym001',
                'SIGMA001',
                'DG001',
                'R-00577',
                '003',
                '008',
                '001',
                '002',
                '004',
                '005',
                '006',
                '007',
                'R-00619',
                'R-00626',
                'R-00627',
                'R-00629',
                'R-00630',
                'R-00631',
                'R-00632',
                'R-00639',
                'R-00676',
                'R-00677',
                'R-00678',
                '6254',
                'R-00720',
                'ABS_MD_001',
                'ABS_JP_003',
                'ABS_JP_007',
                'ABS_CEO_002',
                'ABS_JP_004',
                'ABS_JP_005',
                'ABS_JP_006',
                'ABS_JP_008',
                'ABS_V_001'
            ];

            for (const id of ids) {
                profiles.push({
                    Job_Profile_Reference: {
                        ID: [
                            { attributes: { 'wd:type': 'WID' }, $value: `wid_${id}` },
                            { attributes: { 'wd:type': 'Job_Profile_ID' }, $value: id }
                        ]
                    },
                    Job_Profile_Data: {
                        Job_Profile_Name: '',
                        Active: '1'
                    }
                });
            }
            return profiles;
        };

        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_Job_ProfilesAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Total_Pages: 1,
                        Page: 1
                    },
                    Response_Data: {
                        Job_Profile: generateMockJobProfiles()
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);

        await createSync.exec(nangoMock);

        for (const model of models) {
            const expectedBatchSaveData = await nangoMock.getBatchSaveData(model);

            const spiedData = batchSaveSpy.mock.calls.flatMap((call) => {
                if (call[1] === model) {
                    return call[0];
                }

                return [];
            });

            // Normalize spy-captured args into plain JSON so they compare cleanly
            // with fixture data loaded from `*.test.json`.
            // Removes things like prototypes, undefined values and other non-serializable data.
            const spied = JSON.parse(JSON.stringify(spiedData));

            expect(spied).toStrictEqual(expectedBatchSaveData);
        }
    });

    it('should get, map correctly the data and batchDelete the result', async () => {
        const { nangoMock } = createTestContext();
        const batchDeleteSpy = vi.spyOn(nangoMock, 'batchDelete');

        // Mock the connection data
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
            credentials: {
                type: 'BASIC',
                username: 'test@tenant',
                password: 'testpass'
            },
            connection_config: {
                hostname: 'test.workday.com',
                tenant: 'test'
            }
        } as any);

        // Create mock SOAP client that returns job profiles matching fixture structure
        const generateMockJobProfiles = () => {
            // Generate 299 job profiles like the real API response (mostly empty names)
            const profiles = [];
            const ids = [
                '25000',
                '26000',
                '27000',
                '28000',
                '24000',
                '23000',
                '30100',
                '30200',
                '30300',
                '30400',
                '30150',
                '30250',
                '30350',
                '30450',
                '30110',
                '30500',
                '30310',
                '30210',
                '30410',
                '30550',
                '30510',
                '34100',
                '34110',
                '34120',
                '34130',
                '37110',
                '35100',
                '36100',
                '37100',
                '38100',
                '37120',
                '29000',
                '35000',
                '39100',
                '39200',
                '39300',
                '36120',
                '36110',
                '35110',
                '35120',
                '35121',
                '35111',
                '35122',
                '39050',
                '39150',
                '39115',
                '39145',
                '39125',
                '39180',
                '38500',
                '39500',
                '39510',
                '39560',
                '39610',
                '35750',
                '37650',
                '37780',
                '38600',
                '38700',
                '38550',
                '38850',
                '38950',
                '39875',
                '38955',
                '38520',
                '39250',
                '39260',
                '40000',
                '40100',
                '40200',
                '39855',
                '39885',
                '21000',
                '39255',
                '39045',
                '39025',
                '37525',
                '38405',
                '37980',
                '39160',
                '39895',
                '39905',
                '35225',
                '35113',
                '37950',
                '39620',
                '35140',
                '35180',
                '39035',
                '38420',
                '38410',
                '37485',
                '33200',
                '35850',
                '45100',
                '40300',
                '45300',
                '45500',
                '45700',
                '45200',
                '45400',
                'FS001',
                '37900',
                '30460',
                '37600',
                '37130',
                '9120',
                '9130',
                '9100',
                '9110',
                '30260',
                '50100',
                '50200',
                '50300',
                '50400',
                '50500',
                '39054',
                '37140',
                '38415',
                '38419',
                '40210',
                '38450',
                '38430',
                '37486',
                'wd_consultant_008',
                'R-00042',
                'R-00043',
                'R-00044',
                'R-00045',
                'R-00046',
                'R-00047',
                'CEO',
                'Sales-Business Development',
                'SALES ADMIN ASSISTANCE',
                'IMPLEMENTATION SPECIALIST',
                'Logistics Manager',
                'Test Engineer',
                'IMPLEMENTATION LEAD',
                'Technical Support',
                'Sales Account Executive',
                'Hardware Support',
                'HR',
                'Development Manager',
                'Development Engineer',
                'Graphic Designer',
                'Intern',
                'Account Executive',
                'VP Business Development -Engineering',
                'Support Technician',
                'Tech Support ZK Access',
                'Sales Latin America',
                'VP of Sales',
                'software Architect',
                'Software Developer',
                'R-00048',
                'R-00049',
                'Mango_executive',
                'MANGO_CXO',
                'MANGO_MANAGER',
                'R-00050',
                'R-00051',
                'R-00052',
                'R-00053',
                'R-00054',
                'R-00055',
                'R-00056',
                'R-00057',
                'R-00058',
                'R-00059',
                'R-00060',
                'R-00061',
                'R-00062',
                'R-00063',
                'CEO_PROFILE',
                'SNOW EVP',
                'CONTRACTOR',
                'SNOW VICE PRESIDENT',
                'SNOW DIRECTOR',
                'SN MANAGER',
                'SNOW SUPERVISOR',
                'SNOW WORKDAY CONSULTATANT',
                'R-00064',
                'R-00065',
                'R-00066',
                'R-00067',
                'R-00068',
                'R-00069',
                'R-00073',
                'SI-1',
                'SI2',
                'SI-2',
                'SI-3',
                'R-00081',
                'SI-5',
                'SI-7',
                'SI-8',
                'SI-9',
                'SI-10',
                'SIS-2',
                'R-00086',
                'R-00087',
                'R-00088',
                'R-00089',
                'R-00090',
                'R-00091',
                'R-00095',
                'R-00092',
                'R-00096',
                'LOR-01',
                'Lor-2',
                'Lor-3',
                'Lor-4',
                'Lor-5',
                'Lor-6',
                'lor-7',
                'Lor-1-1',
                'R-00102',
                'R-00103',
                'R-00117',
                'R-00120',
                'R-00121',
                'Net2Apps001',
                'Net2Apps0002',
                'Net2Apps0003',
                'Net2Apps0004',
                'Net2Apps0005',
                'Net2Apps0006',
                'Net2Apps0007',
                'Net2Apps0008',
                'Net2Apps0009',
                'L2',
                'L3',
                'L4',
                'L5',
                'L6',
                'L7',
                'L8',
                'L9',
                'Test_DCS_01',
                'PM001',
                'SPM 002',
                'R-00199',
                'R-00200',
                'R-00205',
                'R-00206',
                'ML003',
                'R-00273',
                'R-00277',
                'R-00354',
                'R-00429',
                'R-00430',
                'R-00431',
                'R-00432',
                'R-00433',
                'R-00434',
                'R-00435',
                'R-00436',
                'R-00437',
                'R-00438',
                'R-00484',
                'R-00491',
                'WDAYINTD',
                'R-00546',
                'R-00548',
                'R-00561',
                'sym001',
                'SIGMA001',
                'DG001',
                'R-00577',
                '003',
                '008',
                '001',
                '002',
                '004',
                '005',
                '006',
                '007',
                'R-00619',
                'R-00626',
                'R-00627',
                'R-00629',
                'R-00630',
                'R-00631',
                'R-00632',
                'R-00639',
                'R-00676',
                'R-00677',
                'R-00678',
                '6254',
                'R-00720',
                'ABS_MD_001',
                'ABS_JP_003',
                'ABS_JP_007',
                'ABS_CEO_002',
                'ABS_JP_004',
                'ABS_JP_005',
                'ABS_JP_006',
                'ABS_JP_008',
                'ABS_V_001'
            ];

            for (const id of ids) {
                profiles.push({
                    Job_Profile_Reference: {
                        ID: [
                            { attributes: { 'wd:type': 'WID' }, $value: `wid_${id}` },
                            { attributes: { 'wd:type': 'Job_Profile_ID' }, $value: id }
                        ]
                    },
                    Job_Profile_Data: {
                        Job_Profile_Name: '',
                        Active: '1'
                    }
                });
            }
            return profiles;
        };

        const mockClient = {
            addHttpHeader: vi.fn(),
            setSecurity: vi.fn(),
            setEndpoint: vi.fn(),
            Get_Job_ProfilesAsync: vi.fn().mockResolvedValue([
                {
                    Response_Results: {
                        Total_Pages: 1,
                        Page: 1
                    },
                    Response_Data: {
                        Job_Profile: generateMockJobProfiles()
                    }
                },
                ''
            ])
        };

        vi.spyOn(soap, 'createClientAsync').mockResolvedValue(mockClient as any);

        await createSync.exec(nangoMock);

        for (const model of models) {
            const batchDeleteData = await nangoMock.getBatchDeleteData(model);
            if (batchDeleteData && batchDeleteData.length > 0) {
                const spiedData = batchDeleteSpy.mock.calls.flatMap((call) => {
                    if (call[1] === model) {
                        return call[0];
                    }

                    return [];
                });

                // Normalize spy-captured args into plain JSON so they compare cleanly
                // with fixture data loaded from `*.test.json`.
                // Removes things like prototypes, undefined values and other non-serializable data.
                const spied = JSON.parse(JSON.stringify(spiedData));

                expect(spied).toStrictEqual(batchDeleteData);
            }
        }
    });
});
