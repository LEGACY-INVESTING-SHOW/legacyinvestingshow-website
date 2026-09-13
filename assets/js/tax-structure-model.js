/* Shared browser / Node model. Each path is a separate, sole-income scenario. */
(function (root) {
    'use strict';
    function progressive(amount, thresholds, rates) {
        let tax = 0;
        let floor = 0;
        for (let i = 0; i < rates.length; i++) {
            const ceiling = thresholds[i] === undefined ? Infinity : thresholds[i];
            tax += Math.max(0, Math.min(amount, ceiling) - floor) * rates[i];
            floor = ceiling;
        }
        return tax;
    }
    function calculate(input, tables) {
        const { amount, status, rental } = input;
        if (!Number.isFinite(amount) || amount < 0 || amount > 100000000 || !['single', 'joint'].includes(status)) throw new Error('Enter an amount from $0 to $100,000,000 and choose a filing status.');
        const limits = { expensePercent: 100, propertyValue: 1000000000, landPercent: 100, accelerated: 1000000000 };
        for (const [key, max] of Object.entries(limits)) {
            if (!Number.isFinite(rental[key]) || rental[key] < 0 || rental[key] > max) throw new Error('Check the rental assumptions. Amounts must be nonnegative and percentages must be between 0 and 100.');
        }
        if (![27.5, 39].includes(rental.recoveryYears)) throw new Error('Choose a supported recovery period.');
        const deduction = tables.standardDeduction[status];
        const ordinary = value => progressive(Math.max(0, value - deduction), tables.ordinaryThresholds[status], tables.rates);
        const incomeTax = ordinary(amount);
        // Joint filing assumes one wage earner; the Social Security cap is per worker.
        const socialSecurity = Math.min(amount, tables.socialSecurityWageBase) * 0.062;
        const medicare = amount * 0.0145;
        const additionalMedicare = Math.max(0, amount - tables.niitThreshold[status]) * 0.009;
        const taxableGains = Math.max(0, amount - deduction);
        const capitalGainsTax = progressive(taxableGains, tables.capitalGainsThresholds[status], [0, 0.15, 0.2]);
        const niit = Math.min(amount, Math.max(0, amount - tables.niitThreshold[status])) * 0.038;
        const expenses = amount * rental.expensePercent / 100;
        const cashBeforeTax = amount - expenses;
        const buildingBasis = rental.propertyValue * (1 - rental.landPercent / 100);
        let standardDepreciation;
        let accelerated;
        if (rental.preset === 'updated') {
            // $60k is TOTAL depreciation, including the standard component.
            standardDepreciation = Math.min(buildingBasis / rental.recoveryYears, 60000);
            accelerated = Math.min(Math.max(0, buildingBasis - standardDepreciation), 60000 - standardDepreciation);
        } else {
            standardDepreciation = buildingBasis / rental.recoveryYears;
            accelerated = rental.accelerated;
        }
        if (standardDepreciation + accelerated > buildingBasis + 0.01) throw new Error('Total depreciation cannot exceed the depreciable basis. Reduce accelerated depreciation or increase property value.');
        const taxableRental = cashBeforeTax - standardDepreciation - accelerated;
        const rentalIncomeTax = ordinary(Math.max(0, taxableRental));
        const rentalNiit = Math.max(0, taxableRental - tables.niitThreshold[status]) * 0.038;
        return {
            amount, deduction,
            wages: { incomeTax, socialSecurity, medicare, additionalMedicare, total: incomeTax + socialSecurity + medicare + additionalMedicare },
            gains: { taxableGains, capitalGainsTax, niit, total: capitalGainsTax + niit },
            rental: { expenses, cashBeforeTax, buildingBasis, standardDepreciation, accelerated, taxableRental, incomeTax: rentalIncomeTax, niit: rentalNiit, total: rentalIncomeTax + rentalNiit }
        };
    }
    function rentalLedger(amount, rental, deduction, tables, status) {
        const expenses = amount * rental.expensePercent / 100;
        const cashBeforeTax = amount - expenses;
        const buildingBasis = rental.propertyValue * (1 - rental.landPercent / 100);
        let standardDepreciation;
        let accelerated;
        if (rental.preset === 'updated') {
            standardDepreciation = Math.min(buildingBasis / rental.recoveryYears, 60000);
            accelerated = Math.min(Math.max(0, buildingBasis - standardDepreciation), 60000 - standardDepreciation);
        } else {
            standardDepreciation = buildingBasis / rental.recoveryYears;
            accelerated = rental.accelerated;
        }
        if (standardDepreciation + accelerated > buildingBasis + 0.01) throw new Error('Total depreciation cannot exceed the depreciable basis. Reduce accelerated depreciation or increase property value.');
        const taxableRental = cashBeforeTax - standardDepreciation - accelerated;
        return { expenses, cashBeforeTax, buildingBasis, standardDepreciation, accelerated, taxableRental };
    }
    /* Split mode: one return with all three income types. Wages and positive rental income share the
       standard deduction and the ordinary brackets; long-term gains stack on top for the 0/15/20 brackets.
       Rental paper losses are not used to offset other income. */
    function calculateSplit(input, tables) {
        const { amount, status, rental, split } = input;
        const shares = ['wages', 'gains', 'rental'].map(key => split[key]);
        if (shares.some(share => !Number.isFinite(share) || share < 0 || share > 100)) throw new Error('Each split percentage must be between 0 and 100.');
        const sum = shares.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 0.01) throw new Error(`Split percentages add up to ${Math.round(sum)}%. They need to add up to 100%.`);
        const base = calculate({ amount, status, rental }, tables);
        const deduction = base.deduction;
        const wagesAmount = amount * split.wages / 100;
        const gainsAmount = amount * split.gains / 100;
        const rentalAmount = amount * split.rental / 100;
        const ledger = rentalLedger(rentalAmount, rental, deduction, tables, status);
        const rentalTaxable = Math.max(0, ledger.taxableRental);
        const ordinaryIncome = wagesAmount + rentalTaxable;
        const taxableOrdinary = Math.max(0, ordinaryIncome - deduction);
        const unusedDeduction = Math.max(0, deduction - ordinaryIncome);
        const taxableGains = Math.max(0, gainsAmount - unusedDeduction);
        const ordinaryTax = progressive(taxableOrdinary, tables.ordinaryThresholds[status], tables.rates);
        const wagesShare = ordinaryIncome ? wagesAmount / ordinaryIncome : 0;
        const incomeTax = ordinaryTax * wagesShare;
        const rentalIncomeTax = ordinaryTax - incomeTax;
        const cgRates = [0, 0.15, 0.2];
        const capitalGainsTax = progressive(taxableOrdinary + taxableGains, tables.capitalGainsThresholds[status], cgRates)
            - progressive(taxableOrdinary, tables.capitalGainsThresholds[status], cgRates);
        const socialSecurity = Math.min(wagesAmount, tables.socialSecurityWageBase) * 0.062;
        const medicare = wagesAmount * 0.0145;
        const additionalMedicare = Math.max(0, wagesAmount - tables.niitThreshold[status]) * 0.009;
        const magi = wagesAmount + gainsAmount + rentalTaxable;
        const investmentIncome = gainsAmount + rentalTaxable;
        const niitBase = Math.min(investmentIncome, Math.max(0, magi - tables.niitThreshold[status]));
        const niit = niitBase * 0.038;
        const gainsNiit = investmentIncome ? niit * gainsAmount / investmentIncome : 0;
        const rentalNiit = niit - gainsNiit;
        const wages = { amount: wagesAmount, incomeTax, socialSecurity, medicare, additionalMedicare, total: incomeTax + socialSecurity + medicare + additionalMedicare };
        const gains = { amount: gainsAmount, taxableGains, capitalGainsTax, niit: gainsNiit, total: capitalGainsTax + gainsNiit };
        const rentalOut = Object.assign({ amount: rentalAmount, incomeTax: rentalIncomeTax, niit: rentalNiit, total: rentalIncomeTax + rentalNiit }, ledger);
        return { amount, deduction, split, wages, gains, rental: rentalOut, total: wages.total + gains.total + rentalOut.total, allWages: base.wages.total };
    }
    const api = { calculate, calculateSplit, progressive };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TaxStructure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
