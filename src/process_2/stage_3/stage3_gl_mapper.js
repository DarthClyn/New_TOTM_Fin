/**
 * Stage 3: GL Code Mapper
 * Uses AI to map Claim Group Codes to valid GL Codes based on a dictionary.
 */

window.Stage3GLMapper = {
    // Full Chart of Accounts
    sqlDictionary: {
            "11010103": "FURNITURE & FITTINGS",
            "11010104": "RENOVATION",
            "11010201": "ACC. DEPN-COMPUTERS",
            "11010202": "ACC. DEPN-OFFICE EQUIPMENT",
            "11010203": "ACC. DEPN-FURNITURE & FITTINGS",
            "11010204": "ACC. DEPN-RENOVATION",
            "11020101": "ROU-OFFICE RENTAL",
            "11020201": "ACC. DEPN - ROU-OFFICE RENTAL",
            "11030101": "SOFTWARE",
            "11030201": "ACC. AMORT-SOFTWARE",
            "11040101": "INVESTMENT IN SUBSI - IDENTA T LLC",
            "11040102": "INVESTMENT IN SUBSI - TTIPL",
            "11050101": "ACC. IMPAIRMENT LOSS ON IDENTA\u00a0LLC",
            "12010000": "INVENTORIES",
            "12020000": "CONTRACT COSTS",
            "12050000": "CONTRACT ASSETS",
            "12060000": "ACC. IMPAIRMENT LOSS ON CONTRACT ASSETS",
            "12070000": "UNBILLED REVENUE",
            "12100100": "TRADE DEBTORS - NON RELATED",
            "12100101": "TRADE DEBTORS - NON RELATED - EXCHG DIFF",
            "12100500": "TRADE DEBOTRS - RELATED",
            "12100600": "PROV. FOR DOUBTFUL DEBTS",
            "12110100": "NON-TRADE DEBTORS - NON RELATED",
            "12110500": "NON-TRADE DEBTORS - RELATED",
            "12110501": "NON-TRADE DEBTORS - RELATED - EXCHG DIFF",
            "12120001": "AMOUNT DUE FROM RELATED PARTIES -TLPL",
            "12120101": "AMOUNT DUE FROM TOTM TECHNOLOGIES LIMITED",
            "12120201": "AMOUNT DUE FROM SUBSI-TTIPL",
            "12120202": "AMOUNT DUE FROM SUBSI-IBPL",
            "12120203": "AMONT DUE FROM SUBSI- IDENTA T LLC",
            "12120500": "AMOUNT DUE FROM A SHAREHOLDER",
            "12121500": "AMOUNT DUE FROM OTHER RELATED PARTIES",
            "12130000": "PREPAYMENTS",
            "12140101": "DEPOSIT - RENTAL",
            "12140102": "DEPOSIT - UTILITY",
            "12140103": "DEPOSIT- OTHERS",
            "12140201": "DOWN PAYMENT MADE",
            "12140202": "STAFF ADVANCE",
            "12140203": "ADVANCE TO SUPPLIER",
            "12140300": "RECOVERABLE ACCOUNT",
            "12140900": "OTHER RECEIVABLES",
            "12150100": "PETTY CASH",
            "12150201": "OCBC-601457146201 - USD",
            "12150202": "OCBC-601767916001 - SGD",
            "12150299": "BANK CLEARING",
            "22010101": "LEASE LIAB-NON CURRENT-OFFICE RENTAL",
            "22020000": "LOAN AND BORROWINGS - CURRENT",
            "22030010": "LEASE LIAB - CURRENT - OFFICE RENTAL",
            "22100100": "TRADE CREDITORS - NON RELATED",
            "22100101": "TRADE CREDITORS - NON RELATED - EXCHG DIFF",
            "22100200": "TRADE CREDITORS - RELATED",
            "22100201": "TRADE CREDITORS - RELATED - EXCHG DIFF",
            "22110100": "NON-TRADE CREDITORS - NON RELATED",
            "22110101": "NON-TRADE CREDITORS - NON RELATED - EXCHG DIFF",
            "22110200": "NON-TRADE CREDITORS - RELATED",
            "22110201": "NON-TRADE CREDITORS - RELATE - EXCHG DIFF",
            "22120101": "AMOUNT DUE TO TOTM TECHNOLOGIES LIMITED",
            "22120201": "AMOUNT DUE TO SUBSI - IDENTA T LLC",
            "22120202": "AMOUNT DUE TO SUBSI - TTIPL",
            "22121501": "AMOUNT DUE TO PTIBI",
            "22121502": "AMOUNT DUE TO IBPL",
            "22121503": "AMOUNT DUE TO GPL",
            "22130101": "ACCRUAL-OTHERS",
            "22130102": "ACCRUAL-WAGES & SALARIES",
            "22130103": "ACCRUAL - CPF",
            "22130104": "ACCRUAL-YEAR-END LEAVE",
            "22130109": "ACCRUAL-EXTERNAL AUDIT FEE",
            "22130110": "ACCRUAL-TAX SERVICE FEE",
            "22130111": "ACCRUAL-SECRETARY FEE",
            "22130113": "ACCRUAL-OTHER PROFESSIONAL FEE",
            "22130200": "OTHER PAYABLES",
            "22130301": "GST INPUT TAX",
            "22130302": "GST OUTPUT TAX",
            "22130303": "GST CONTROL ACCOUNT",
            "22130400": "WITHHOLDING TAX",
            "22200001": "CONTRACT LIA-DOWN PAYMENT RECEIVED",
            "22200002": "CONTRACT LIA-INVOICE ISSUED",
            "22200005": "CONTRACT LIA-WARRANTY LIABILITY",
            "22210000": "DEFERRED INCOME",
            "22500000": "PROVISION FOR INCOEM TAX",
            "31010100": "ORDINARY SHARES",
            "31010200": "PREFERENCE SHARES",
            "32010100": "RETAINED EARNINGS/ (ACCUMULATED LOSSES)",
            "41010000": "REVENUE - CONTRACT",
            "41020000": "REVENUE - SOFTWARE/ LICENSE",
            "41030000": "REVENUE - HAREWARE",
            "41040000": "REVENUE - INSTALLATION",
            "41099000": "REVENUE - OTHERS",
            "450-000": "CONTRA ACCOUNT",
            "510-000": "RETURN INWARDS",
            "51010000": "COS - MATERIAL",
            "51020000": "COS - SOFTWARE/ LICENSE",
            "51030000": "COS - LABOR",
            "51040000": "COS - SUBCONTRACT",
            "51050000": "COS - EQUIPMENT",
            "51990000": "COS - OTHERS",
            "600-000": "STOCKS AT THE BEGINNING OF YEAR",
            "610-000": "PURCHASE",
            "61010000": "OTHER INCOME-MANAGEMENT FEE",
            "61020000": "OTHER INCOME-DIVIDEND INCOME",
            "61030000": "OTHER INCOME-INTEREST INCOME - NON RELATED",
            "61040000": "OTHER INCOME-INTEREST INCOME - RELATED",
            "61050000": "OTHER INCOME-GOVERNMENT GRANT",
            "61099000": "OTHER INCOME-OTHERS",
            "612-000": "PURCHASE RETURNED",
            "615-000": "CARRIAGE INWARDS",
            "620-000": "STOCKS AT THE END OF THE YEAR",
            "71010000": "SALARIES",
            "71020000": "CPF - EMPLOYER",
            "71030000": "SDL",
            "71070000": "ALLOWANCE",
            "71080000": "LEAVE-PAY (YEAR-END)",
            "71090000": "MEDICAL EXPENSES",
            "71100000": "RECRUITMENT EXPENSES",
            "71110000": "INSURANCE PREMIUM",
            "71120000": "STAFF TRAINING",
            "71130000": "STAFF WELFARE",
            "71140000": "PRIVILEGE LEAVE ENCASHMENT",
            "71150000": "STAFF SUBSCRIPTION FEE",
            "71160000": "ACCOMODATION ALLOWANCE",
            "72010100": "DEPRN-COMPUTERS",
            "72010200": "DEPRN-OFFICE EQUIPMENT",
            "72010300": "DEPRN-FURNITURE & FITTINGS",
            "72010400": "DEPRN-RENOVATION",
            "72020101": "DEPN-ROU-OFFICE RENTAL",
            "73010100": "AMORT-SOFTWARE",
            "74020000": "INTERNAL AUDIT FEE",
            "74030000": "EXTERNAL AUDIT FEE",
            "74040000": "TAX SERVICE FEE",
            "74050000": "SECRETARY FEE",
            "74060000": "MANAGEMENT FEE",
            "74100000": "OTHER PROFESSIONAL FEE",
            "75010000": "LOCAL TRANSPORT",
            "75020000": "PETROL & PARKING",
            "75100000": "TRAVEL-AIRTICKET",
            "75110000": "TRAVEL-HOTEL",
            "75120000": "TRAVEL-OVERSEAS TRANSPORT",
            "75130000": "TRAVEL-INSURANCE",
            "75140000": "TRAVEL-COMMUNICATION/INTERNET",
            "75150000": "TRAVEL-MEAL",
            "75160000": "TRAVEL-PER DIEM",
            "75190000": "TRAVEL-OTHERS",
            "76001000": "IMPAIRMENT LOSSES ON INVESTMENT IN SUBSIDIARY",
            "76002000": "IMPAIRMENT LOSS - TRADE DEBTORS (NON RELATED)",
            "78050100": "ADVERTISING EXPENSES",
            "78050200": "MEAL & ENTERTAINMENT - BUSINESS",
            "78050300": "EVENT EXPENSES",
            "78060000": "HARDWARE/ SOFTWARE",
            "78070000": "SOFTWARE/ LICENSE",
            "78080000": "MEAL AND ENTERTAINMENT - STAFF",
            "78090000": "MANAGEMENT FEE EXPENSES",
            "78100000": "UTILITIES",
            "78110000": "PRINTING & STATIONERY",
            "78120000": "POSTAGE & COURIER",
            "78130000": "TELEPHONE & COMMUNICATION",
            "78140000": "OFFICE CLEANING EXPENSES",
            "78150000": "OFFICE EXPENSE",
            "78160000": "RENTAL - OFFICE",
            "78170000": "RENTAL - MEETING ROOM",
            "78180000": "BAD DEBT (NON-TRADE)",
            "78190000": "OFFICE CLEANING EXPENSES",
            "78200000": "FINE & PENALITIES",
            "78300000": "SUBSCRIPTION FEE",
            "78400000": "BANK CHARGES",
            "78500000": "OTHERS",
            "78600000": "(GAIN)/LOSS ON DISPOSAL OF ASSETS",
            "78610000": "(GAIN)/LOSS ON FOREIGN EXCHANGE-UNREALISED",
            "78620000": "(GAIN)/LOSS ON FOREIGN EXCHANGE-REALISED",
            "78700000": "STAMP DUTY",
            "81010000": "INTEREST INCOME-DEPOSIT",
            "81020000": "INTEREST INCOME-INTEREST ON LOAN (NON-RELATED)",
            "81030000": "INTEREST INCOME-INTEREST ON LOAN (RELATED)",
            "82010000": "INTEREST EXPENSES - NON-RELATED",
            "82020000": "INTEREST EXPENSES - RELATED",
            "82030000": "INTEREST ON LEASE LIABILITIES",
            "91000000": "INCOME TAX"
    },

    sapDictionary: {
            "11010101": "COMPUTERS",
            "11010102": "OFFICE EQUIPMENT",
            "11010103": "FURNITURE & FITTINGS",
            "11010104": "RENOVATION",
            "11010105": "RENOVATION WIP",
            "11010201": "ACC. DEPN-COMPUTERS",
            "11010202": "ACC. DEPN-OFFICE EQUIPMENT",
            "11010203": "ACC. DEPN-FURNITURE & FITTINGS",
            "11010204": "ACC. DEPN-RENOVATION",
            "11010300": "FIXED ASSET CLEARING",
            "11010900": "OPEN FA CLEARING",
            "11020101": "ROU-OFFICE RENTAL",
            "11020102": "ROU-OFFICE RENOVATION",
            "11020103": "ROU-OFFICE EQUIPMENT",
            "11020104": "ROU-VECHICLE",
            "11020105": "ROU-STAFF APARTMENT",
            "11020201": "ACC. DEPN-ROU-OFFICE RENTAL",
            "11020202": "ACC. DEPN-ROU-OFFICE RENOVATION",
            "11020203": "ACC. DEPN-ROU-OFFICE EQUIPMENT",
            "11020204": "ACC. DEPN-ROU-VECHICLE",
            "11020205": "ACC. DEPN-ROU-STAFF APARTMENT",
            "11030101": "SOFTWARE",
            "11030102": "TRADEMARK",
            "11030190": "DEVELOPMENT COSTS",
            "11030201": "ACC. AMORT-SOFTWARE",
            "11030202": "ACC. AMORT-TRADEMARK",
            "11040101": "INVESTMENT IN SUBSI - IBPL GROUP",
            "11040102": "INVESTMENT IN SUBSI - TOTM TECH SG",
            "11040103": "INVESTMENT IN SUBSI - GENESISPRO",
            "11040201": "ACC. IMPAIRMENT LOSS IN SUBSI - IBPL GROUP",
            "11040202": "ACC. IMPAIRMENT LOSS IN SUBSI - TOTM TECH SG",
            "11040203": "ACC. IMPAIRMENT LOSS IN SUBSI - GENESISPRO",
            "11040301": "INVESTMENT IN ASSOCIATE - TECH 5 SA",
            "11040401": "ACC. IMPAIRMENT LOSS IN ASSOCIATE - TECH 5 SA",
            "11040901": "BOND CONVERTIBLE LOAN-SGD",
            "11040902": "CONVERTIBLE LOAN-USD",
            "11040903": "DERIVATIVES",
            "11040904": "CONVERTIBLE LOAN-EUR",
            "11050000": "DEFERRED TAX ASSETS",
            "11060000": "EMPLOYEE BENEFITS",
            "12020000": "CONTRACT COSTS",
            "12050000": "CONTRACT ASSETS",
            "12060000": "ACC. IMPAIRMENT LOSS ON CONTRACT ASSETS",
            "12090000": "OPEN AR CLEARING",
            "12100101": "TRADE DEBTORS - NON RELATED-SGD",
            "12100501": "TRADE DEBTORS - RELATED-SGD",
            "12110101": "NON-TRADE DEBTORS - NON RELATED-SGD",
            "12110102": "NON-TRADE DEBTORS - NON RELATED-USD",
            "12110200": "PROV. FOR DOUBTFUL DEBTS -NON RELATED",
            "12110301": "NON-TRADE DEBTORS - RELATED-SGD",
            "12110302": "NON-TRADE DEBTORS - RELATED-USD",
            "12110400": "PROV. FOR DOUBTFUL DEBTS - RELATED",
            "12120201": "AMOUNT DUE FROM SUBSI - TOTM TECH SG (SGD)",
            "12120202": "AMOUNT DUE FROM SUBSI - TOTM TECH SG (USD)",
            "12120206": "AMOUNT DUE FROM SUBSI - GENESISPRO (SGD)",
            "12120207": "AMOUNT DUE FROM SUBSI - GENESISPRO (EUR)",
            "12120209": "AMOUNT DUE FROM SUBSI - PT. INTERNATIONAL BIOMETRICS INDONESIA (USD)",
            "12120211": "AMOUNT DUE FROM SUBSI - IDENTA T LLC (SGD)",
            "12120212": "AMOUNT DUE FROM SUBSI - IDENTA T LLC (USD)",
            "12120216": "AMOUNT DUE FROM SUBSI - TOTM TECH INDIA (USD)",
            "12120217": "AMOUNT DUE FROM SUBSI-INTERNATIONAL BIOMETRICS PTE. LTD.(SGD)",
            "12130000": "PREPAYMENTS",
            "12130001": "CLEARING ACCOUNT",
            "12140101": "DEPOSIT - RENTAL",
            "12140102": "DEPOSIT - UTILITIES",
            "12140109": "DEPOSIT - OTHERS",
            "12140201": "DOWN PAYMENT MADE",
            "12140202": "STAFF ADVANCE",
            "12140300": "RECOVERABLE ACCOUNT",
            "12140501": "DBS 4096-XXXX-XXXX-4519",
            "12140900": "OTHER RECEIVABLES",
            "12140901": "OTHER RECEIVABLES (USD)",
            "12150100": "PETTY CASH",
            "12150201": "DBS 0059051309 (SGD)",
            "12150202": "DBS 0059051309 (EUR)",
            "12150203": "DBS 0059051309 (USD)",
            "12150210": "UOB 4513025542 (SGD) - OPS",
            "12150211": "UOB 4513030155 (SGD) - FLEXIYIELD",
            "12150212": "UOB 3879026812 (USD)",
            "12150299": "BANK CLEARING",
            "12150301": "DBS 270923002161 (SGD) - FD",
            "12150302": "DBS 0072200102053 (SGD) - FD",
            "21020100": "LEASE LIAB - NON CURRENT - OFFICE RENTAL",
            "21020200": "LEASE LIAB - NON CURRENT - OFFICE RENOVATION",
            "21020300": "LEASE LIAB - NON CURRENT - OFFICE EQUIPMENT",
            "21020400": "LEASE LIAB - NON CURRENT - VECHICLE",
            "21020500": "LEASE LIAB - NON CURRENT - STAFF APARTMENT",
            "21030000": "PROV. FOR REINSTATEMENT COSTS",
            "22030100": "LEASE LIAB - CURRENT - OFFICE RENTAL",
            "22030200": "LEASE LIAB - CURRENT - OFFICE RENOVATION",
            "22030300": "LEASE LIAB - CURRENT - OFFICE EQUIPMENT",
            "22030400": "LEASE LIAB - CURRENT - VECHICLE",
            "22030500": "LEASE LIAB - CURRENT - STAFF APARTMENT",
            "22090000": "OPEN AP CLEARING",
            "22100101": "TRADE CREDITORS - NON RELATED-SGD",
            "22100201": "TRADE CREDITORS - RELATED-SGD",
            "22110101": "NON-TRADE CREDITORS - NON RELATED-SGD",
            "22110102": "NON-TRADE CREDITORS - NON RELATED-USD",
            "22110103": "NON-TRADE CREDITORS - NON RELATED-EUR",
            "22110104": "NON-TRADE CREDITORS - NON RELATED-IDR",
            "22110105": "NON-TRADE CREDITORS - NON RELATED-CHF",
            "22110106": "NON-TRADE CREDITORS - NON RELATED-MYR",
            "22110107": "NON-TRADE CREDITORS - NON RELATED-THB",
            "22110108": "NON-TRADE CREDITORS - NON RELATED-GBP",
            "22110201": "NON-TRADE CREDITORS - RELATED-SGD",
            "22110202": "NON-TRADE CREDITORS - RELATED-USD",
            "22110203": "NON-TRADE CREDITORS - RELATED-EUR",
            "22120201": "AMOUNT DUE TO SUBSI - TOTM TECH SG (SGD)",
            "22120202": "AMOUNT DUE TO SUBSI - TOTM TECH SG (USD)",
            "22120203": "AMOUNT DUE TO SUBSI- IBPL'S SUBSI - PTIBI (SGD)",
            "22120204": "AMOUNT DUE TO SUBSI - TOTM TECH INDIA (USD)",
            "22120205": "AMOUNT DUE TO SUBSI - IBPL(SGD)",
            "22120600": "AMOUNT DUE TO DIRECTOR",
            "22130101": "ACCRUAL-OTHERS",
            "22130102": "ACCRUAL-WAGES & SALARIES",
            "22130103": "ACCRUAL-BONUS",
            "22130104": "ACCRUAL-DIRECTORS' FEE",
            "22130105": "ACCRUAL-CPF",
            "22130106": "ACCRUAL-SDL",
            "22130107": "ACCRUAL-FWL",
            "22130108": "ACCRUAL-YEAR-END LEAVE",
            "22130121": "ACCRUAL-INTERNAL AUDIT FEE",
            "22130122": "ACCRUAL-EXTERNAL AUDIT FEE",
            "22130123": "ACCRUAL-TAX SERVICE FEE",
            "22130124": "ACCRUAL-SECRETARY FEE",
            "22130125": "ACCRUAL-SPONSOR RELATED FEE",
            "22130126": "ACCRUAL-OTHER PROFESSIONAL FEE",
            "22130201": "FIXED ASSET CLEARING",
            "22130202": "DIVIDEND PAYABLE",
            "22130203": "DEFERRED CONSIDERATION",
            "22130204": "OTHER PAYABLES-OTHERS",
            "22130301": "GST INPUT TAX",
            "22130302": "GST OUTPUT TAX",
            "22130303": "GST CLEARING",
            "22130400": "WITHHOLDING TAX PAYABLE",
            "22140001": "DBS 4190-XXXX-XXXX-8055",
            "22200001": "CONTRACT LIA-DOWN PAYMENT RECEIVED",
            "22200005": "CONTRACT LIA-WARRANTY LIABILITY",
            "22200006": "CONTRACT LIA-REFUND LIABILITY",
            "22210000": "DEFERRED INCOME",
            "22500000": "PROVISION FOR INCOEM TAX",
            "31010100": "ORDINARY SHARES",
            "31010200": "PREFERENCE SHARES",
            "32010100": "RETAINED EARNINGS/ (ACCUMULATED LOSSES)",
            "32010200": "PROFIT/ (LOSS) FOR THE PERIOD",
            "32020100": "SHARE-BASED PAYMENT RESERVE",
            "32020101": "SHARE-BASED PAYMENT RESERVE-SHARE AWARDS",
            "41010000": "REVENUE - CONTRACT",
            "41020000": "REVENUE - SOFTWARE/ LICENSE",
            "41030000": "REVENUE - HARDWARE",
            "41040000": "REVENUE - INSTALLATION",
            "41099000": "REVENUE - OTHERS",
            "51010000": "COS - MATERIAL",
            "51020000": "COS - SOFTWARE/ LICENSE",
            "51030000": "COS - LABOR",
            "51040000": "COS - SUBCONTRACT",
            "51990000": "COS - OTHERS",
            "61010000": "SALARIES",
            "61020000": "BONUS",
            "61030000": "CPF",
            "61040000": "SDL",
            "61050000": "FWL",
            "61060000": "INCENTIVE",
            "61070000": "ALLOWANCE",
            "61080000": "LEAVE-PAY (YEAR-END)",
            "61090000": "MEDICAL EXPENSES",
            "61100000": "RECRUITMENT EXPENSES",
            "61110000": "STAFF TRAINING",
            "61120000": "STAFF WELFARE",
            "61130000": "STAFF SUBSCRIPTION FEE",
            "61140000": "PRIVILEGE LEAVE ENCASHMENT",
            "61150000": "DIRECTORS' FEE",
            "61160000": "STAFF TAX BENEFIT",
            "61170000": "SHARE-BASED PAYMENT EXPENSES",
            "61200000": "STAFF INSURANCE",
            "61210000": "WORKMEN COMPENSATION INSURANCE",
            "61220000": "DIRECTORS & OFFICERS LIABILITY INSURANCE",
            "62010100": "DEPN-COMPUTERS",
            "62010200": "DEPN-OFFICE EQUIPMENT",
            "62010300": "DEPN-FURNITURE & FITTINGS",
            "62010400": "DEPN-RENOVATION",
            "62020100": "DEPN-ROU-OFFICE RENTAL",
            "62020200": "DEPN-ROU-OFFICE RENOVATION",
            "62020300": "DEPN-ROU-OFFICE EQUIPMENT",
            "62020400": "DEPN-ROU-VECHICLE",
            "62020500": "DEPN-ROU-STAFF APARTMENT",
            "62030100": "AMORT-SOFTWARE",
            "62030101": "AMORT-TRADEMARK",
            "63010000": "IMPAIRMENT LOSS - TRADE DEBTORS (NON RELATED)",
            "63020000": "IMPAIRMENT LOSS - TRADE DEBTORS (RELATED)",
            "63030000": "IMPAIRMENT LOSS - NON-TRADE DEBTORS (NON RELATED)",
            "63040000": "IMPAIRMENT LOSS - NON-TRADE DEBTORS (RELATED)",
            "63050000": "IMPAIRMENT LOSS - INVESTMENT IN SUBSIDIARY",
            "63060000": "IMPAIRMENT LOSS - DUE FROM SUBSIDIARY",
            "64010000": "SPONSOR RELATED FEE",
            "64020000": "INTERNAL AUDIT FEE",
            "64030000": "EXTERNAL AUDIT FEE",
            "64040000": "TAX SERVICE FEE",
            "64050000": "SECRETARY FEE",
            "64060000": "ACCOUNTING FEE & OTHERS",
            "64100000": "OTHER PROFESSIONAL FEE",
            "64200000": "OTHER PROFESSIONAL DISBURSEMENTS/REIMBURSEMENT",
            "65010000": "LOCAL TRANSPORT",
            "65020000": "PETROL & PARKING",
            "65100000": "TRAVEL-AIRTICKET",
            "65110000": "TRAVEL-HOTEL",
            "65120000": "TRAVEL-OVERSEAS TRANSAPORT",
            "65130000": "TRAVEL-COMMUNICATION/INTERNET",
            "65140000": "TRAVEL-MEAL",
            "65150000": "TRAVEL-PER DIEM",
            "65160000": "TRAVEL-INSURANCE",
            "65190000": "TRAVEL-OTHERS",
            "68010100": "PUBLIC LIABILITY",
            "68020100": "RENTAL - OFFICE",
            "68020200": "RENTAL - STAFF APARTMENT",
            "68020300": "RENTAL - VEHICLE",
            "68030100": "R&M - OFFICE BUILDING",
            "68030200": "R&M - OFFICE EQUIPMENT",
            "68030300": "R&M - STAFF APARTMENT",
            "68030400": "R&M - VEHICLE",
            "68040100": "BAD DEBTS - TRADE",
            "68040200": "BAD DEBTS - NON-TRADE",
            "68040300": "UNRECOVERED ADVANCES & LOANS",
            "68041000": "CONTRACT ASSET WRITTEN OFF",
            "68041100": "FIXED ASSET WRITTEN OFF",
            "68050100": "ADVERTISING EXPENSES",
            "68050200": "MEAL & ENTERTAINMENT - BUSINESS",
            "68050201": "MEAL & ENTERAINMENT-BUSINESS OVERSEAS",
            "68050300": "GIFT",
            "68050400": "EVENT EXPENSE",
            "68051000": "FREE SAMPLE",
            "68060000": "COMPUTER/ HARDWARE/ FF&OE",
            "68070000": "SOFTWARE/ LICENSE",
            "68080000": "MEAL AND ENTERTAINMENT - STAFF",
            "68100000": "UTILITIES",
            "68110000": "PRINTING & STATIONERY",
            "68120000": "POSTAGE & COURIER",
            "68130000": "TELEPHONE & COMMUNICATION",
            "68140000": "OFFICE CLEANING EXPENSES",
            "68150000": "OFFICE EXPENSES",
            "68160000": "FIRE INSURANCE",
            "68200000": "SUBSCRIPTION FEE",
            "68210000": "STAMP DUTY",
            "68220000": "BANK CHARGES",
            "68230000": "FINE & PENALITIES",
            "68500000": "OTHERS",
            "68600000": "(GAIN)/LOSS ON DISPOSAL OF ASSETS",
            "68600001": "(GAIN)/LOSS ON LEASE MODIFICATION",
            "68610000": "(GAIN)/LOSS ON FOREIGN EXCHANGE-UNREALISED",
            "68620000": "(GAIN)/LOSS ON FOREIGN EXCHANGE-REALISED",
            "71010000": "OTHER INCOME-MANAGEMENT FEE",
            "71020000": "OTHER INCOME-DIVIDEND INCOME",
            "71050000": "OTHER INCOME-GOVERNMENT GRANT",
            "71100000": "FAIR VALUE (GAIN)/LOSS ON OTHER INVESTMENTS",
            "71200000": "(GAIN)/LOSS ON DISPOSAL OF SUBSIDIARIES",
            "71099000": "OTHER INCOME-OTHERS",
            "72010000": "SHARE OF (PROFIT)/LOSS OF ASSOCIATE - TECH 5 SA",
            "81010000": "INTEREST INCOME-DEPOSIT",
            "81020000": "INTEREST INCOME-INTEREST ON LOAN (NON-RELATED)",
            "81100000": "INTEREST INCOME-INTEREST ON LOAN (RELATED)",
            "82010000": "INTEREST EXPENSES-INTEREST ON LOAN (NON-RELATED)",
            "82100000": "INTEREST EXPENSES-INTEREST ON LOAN (RELATED)",
            "82200000": "INTEREST ON LEASE LIABILITIES",
            "91000000": "INCOME TAX",
            "92000000": "DEFERRED TAX"
    },

    // Pre-defined mappings for all known Claim Group Codes
    
    sqlClaimCodeMapping: {
        "MEDICAL CLAIM": { gl: "71130000", desc: "STAFF WELFARE" },
        "IT": { gl: "12140300", desc: "RECOVERABLE ACCOUNT" },
        "MOBILE PHONE REIMBURSEMENT": { gl: "78130000", desc: "TELEPHONE & COMMUNICATION" },
        "OTHERS": { gl: "78150000", desc: "OFFICE SUPPLIES" },
        "ASSET": { gl: "11010101", desc: "COMPUTERS (or nearest asset code)" },
        "ENTERT": { gl: "78050200", desc: "MEAL & ENTERTAINMENT - BUSINESS" },
        "MLCLM": { gl: "71090000", desc: "MEDICAL EXPENSES" },
        "MOBILE": { gl: "78130000", desc: "TELEPHONE & COMMUNICATION" },
        "OVRSEA": { gl: "75100000", desc: "TRAVEL-AIRTICKET (Overseas/Business Travel)" },
        "TRAIN": { gl: "71120000", desc: "STAFF TRAINING" },
        "TRAN": { gl: "75010000", desc: "LOCAL TRANSPORT" }
    },

    get glDictionary() {
        return (window.targetAccountingSystem === 'SQL') ? this.sqlDictionary : this.sapDictionary;
    },
    
    get claimCodeMapping() {
        return (window.targetAccountingSystem === 'SQL') ? this.sqlClaimCodeMapping : this.sapClaimCodeMapping;
    },

    sapClaimCodeMapping: {
        "MEDICAL CLAIM": { gl: "61090000", desc: "MEDICAL EXPENSES" },
        "IT": { gl: "68060000", desc: "COMPUTER/ HARDWARE/ FF&OE" },
        "MOBILE PHONE REIMBURSEMENT": { gl: "68130000", desc: "TELEPHONE & COMMUNICATION" },
        "OTHERS": { gl: "68150000", desc: "OFFICE EXPENSES" },
        "ASSET": { gl: "68060000", desc: "COMPUTER/ HARDWARE/ FF&OE" },
        "ENTERT": { gl: "68050200", desc: "MEAL & ENTERTAINMENT - BUSINESS" },
        "MLCLM": { gl: "61090000", desc: "MEDICAL EXPENSES" },
        "MOBILE": { gl: "68130000", desc: "TELEPHONE & COMMUNICATION" },
        "OVRSEA": { gl: "65100000", desc: "TRAVEL-AIRTICKET" },
        "TRAIN": { gl: "61110000", desc: "STAFF TRAINING" },
        "TRAN": { gl: "65010000", desc: "LOCAL TRANSPORT" }
    },

    systemPrompt: `You are an AI Finance Mapping Assistant.
Your job is to map short "Claim Group Codes" (and their names) to a strict list of GL Codes.
If a logical mapping exists, provide the GL Code. If it is completely ambiguous, return "MANUAL".
You must perform semantic matching. For example, claim codes related to "MEAL", "FOOD", "LUNCH", or "DINNER" should map to "78050200" (MEAL & ENTERTAINMENT - BUSINESS).
You must return a strictly valid JSON object where the keys are the Claim Group Codes, and the values are the mapped GL Code strings.
Example: { "ENTERT": "78050200", "MEAL": "78050200", "UNKNOWN": "MANUAL" }`,

    // Called on page load — renders all pre-defined mappings immediately
    init() {
        const allGroups = Object.entries(this.claimCodeMapping).map(([code, val]) => ({
            code, name: val.desc
        }));
        const finalMappings = {};
        allGroups.forEach(g => {
            finalMappings[g.code] = this.claimCodeMapping[g.code].gl;
        });

        // Pass this.claimCodeMapping so they show as 'Mapped' instead of 'AI Resolved' on load
        this.renderMappingTable(allGroups, finalMappings, this.claimCodeMapping);
        window.SidePanelLog.log('p2 stage 3', `Default GL mapping loaded: ${allGroups.length} claim group codes pre-mapped from hardcoded table.`);
        document.getElementById('stage3Status').textContent = 'Default Ready';
        document.getElementById('stage3Status').className = 'badge badge-match';
    },

    // Run: Check current claims for any NEW unknown codes, call AI only for those
    async run(claimsData) {
        // Step 1: Build groups — all 9 known codes + any new ones from the claims batch
        const allGroups = Object.entries(this.claimCodeMapping).map(([code, val]) => ({
            code, name: val.desc
        }));

        // Add any codes from claims NOT already in known mapping (case-insensitive)
        const aiNeededFor = [];
        claimsData.forEach(c => {
            const upperCode = c.groupCode.toUpperCase();
            // Check exact match OR uppercase match
            const knownMatch = this.claimCodeMapping[c.groupCode] || this.claimCodeMapping[upperCode];
            const alreadyInAll = allGroups.find(g => g.code === c.groupCode || g.code === upperCode);
            if (!alreadyInAll) {
                const canonicalCode = knownMatch ? upperCode : c.groupCode;
                allGroups.push({ code: canonicalCode, name: c.groupName });
                if (!knownMatch) aiNeededFor.push({ code: canonicalCode, name: c.groupName });
            }
        });

        // Step 2: Pre-map all known codes instantly — no AI (case-insensitive lookup)
        const finalMappings = {};
        allGroups.forEach(group => {
            const match = this.claimCodeMapping[group.code] || this.claimCodeMapping[group.code.toUpperCase()];
            if (match) {
                finalMappings[group.code] = match.gl;
            }
        });

        const knownCount = allGroups.length - aiNeededFor.length;
        window.SidePanelLog.log('p2 stage 3', `[PART 1 - Hardcoded] ${knownCount} claim codes instantly mapped from pre-defined GL table. No AI required.`);

        // Step 3: AI fallback ONLY for unknown codes
        if (aiNeededFor.length > 0) {
            window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] ${aiNeededFor.length} new/unknown codes detected: ${aiNeededFor.map(g => g.code).join(', ')}. Calling AI...`);
            const activeApiKey = localStorage.getItem('openRouterApiKey');
            if (!activeApiKey) {
                aiNeededFor.forEach(g => { finalMappings[g.code] = 'MANUAL'; });
                window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] No API key \u2014 ${aiNeededFor.length} codes marked MANUAL (Human Intervention).`);
            } else {
                try {
                    const userPrompt = `Available GL Codes:\n${JSON.stringify(this.glDictionary, null, 2)}\n\nNew Unknown Claim Groups:\n${JSON.stringify(aiNeededFor, null, 2)}\n\nReturn ONLY a valid JSON object.`;
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${activeApiKey}`,
                            'HTTP-Referer': window.location.href,
                            'X-Title': 'TOTM Finance Automation',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'nvidia/nemotron-3-super-120b-a12b:free',
                            messages: [
                                { role: 'system', content: this.systemPrompt },
                                { role: 'user', content: userPrompt }
                            ],
                            temperature: 0.1
                        })
                    });
                    if (!response.ok) {
                        let e = `HTTP ${response.status}`;
                        try { const j = await response.json(); e = j.error?.message || e; } catch (_) { }
                        throw new Error(e);
                    }
                    const data = await response.json();
                    const jsonStr = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
                    const aiMappings = JSON.parse(jsonStr);
                    Object.assign(finalMappings, aiMappings);
                    window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] AI resolved ${Object.keys(aiMappings).length} codes: ${Object.entries(aiMappings).map(([k, v]) => k + '\u2192' + v).join(', ')}.`);
                } catch (err) {
                    aiNeededFor.forEach(g => { finalMappings[g.code] = 'MANUAL'; });
                    window.SidePanelLog.log('p2 stage 3', `[PART 2 - AI Fallback] AI failed: ${err.message}. Codes marked MANUAL.`);
                }
            }
        } else {
            window.SidePanelLog.log('p2 stage 3', '[PART 2 - AI Fallback] Not needed \u2014 all claim codes matched in pre-defined table.');
        }

        this.renderMappingTable(allGroups, finalMappings, this.claimCodeMapping);
        window.SidePanelLog.log('p2 stage 3', `Complete: ${knownCount} hardcoded + ${aiNeededFor.length} AI-resolved = ${allGroups.length} total mapped.`);
        return this.getFinalMappings.bind(this);
    },


    renderMappingTable(groups, mappings, knownCodes = {}) {
        // Build dropdown options from full GL dictionary
        let optionsHtml = '<option value="MANUAL">-- Require Human Intervention --</option>';
        for (const [code, desc] of Object.entries(this.glDictionary)) {
            optionsHtml += `<option value="${code}">${code} - ${desc}</option>`;
        }

        let tableHtml = `
            <table class="match-data-table">
                <thead>
                    <tr>
                        <th>Claim Group Code</th>
                        <th>Group Name</th>
                        <th>Mapped GL Code</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
        `;

        groups.forEach(group => {
            let glCode = mappings[group.code] || 'MANUAL';
            if (glCode !== 'MANUAL' && !this.glDictionary[glCode]) {
                glCode = 'MANUAL';
            }
            const isManual = glCode === 'MANUAL';
            const badgeClass = isManual ? 'badge-discrepancy' : 'badge-match';
            const isKnown = !!knownCodes[group.code];
            const sourceBadge = isKnown
                ? '<span class="badge badge-accent" style="font-size:0.75em;">Mapped</span>'
                : '<span class="badge badge-partial" style="font-size:0.75em;">AI Resolved</span>';

            // Pre-select the mapped GL code in dropdown
            const selectOptions = optionsHtml.replace(`value="${glCode}"`, `value="${glCode}" selected`);

            // Human Required rows get a Save button to confirm the manual selection
            const actionCell = isManual
                ? `<span class="badge badge-discrepancy" style="font-size:0.75em; margin-right:8px;">Human Required</span>
                   <button class="btn btn-success btn-sm gl-save-btn" onclick="window.Stage3GLMapper.saveManualMapping('${group.code}', this)" style="padding: 4px 10px; font-size: 0.8rem;">
                       <i class="fa-solid fa-floppy-disk"></i> Save
                   </button>`
                : sourceBadge;

            tableHtml += `
                <tr class="gl-mapping-row" data-group="${group.code}">
                    <td class="font-bold"><span class="badge ${badgeClass}" id="badge-${group.code}">${group.code}</span></td>
                    <td>${group.name}</td>
                    <td>
                        <select class="form-input gl-select" style="width: 100%; max-width: 380px;">
                            ${selectOptions}
                        </select>
                    </td>
                    <td id="source-${group.code}">${actionCell}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        document.getElementById('stage3Content').innerHTML = tableHtml;
    },

    saveManualMapping(groupCode, btnEl) {
        const row = btnEl.closest('.gl-mapping-row');
        const select = row.querySelector('.gl-select');
        const selectedGl = select.value;

        if (selectedGl === 'MANUAL') {
            alert('Please select a valid GL Code before saving.');
            return;
        }

        // Update badge to green (resolved)
        const badge = document.getElementById(`badge-${groupCode}`);
        if (badge) badge.className = 'badge badge-match';

        // Replace source cell with "Human Saved" badge
        const sourceCell = document.getElementById(`source-${groupCode}`);
        if (sourceCell) {
            sourceCell.innerHTML = '<span class="badge badge-match" style="font-size:0.75em;">✓ Human Saved</span>';
        }

        const glDesc = this.glDictionary[selectedGl] || selectedGl;
        window.SidePanelLog.log('p2 stage 3', `[Human Intervention] ${groupCode} → ${selectedGl} - ${glDesc} saved.`);

        // If pipeline was waiting for human reviews, check if all are now resolved
        if (typeof window._stage3AutoPushCheck === 'function') {
            window._stage3AutoPushCheck();
        }
    },



    getFinalMappings() {
        const rows = document.querySelectorAll('.gl-mapping-row');
        const finalMap = {};
        rows.forEach(r => {
            const groupCode = r.getAttribute('data-group');
            const glCode = r.querySelector('.gl-select').value;
            finalMap[groupCode] = glCode;
        });
        return finalMap;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Auto-render all pre-defined claim code mappings on page load
    window.Stage3GLMapper.init();
});
