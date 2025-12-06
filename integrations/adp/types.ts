export interface ADPEmployee {
    associateOID: string;
    workerID: {
        idValue: string;
    };
    person: {
        birthDate: string;
        genderCode: {
            codeValue: string;
            shortName: string;
            longName: string;
        };
        disabledIndicator: boolean;
        preferredName: {
            givenName: string;
            middleName: string;
            familyName1: string;
        };
        militaryClassificationCodes: any[];
        customFieldGroup: {
            amountFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            codeFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName?: string;
                    longName?: string;
                };
            }[];
            dateFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            indicatorFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            numberFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            percentFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            stringFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            telephoneFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            multiCodeFields: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
                codes: any[];
            }[];
        };
        legalName: {
            preferredSalutations: {
                salutationCode: {
                    codeValue: string;
                    shortName: string;
                };
            }[];
            nickName: string;
            givenName: string;
            middleName: string;
            familyName1: string;
            formattedName: string;
            generationAffixCode?: {
                codeValue: string;
                shortName: string;
            };
            qualificationAffixCode?: {
                codeValue: string;
                longName: string;
            };
        };
        legalAddress?: {
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            lineOne: string;
            lineTwo: string;
            cityName: string;
            countrySubdivisionLevel1: {
                subdivisionType: string;
                codeValue: string;
                shortName: string;
            };
            countryCode: string;
            postalCode: string;
        };
        communication?: {
            emails: {
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
                emailUri: string;
                notificationIndicator: boolean;
            }[];
            mobiles?: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
                countryDialing: string;
                areaDialing: string;
                dialNumber: string;
                formattedNumber: string;
                access?: string;
            }[];
            landlines?: {
                itemID: string;
                nameCode: {
                    codeValue: string;
                    shortName: string;
                };
                countryDialing: string;
                areaDialing: string;
                dialNumber: string;
                formattedNumber: string;
                access?: string;
            }[];
        };
        preferredGenderPronounCode?: {
            codeValue: string;
            shortName: string;
            longName: string;
        };
        birthName?: {
            familyName1: string;
        };
    };
    workerDates: {
        originalHireDate: string;
        terminationDate: string;
    };
    workerStatus: {
        statusCode: {
            codeValue: string;
        };
    };
    photos: {
        links: {
            href: string;
            mediaType: string;
            method: string;
        }[];
    }[];
    businessCommunication: {
        landlines?: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            countryDialing: string;
            areaDialing: string;
            dialNumber: string;
            formattedNumber: string;
            access?: string;
        }[];
        mobiles: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            countryDialing: string;
            areaDialing: string;
            dialNumber: string;
            formattedNumber: string;
            access?: string;
        }[];
        emails?: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            emailUri: string;
            notificationIndicator: boolean;
        }[];
    };
    workAssignments: {
        itemID: string;
        primaryIndicator: boolean;
        hireDate: string;
        actualStartDate: string;
        terminationDate: string;
        assignmentStatus: {
            statusCode: {
                codeValue: string;
                shortName: string;
                longName: string;
            };
            reasonCode: {
                codeValue: string;
                shortName: string;
            };
            effectiveDate: string;
        };
        voluntaryIndicator: boolean;
        workerTypeCode: {
            codeValue: string;
            shortName?: string;
            longName?: string;
        };
        jobCode?: {
            codeValue: string;
            shortName: string;
        };
        jobTitle?: string;
        positionID: string;
        occupationalClassifications?: {
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            classificationCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        workerTimeProfile: {
            timeAndAttendanceIndicator: boolean;
        };
        payCycleCode: {
            codeValue: string;
            shortName: string;
        };
        payrollProcessingStatusCode: {
            shortName: string;
        };
        payrollGroupCode?: string;
        customFieldGroup: any;
        managementPositionIndicator: boolean;
        customCountryInputs: any[];
    }[];
    customFieldGroup: {
        amountFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        codeFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        dateFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        indicatorFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        numberFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        percentFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        stringFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        telephoneFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
        }[];
        multiCodeFields: {
            itemID: string;
            nameCode: {
                codeValue: string;
                shortName: string;
            };
            codes: any[];
        }[];
    };
}
