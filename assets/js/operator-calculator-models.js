/* Shared browser / Node models for first-party /tools calculators. */
(function (root) {
    'use strict';

    var SS_WAGE_BASE_2026 = 184500;
    var SE_BASE_RATIO = 0.9235;
    var ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000;

    function num(value) {
        var n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function requireRange(value, min, max, label) {
        if (!Number.isFinite(value) || value < min || value > max) {
            throw new Error(label);
        }
        return value;
    }

    function money(value) {
        return Math.round(value * 100) / 100;
    }

    function formatValue(value, format) {
        if (format === 'plain') return String(value);
        if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) return '—';
        if (format === 'currency') {
            var rounded = money(value);
            return rounded.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: Math.abs(rounded) >= 100 ? 0 : 2
            });
        }
        if (format === 'percent') {
            return (Math.round(value * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
        }
        if (format === 'integer') {
            return Math.round(value).toLocaleString('en-US');
        }
        return (Math.round(value * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    function monthlyRate(annualPercent) {
        return num(annualPercent) / 100 / 12;
    }

    function payment(principal, annualPercent, years) {
        var p = num(principal);
        var n = Math.round(num(years) * 12);
        var r = monthlyRate(annualPercent);
        if (p <= 0 || n <= 0) return 0;
        if (r === 0) return p / n;
        var factor = Math.pow(1 + r, n);
        return p * r * factor / (factor - 1);
    }

    function futureValue(principal, annualPercent, years, monthlyContribution) {
        var p = num(principal);
        var r = num(annualPercent) / 100;
        var n = num(years);
        var pmt = num(monthlyContribution) * 12;
        if (n < 0) n = 0;
        if (r === 0) return p + pmt * n;
        var growth = Math.pow(1 + r, n);
        return p * growth + pmt * ((growth - 1) / r);
    }

    function selfEmploymentTax(profit) {
        var seBase = Math.max(0, num(profit)) * SE_BASE_RATIO;
        var social = Math.min(seBase, SS_WAGE_BASE_2026) * 0.124;
        var medicare = seBase * 0.029;
        var extra = Math.max(0, seBase - ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * 0.009;
        return {
            seBase: money(seBase),
            social: money(social),
            medicare: money(medicare),
            extra: money(extra),
            total: money(social + medicare + extra)
        };
    }

    function payrollTaxOnSalary(salary) {
        var wages = Math.max(0, num(salary));
        var social = Math.min(wages, SS_WAGE_BASE_2026) * 0.124;
        var medicare = wages * 0.029;
        var extra = Math.max(0, wages - ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * 0.009;
        return {
            social: money(social),
            medicare: money(medicare),
            extra: money(extra),
            total: money(social + medicare + extra)
        };
    }

    function monthsToLtv(loan, value, annualPercent, years, extraMonthly, targetLtv) {
        var balance = num(loan);
        var home = num(value);
        var n = Math.round(num(years) * 12);
        var scheduled = payment(balance, annualPercent, years);
        var extra = Math.max(0, num(extraMonthly));
        var r = monthlyRate(annualPercent);
        var target = num(targetLtv) / 100;
        if (home <= 0 || target <= 0) return { months: 0, reachable: false };
        if (balance / home <= target) return { months: 0, reachable: true };
        var month = 0;
        var maxMonths = Math.max(n, 600);
        while (month < maxMonths && balance > 0) {
            var interest = balance * r;
            var principalPaid = scheduled - interest + extra;
            if (principalPaid <= 0) return { months: null, reachable: false };
            balance = Math.max(0, balance - principalPaid);
            month += 1;
            if (balance / home <= target) return { months: month, reachable: true };
        }
        return { months: null, reachable: false };
    }

    function payoffSchedule(balance, annualPercent, years, extraMonthly) {
        var start = num(balance);
        var n = Math.round(num(years) * 12);
        var scheduled = payment(start, annualPercent, years);
        var extra = Math.max(0, num(extraMonthly));
        var r = monthlyRate(annualPercent);
        var remaining = start;
        var interest = 0;
        var month = 0;
        if (start <= 0) return { months: 0, interest: 0, payment: 0 };
        while (remaining > 0.005 && month < 720) {
            var i = remaining * r;
            var principal = Math.min(remaining, scheduled - i + extra);
            if (principal <= 0) {
                return { months: null, interest: null, payment: scheduled + extra };
            }
            interest += i;
            remaining -= principal;
            month += 1;
        }
        return { months: month, interest: money(interest), payment: money(scheduled + extra) };
    }

    var registry = {
        'cost-segregation-savings': function (input) {
            var basis = requireRange(num(input.basis), 0, 1e11, 'Enter a property basis of $0 or more.');
            var landPercent = requireRange(num(input.landPercent), 0, 100, 'Land percent must be 0 to 100.');
            var reclassPercent = requireRange(num(input.reclassPercent), 0, 100, 'Reclassified percent must be 0 to 100.');
            var bonusPercent = requireRange(num(input.bonusPercent), 0, 100, 'Bonus percent must be 0 to 100.');
            var taxRate = requireRange(num(input.taxRate), 0, 100, 'Tax rate must be 0 to 100.');
            var studyCost = requireRange(num(input.studyCost), 0, 1e9, 'Study cost must be $0 or more.');
            var building = basis * (1 - landPercent / 100);
            var reclass = building * reclassPercent / 100;
            var bonus = reclass * bonusPercent / 100;
            var straight = building / 27.5;
            var yearOneDep = bonus + (building - reclass) / 27.5 + (reclass - bonus) / 5;
            var extraDep = Math.max(0, yearOneDep - straight);
            var taxSavings = extraDep * taxRate / 100;
            var net = taxSavings - studyCost;
            return {
                headline: { label: 'Year-one tax savings after study cost', value: net, format: 'currency' },
                rows: [
                    { label: 'Depreciable building basis', value: building, format: 'currency' },
                    { label: 'Basis moved to short-life property', value: reclass, format: 'currency' },
                    { label: 'Bonus depreciation', value: bonus, format: 'currency' },
                    { label: 'Extra year-one depreciation vs 27.5-year straight line', value: extraDep, format: 'currency' },
                    { label: 'Tax savings before study cost', value: taxSavings, format: 'currency' }
                ]
            };
        },

        '1031-exchange-deferred-gain': function (input) {
            var salePrice = requireRange(num(input.salePrice), 0, 1e11, 'Enter a sale price of $0 or more.');
            var sellingCosts = requireRange(num(input.sellingCosts), 0, 1e11, 'Selling costs must be $0 or more.');
            var adjustedBasis = requireRange(num(input.adjustedBasis), 0, 1e11, 'Adjusted basis must be $0 or more.');
            var replacementPrice = requireRange(num(input.replacementPrice), 0, 1e11, 'Replacement price must be $0 or more.');
            var cashBoot = requireRange(num(input.cashBoot), 0, 1e11, 'Cash boot must be $0 or more.');
            var realized = salePrice - sellingCosts - adjustedBasis;
            var netEquity = Math.max(0, salePrice - sellingCosts);
            var buyDown = Math.max(0, netEquity - replacementPrice);
            var boot = Math.max(cashBoot, buyDown);
            var recognized = Math.max(0, Math.min(Math.max(0, realized), boot));
            var deferred = Math.max(0, realized) - recognized;
            return {
                headline: { label: 'Gain deferred', value: deferred, format: 'currency' },
                rows: [
                    { label: 'Realized gain', value: realized, format: 'currency' },
                    { label: 'Boot / cash not reinvested', value: boot, format: 'currency' },
                    { label: 'Gain recognized now', value: recognized, format: 'currency' },
                    { label: 'Replacement basis reduction', value: deferred, format: 'currency' }
                ]
            };
        },

        'bonus-depreciation-estimate': function (input) {
            var qualifying = requireRange(num(input.qualifyingBasis), 0, 1e11, 'Qualifying basis must be $0 or more.');
            var bonusPercent = requireRange(num(input.bonusPercent), 0, 100, 'Bonus percent must be 0 to 100.');
            var taxRate = requireRange(num(input.taxRate), 0, 100, 'Tax rate must be 0 to 100.');
            var bonus = qualifying * bonusPercent / 100;
            var savings = bonus * taxRate / 100;
            return {
                headline: { label: 'Estimated year-one tax savings', value: savings, format: 'currency' },
                rows: [
                    { label: 'Bonus depreciation taken', value: bonus, format: 'currency' },
                    { label: 'Remaining basis after bonus', value: qualifying - bonus, format: 'currency' }
                ]
            };
        },

        'depreciation-recapture': function (input) {
            var originalBasis = requireRange(num(input.originalBasis), 0, 1e11, 'Original basis must be $0 or more.');
            var accumDep = requireRange(num(input.accumulatedDepreciation), 0, 1e11, 'Accumulated depreciation must be $0 or more.');
            var salePrice = requireRange(num(input.salePrice), 0, 1e11, 'Sale price must be $0 or more.');
            var sellingCosts = requireRange(num(input.sellingCosts), 0, 1e11, 'Selling costs must be $0 or more.');
            var recaptureRate = requireRange(num(input.recaptureRate), 0, 100, 'Recapture rate must be 0 to 100.');
            var ltcgRate = requireRange(num(input.ltcgRate), 0, 100, 'Long-term rate must be 0 to 100.');
            var remainingBasis = Math.max(0, originalBasis - accumDep);
            var amountRealized = salePrice - sellingCosts;
            var gain = amountRealized - remainingBasis;
            var recapture = Math.max(0, Math.min(Math.max(0, gain), accumDep));
            var leftover = Math.max(0, gain - recapture);
            var recaptureTax = recapture * recaptureRate / 100;
            var ltcgTax = leftover * ltcgRate / 100;
            return {
                headline: { label: 'Estimated federal tax on the sale', value: recaptureTax + ltcgTax, format: 'currency' },
                rows: [
                    { label: 'Adjusted basis at sale', value: remainingBasis, format: 'currency' },
                    { label: 'Total gain', value: gain, format: 'currency' },
                    { label: 'Depreciation recapture amount', value: recapture, format: 'currency' },
                    { label: 'Recapture tax', value: recaptureTax, format: 'currency' },
                    { label: 'Remaining gain at long-term rate', value: leftover, format: 'currency' },
                    { label: 'Long-term capital gains tax', value: ltcgTax, format: 'currency' }
                ]
            };
        },

        'quarterly-estimated-tax': function (input) {
            var annual = requireRange(num(input.annualTax), 0, 1e11, 'Annual tax must be $0 or more.');
            var paid = requireRange(num(input.alreadyPaid), 0, 1e11, 'Amount already paid must be $0 or more.');
            var lastYear = requireRange(num(input.lastYearTax), 0, 1e11, 'Last year tax must be $0 or more.');
            var remaining = requireRange(num(input.remainingPayments), 1, 4, 'Remaining payments must be 1 to 4.');
            var highIncome = num(input.highIncome) ? 1.1 : 1;
            var due = Math.max(0, annual - paid);
            var perPayment = due / remaining;
            var safeHarbor = lastYear * highIncome;
            var safeDue = Math.max(0, safeHarbor - paid);
            var safeEach = safeDue / remaining;
            return {
                headline: { label: 'Next payment on current-year estimate', value: perPayment, format: 'currency' },
                rows: [
                    { label: 'Tax still due this year', value: due, format: 'currency' },
                    { label: 'Safe-harbor target', value: safeHarbor, format: 'currency' },
                    { label: 'Safe-harbor remaining', value: safeDue, format: 'currency' },
                    { label: 'Safe-harbor payment if split equally', value: safeEach, format: 'currency' }
                ]
            };
        },

        'qbi-deduction-estimate': function (input) {
            var qbi = requireRange(num(input.qbi), 0, 1e11, 'QBI must be $0 or more.');
            var taxable = requireRange(num(input.taxableIncome), 0, 1e11, 'Taxable income must be $0 or more.');
            var wages = requireRange(num(input.w2Wages), 0, 1e11, 'W-2 wages must be $0 or more.');
            var applyWageLimit = Boolean(num(input.applyWageLimit));
            var twentyQbi = qbi * 0.2;
            var twentyTaxable = taxable * 0.2;
            var wageCap = wages * 0.5;
            var deduction = Math.min(twentyQbi, twentyTaxable);
            if (applyWageLimit) deduction = Math.min(deduction, wageCap);
            return {
                headline: { label: 'Estimated QBI deduction', value: deduction, format: 'currency' },
                rows: [
                    { label: '20% of QBI', value: twentyQbi, format: 'currency' },
                    { label: '20% of taxable income', value: twentyTaxable, format: 'currency' },
                    { label: '50% of W-2 wages', value: wageCap, format: 'currency' }
                ]
            };
        },

        'scorp-vs-sole-prop': function (input) {
            var profit = requireRange(num(input.profit), 0, 1e11, 'Profit must be $0 or more.');
            var salary = requireRange(num(input.salary), 0, 1e11, 'Salary must be $0 or more.');
            if (salary > profit) throw new Error('Reasonable salary cannot exceed profit.');
            var sole = selfEmploymentTax(profit);
            var corp = payrollTaxOnSalary(salary);
            var distributions = profit - salary;
            var saved = sole.total - corp.total;
            return {
                headline: { label: 'Payroll / SE tax saved with an S corp', value: saved, format: 'currency' },
                rows: [
                    { label: 'Sole-prop self-employment tax', value: sole.total, format: 'currency' },
                    { label: 'S-corp employer + employee FICA', value: corp.total, format: 'currency' },
                    { label: 'S-corp distributions (not SE-taxed here)', value: distributions, format: 'currency' }
                ]
            };
        },

        'fire-number': function (input) {
            var spend = requireRange(num(input.annualSpend), 0, 1e11, 'Annual spend must be $0 or more.');
            var swr = requireRange(num(input.swr), 0.1, 20, 'Withdrawal rate must be between 0.1% and 20%.');
            var current = requireRange(num(input.currentPortfolio), 0, 1e11, 'Current portfolio must be $0 or more.');
            var target = spend / (swr / 100);
            var gap = Math.max(0, target - current);
            return {
                headline: { label: 'Portfolio needed', value: target, format: 'currency' },
                rows: [
                    { label: 'Annual withdrawal at that size', value: spend, format: 'currency' },
                    { label: 'Gap vs current portfolio', value: gap, format: 'currency' },
                    { label: 'Years of spending covered now', value: current === 0 ? 0 : current / spend, format: 'number' }
                ]
            };
        },

        'four-percent-rule': function (input) {
            var portfolio = requireRange(num(input.portfolio), 0, 1e11, 'Portfolio must be $0 or more.');
            var swr = requireRange(num(input.swr), 0.1, 20, 'Withdrawal rate must be between 0.1% and 20%.');
            var annual = portfolio * swr / 100;
            return {
                headline: { label: 'First-year withdrawal', value: annual, format: 'currency' },
                rows: [
                    { label: 'Monthly withdrawal', value: annual / 12, format: 'currency' },
                    { label: 'Portfolio multiple of spending', value: swr === 0 ? 0 : 100 / swr, format: 'number' }
                ]
            };
        },

        'rule-of-72': function (input) {
            var rate = requireRange(num(input.rate), 0.01, 100, 'Return must be above 0%.');
            var years = 72 / rate;
            var amount = requireRange(num(input.startingAmount), 0, 1e11, 'Starting amount must be $0 or more.');
            return {
                headline: { label: 'Years to double', value: years, format: 'number' },
                rows: [
                    { label: 'Doubled value', value: amount * 2, format: 'currency' },
                    { label: 'Exact compound years at this rate', value: Math.log(2) / Math.log(1 + rate / 100), format: 'number' }
                ]
            };
        },

        'dividend-reinvestment': function (input) {
            var principal = requireRange(num(input.principal), 0, 1e11, 'Principal must be $0 or more.');
            var yieldPct = requireRange(num(input.yieldPct), 0, 50, 'Yield must be 0% to 50%.');
            var years = requireRange(num(input.years), 0, 80, 'Years must be 0 to 80.');
            var monthly = requireRange(num(input.monthlyAdd), 0, 1e9, 'Monthly add must be $0 or more.');
            var ending = futureValue(principal, yieldPct, years, monthly);
            var contributed = principal + monthly * 12 * years;
            return {
                headline: { label: 'Ending value with DRIP', value: ending, format: 'currency' },
                rows: [
                    { label: 'Cash you put in', value: contributed, format: 'currency' },
                    { label: 'Dividends and growth', value: ending - contributed, format: 'currency' }
                ]
            };
        },

        'roth-vs-traditional': function (input) {
            var contrib = requireRange(num(input.contribution), 0, 1e9, 'Contribution must be $0 or more.');
            var currentRate = requireRange(num(input.currentRate), 0, 60, 'Current tax rate must be 0 to 60.');
            var retireRate = requireRange(num(input.retireRate), 0, 60, 'Retirement tax rate must be 0 to 60.');
            var years = requireRange(num(input.years), 0, 80, 'Years must be 0 to 80.');
            var growth = requireRange(num(input.growth), 0, 30, 'Growth must be 0% to 30%.');
            var fv = futureValue(contrib, growth, years, 0);
            var traditionalSameContrib = fv * (1 - retireRate / 100);
            var rothSameContrib = fv;
            var rothSamePaycheck = futureValue(contrib * (1 - currentRate / 100), growth, years, 0);
            var traditionalSamePaycheck = traditionalSameContrib;
            return {
                headline: { label: 'Roth advantage on the same paycheck', value: rothSamePaycheck - traditionalSamePaycheck, format: 'currency' },
                rows: [
                    { label: 'Traditional after-tax (same $ contributed)', value: traditionalSameContrib, format: 'currency' },
                    { label: 'Roth after-tax (same $ contributed)', value: rothSameContrib, format: 'currency' },
                    { label: 'Roth after-tax (same paycheck cost)', value: rothSamePaycheck, format: 'currency' }
                ]
            };
        },

        'heloc-payment': function (input) {
            var drawn = requireRange(num(input.drawn), 0, 1e11, 'Drawn amount must be $0 or more.');
            var rate = requireRange(num(input.rate), 0, 40, 'Rate must be 0% to 40%.');
            var years = requireRange(num(input.years), 1, 40, 'Term must be 1 to 40 years.');
            var interestOnly = drawn * rate / 100 / 12;
            var amortizing = payment(drawn, rate, years);
            return {
                headline: { label: 'Amortizing monthly payment', value: amortizing, format: 'currency' },
                rows: [
                    { label: 'Interest-only monthly payment', value: interestOnly, format: 'currency' },
                    { label: 'Monthly principal if amortizing', value: amortizing - interestOnly, format: 'currency' },
                    { label: 'Total interest if fully amortized', value: amortizing * years * 12 - drawn, format: 'currency' }
                ]
            };
        },

        'pmi-removal': function (input) {
            var loan = requireRange(num(input.loan), 1, 1e11, 'Loan balance must be above $0.');
            var value = requireRange(num(input.value), 1, 1e11, 'Home value must be above $0.');
            var rate = requireRange(num(input.rate), 0, 20, 'Rate must be 0% to 20%.');
            var years = requireRange(num(input.years), 1, 40, 'Term must be 1 to 40 years.');
            var extra = requireRange(num(input.extra), 0, 1e7, 'Extra payment must be $0 or more.');
            var pmi = requireRange(num(input.pmiMonthly), 0, 1e6, 'PMI must be $0 or more.');
            var target = 80;
            var result = monthsToLtv(loan, value, rate, years, extra, target);
            var currentLtv = loan / value * 100;
            var equityNeeded = Math.max(0, loan - value * 0.8);
            var pmiSaved = result.reachable ? pmi * Math.max(0, Math.round(num(years) * 12) - result.months) : 0;
            return {
                headline: result.reachable
                    ? { label: 'Months until 80% LTV', value: result.months, format: 'integer' }
                    : { label: 'Does not reach 80% LTV on this schedule', value: 'Not reachable', format: 'plain' },
                rows: [
                    { label: 'Current LTV', value: currentLtv, format: 'percent' },
                    { label: 'Principal to reach 80% LTV', value: equityNeeded, format: 'currency' },
                    { label: 'PMI still paid before removal', value: result.reachable ? pmi * result.months : pmi * years * 12, format: 'currency' },
                    { label: 'PMI avoided after removal (remaining term)', value: pmiSaved, format: 'currency' }
                ]
            };
        },

        'extra-payment-priority': function (input) {
            var mortgage = requireRange(num(input.mortgageBalance), 0, 1e11, 'Mortgage balance must be $0 or more.');
            var mortgageRate = requireRange(num(input.mortgageRate), 0, 30, 'Mortgage rate must be 0% to 30%.');
            var mortgageYears = requireRange(num(input.mortgageYears), 1, 40, 'Mortgage term must be 1 to 40 years.');
            var consumer = requireRange(num(input.consumerBalance), 0, 1e11, 'Consumer balance must be $0 or more.');
            var consumerRate = requireRange(num(input.consumerRate), 0, 80, 'Consumer rate must be 0% to 80%.');
            var consumerYears = requireRange(num(input.consumerYears), 1, 40, 'Consumer term must be 1 to 40 years.');
            var extra = requireRange(num(input.extra), 0, 1e7, 'Extra payment must be $0 or more.');
            var mortgageBase = payoffSchedule(mortgage, mortgageRate, mortgageYears, 0);
            var mortgageExtra = payoffSchedule(mortgage, mortgageRate, mortgageYears, extra);
            var consumerBase = payoffSchedule(consumer, consumerRate, consumerYears, 0);
            var consumerExtra = payoffSchedule(consumer, consumerRate, consumerYears, extra);
            var mortgageSave = (mortgageBase.interest || 0) - (mortgageExtra.interest || 0);
            var consumerSave = (consumerBase.interest || 0) - (consumerExtra.interest || 0);
            var winner = consumerSave > mortgageSave ? 'Consumer debt' : 'Mortgage';
            return {
                headline: { label: 'Higher-leverage extra payment', value: winner, format: 'plain' },
                rows: [
                    { label: 'Interest saved applying extra to the mortgage', value: mortgageSave, format: 'currency' },
                    { label: 'Interest saved applying extra to consumer debt', value: consumerSave, format: 'currency' },
                    { label: 'Mortgage months saved', value: (mortgageBase.months || 0) - (mortgageExtra.months || 0), format: 'integer' },
                    { label: 'Consumer months saved', value: (consumerBase.months || 0) - (consumerExtra.months || 0), format: 'integer' }
                ]
            };
        },

        'credit-utilization': function (input) {
            var balances = requireRange(num(input.balances), 0, 1e9, 'Balances must be $0 or more.');
            var limits = requireRange(num(input.limits), 1, 1e9, 'Limits must be above $0.');
            if (balances > limits) throw new Error('Balances cannot exceed limits.');
            var util = balances / limits * 100;
            var toThirty = Math.max(0, balances - limits * 0.3);
            var toTen = Math.max(0, balances - limits * 0.1);
            return {
                headline: { label: 'Utilization', value: util, format: 'percent' },
                rows: [
                    { label: 'Headroom already available', value: limits - balances, format: 'currency' },
                    { label: 'Paydown to reach 30%', value: toThirty, format: 'currency' },
                    { label: 'Paydown to reach 10%', value: toTen, format: 'currency' }
                ]
            };
        },

        'str-break-even-occupancy': function (input) {
            var monthlyCosts = requireRange(num(input.monthlyCosts), 0, 1e9, 'Monthly costs must be $0 or more.');
            var adr = requireRange(num(input.adr), 1, 1e6, 'Nightly rate must be above $0.');
            var feePercent = requireRange(num(input.feePercent), 0, 50, 'Fee percent must be 0 to 50.');
            var days = 365 / 12;
            var netNight = adr * (1 - feePercent / 100);
            var nightsNeeded = netNight === 0 ? 0 : monthlyCosts / netNight;
            var occupancy = nightsNeeded / days * 100;
            return {
                headline: { label: 'Break-even occupancy', value: occupancy, format: 'percent' },
                rows: [
                    { label: 'Net per occupied night', value: netNight, format: 'currency' },
                    { label: 'Occupied nights needed per month', value: nightsNeeded, format: 'number' },
                    { label: 'Days in an average month', value: days, format: 'number' }
                ]
            };
        },

        'str-adr-needed': function (input) {
            var monthlyCosts = requireRange(num(input.monthlyCosts), 0, 1e9, 'Monthly costs must be $0 or more.');
            var occupancy = requireRange(num(input.occupancy), 1, 100, 'Occupancy must be 1% to 100%.');
            var feePercent = requireRange(num(input.feePercent), 0, 50, 'Fee percent must be 0 to 50.');
            var profit = requireRange(num(input.targetProfit), 0, 1e9, 'Target profit must be $0 or more.');
            var nights = occupancy / 100 * (365 / 12);
            var netNeeded = nights === 0 ? 0 : (monthlyCosts + profit) / nights;
            var adr = netNeeded / (1 - feePercent / 100);
            return {
                headline: { label: 'Nightly rate needed', value: adr, format: 'currency' },
                rows: [
                    { label: 'Occupied nights per month', value: nights, format: 'number' },
                    { label: 'Net per night after platform fees', value: netNeeded, format: 'currency' }
                ]
            };
        },

        'str-cleaning-turnover-cost': function (input) {
            var turnovers = requireRange(num(input.turnovers), 0, 60, 'Turnovers must be 0 to 60 a month.');
            var cost = requireRange(num(input.cost), 0, 1e6, 'Cleaning cost must be $0 or more.');
            var supplies = requireRange(num(input.supplies), 0, 1e6, 'Supplies must be $0 or more.');
            var laundry = requireRange(num(input.laundry), 0, 1e6, 'Laundry must be $0 or more.');
            var monthly = turnovers * (cost + supplies + laundry);
            return {
                headline: { label: 'Monthly turnover cost', value: monthly, format: 'currency' },
                rows: [
                    { label: 'Cost per turnover', value: cost + supplies + laundry, format: 'currency' },
                    { label: 'Annual turnover cost', value: monthly * 12, format: 'currency' }
                ]
            };
        },

        'midterm-vs-str': function (input) {
            var strNightly = requireRange(num(input.strNightly), 0, 1e6, 'STR nightly rate must be $0 or more.');
            var strOcc = requireRange(num(input.strOccupancy), 0, 100, 'STR occupancy must be 0 to 100.');
            var strFees = requireRange(num(input.strFees), 0, 50, 'STR fees must be 0 to 50.');
            var strOps = requireRange(num(input.strOps), 0, 1e7, 'STR ops must be $0 or more.');
            var mtrRent = requireRange(num(input.mtrRent), 0, 1e7, 'Midterm rent must be $0 or more.');
            var mtrVacancy = requireRange(num(input.mtrVacancy), 0, 100, 'Midterm vacancy must be 0 to 100.');
            var mtrOps = requireRange(num(input.mtrOps), 0, 1e7, 'Midterm ops must be $0 or more.');
            var strGross = strNightly * (strOcc / 100) * (365 / 12) * (1 - strFees / 100);
            var strNet = strGross - strOps;
            var mtrNet = mtrRent * (1 - mtrVacancy / 100) - mtrOps;
            return {
                headline: { label: 'Monthly edge for STR vs midterm', value: strNet - mtrNet, format: 'currency' },
                rows: [
                    { label: 'STR monthly net', value: strNet, format: 'currency' },
                    { label: 'Midterm monthly net', value: mtrNet, format: 'currency' },
                    { label: 'STR gross after platform fees', value: strGross, format: 'currency' }
                ]
            };
        },

        'cap-rate': function (input) {
            var noi = requireRange(num(input.noi), -1e9, 1e11, 'NOI must be a number.');
            var price = requireRange(num(input.price), 1, 1e11, 'Price must be above $0.');
            var cap = noi / price * 100;
            return {
                headline: { label: 'Cap rate', value: cap, format: 'percent' },
                rows: [
                    { label: 'Years of NOI to recover price', value: noi === 0 ? 0 : price / noi, format: 'number' },
                    { label: 'NOI per $100,000 of price', value: noi / price * 100000, format: 'currency' }
                ]
            };
        },

        'cash-on-cash-return': function (input) {
            var rent = requireRange(num(input.rent), 0, 1e9, 'Monthly rent must be $0 or more.');
            var vacancy = requireRange(num(input.vacancy), 0, 100, 'Vacancy must be 0 to 100.');
            var ops = requireRange(num(input.ops), 0, 1e9, 'Operating costs must be $0 or more.');
            var debt = requireRange(num(input.debt), 0, 1e9, 'Debt service must be $0 or more.');
            var cashIn = requireRange(num(input.cashIn), 1, 1e11, 'Cash invested must be above $0.');
            var annualCf = (rent * (1 - vacancy / 100) - ops - debt) * 12;
            var coc = annualCf / cashIn * 100;
            return {
                headline: { label: 'Cash-on-cash return', value: coc, format: 'percent' },
                rows: [
                    { label: 'Monthly cash flow', value: annualCf / 12, format: 'currency' },
                    { label: 'Annual cash flow', value: annualCf, format: 'currency' }
                ]
            };
        },

        dscr: function (input) {
            var noi = requireRange(num(input.noi), -1e9, 1e11, 'NOI must be a number.');
            var loan = requireRange(num(input.loan), 0, 1e11, 'Loan must be $0 or more.');
            var rate = requireRange(num(input.rate), 0, 30, 'Rate must be 0% to 30%.');
            var years = requireRange(num(input.years), 1, 40, 'Term must be 1 to 40 years.');
            var annualDebt = payment(loan, rate, years) * 12;
            var ratio = annualDebt === 0 ? 0 : noi / annualDebt;
            return {
                headline: { label: 'DSCR', value: ratio, format: 'number' },
                rows: [
                    { label: 'Annual debt service', value: annualDebt, format: 'currency' },
                    { label: 'NOI cushion above debt', value: noi - annualDebt, format: 'currency' }
                ]
            };
        },

        'brrrr-analysis': function (input) {
            var purchase = requireRange(num(input.purchase), 0, 1e11, 'Purchase must be $0 or more.');
            var rehab = requireRange(num(input.rehab), 0, 1e11, 'Rehab must be $0 or more.');
            var arv = requireRange(num(input.arv), 1, 1e11, 'ARV must be above $0.');
            var ltv = requireRange(num(input.ltv), 0, 90, 'Refinance LTV must be 0 to 90.');
            var rent = requireRange(num(input.rent), 0, 1e9, 'Rent must be $0 or more.');
            var vacancy = requireRange(num(input.vacancy), 0, 100, 'Vacancy must be 0 to 100.');
            var ops = requireRange(num(input.ops), 0, 1e9, 'Ops must be $0 or more.');
            var rate = requireRange(num(input.rate), 0, 30, 'Rate must be 0% to 30%.');
            var years = requireRange(num(input.years), 1, 40, 'Term must be 1 to 40 years.');
            var allIn = purchase + rehab;
            var refi = arv * ltv / 100;
            var cashLeft = allIn - refi;
            var debt = payment(refi, rate, years);
            var monthlyCf = rent * (1 - vacancy / 100) - ops - debt;
            var coc = cashLeft > 0 ? monthlyCf * 12 / cashLeft * 100 : null;
            return {
                headline: { label: 'Cash left in after refinance', value: cashLeft, format: 'currency' },
                rows: [
                    { label: 'All-in cost', value: allIn, format: 'currency' },
                    { label: 'Refinance proceeds', value: refi, format: 'currency' },
                    { label: 'Monthly cash flow after refinance', value: monthlyCf, format: 'currency' },
                    {
                        label: 'Cash-on-cash on remaining cash',
                        value: coc === null ? (cashLeft < 0 ? 'Cash-out refinance' : 'n/a') : coc,
                        format: coc === null ? 'plain' : 'percent'
                    }
                ]
            };
        },

        'house-hack-cash-flow': function (input) {
            var piti = requireRange(num(input.piti), 0, 1e9, 'PITI must be $0 or more.');
            var rent = requireRange(num(input.rent), 0, 1e9, 'Unit rent must be $0 or more.');
            var vacancy = requireRange(num(input.vacancy), 0, 100, 'Vacancy must be 0 to 100.');
            var ops = requireRange(num(input.ops), 0, 1e9, 'Owner occupancy costs must be $0 or more.');
            var effectiveRent = rent * (1 - vacancy / 100);
            var netHousing = piti + ops - effectiveRent;
            return {
                headline: { label: 'Net monthly housing cost', value: netHousing, format: 'currency' },
                rows: [
                    { label: 'Effective rent from other units / rooms', value: effectiveRent, format: 'currency' },
                    { label: 'Share of PITI covered by rent', value: piti === 0 ? 0 : effectiveRent / piti * 100, format: 'percent' }
                ]
            };
        }
    };

    function compute(slug, input) {
        var fn = registry[slug];
        if (!fn) throw new Error('Unknown calculator: ' + slug);
        return fn(input || {});
    }

    var api = {
        SS_WAGE_BASE_2026: SS_WAGE_BASE_2026,
        compute: compute,
        formatValue: formatValue,
        payment: payment,
        futureValue: futureValue,
        selfEmploymentTax: selfEmploymentTax,
        slugs: Object.keys(registry)
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.OperatorCalculatorModels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
