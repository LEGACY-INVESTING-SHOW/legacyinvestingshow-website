(function () {
    'use strict';
    const tables = JSON.parse(document.getElementById('tax-tables').textContent);
    const byId = id => document.getElementById(id);
    const rentalKeys = ['expensePercent', 'propertyValue', 'landPercent', 'recoveryYears', 'accelerated'];
    const splitKeys = ['splitWages', 'splitGains', 'splitRental'];
    const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.abs(value) < 0.005 ? 0 : value);
    const percent = (value, amount) => `${(amount ? value / amount * 100 : 0).toFixed(1)}%`;
    const range = byId('amount-range');
    let lastResult;
    function set(name, value) {
        document.querySelectorAll(`[data-value="${name}"]`).forEach(element => { element.textContent = value; });
    }
    function readNumber(id) {
        return byId(id).value.trim() === '' ? NaN : Number(byId(id).value);
    }
    function readRadio(name, fallback) {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : fallback;
    }
    function setRadio(name, value) {
        const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input) input.checked = true;
    }
    function syncAmountControls() {
        const amount = readNumber('amount');
        if (Number.isFinite(amount)) range.value = Math.min(Number(range.max), Math.max(Number(range.min), amount));
    }
    function syncMode() {
        const mode = readRadio('mode', 'compare');
        document.querySelectorAll('[data-mode]').forEach(element => { element.hidden = element.dataset.mode !== mode; });
        byId('split-fields').hidden = mode !== 'split';
    }
    function syncSplit() {
        const sum = splitKeys.reduce((total, key) => total + (Number.isFinite(readNumber(key)) ? readNumber(key) : 0), 0);
        const badge = byId('split-sum');
        badge.textContent = `${Math.round(sum)}%`;
        badge.classList.toggle('off', Math.abs(sum - 100) > 0.01);
        splitKeys.forEach(key => { byId(key + '-range').value = readNumber(key) || 0; });
    }
    function syncDefaults() {
        const useDefaults = byId('carousel-defaults').checked;
        rentalKeys.forEach(key => {
            byId(key).disabled = useDefaults;
            if (useDefaults) byId(key).value = tables.rental[key];
            if (useDefaults && key === 'accelerated' && byId('preset').value === 'updated') {
                byId(key).value = 60000 - tables.rental.propertyValue * (1 - tables.rental.landPercent / 100) / tables.rental.recoveryYears;
            }
        });
        byId('preset').disabled = !useDefaults;
        if (!useDefaults) byId('advanced').open = true;
    }
    function expenseLabel(rental) {
        return Math.abs(rental.expensePercent - 70.33333333333333) < 0.001 ? '70⅓%' : `${Number(rental.expensePercent.toFixed(1))}%`;
    }
    function assumptionLine(rental, r) {
        return `${expenseLabel(rental)} expenses, ${money(rental.propertyValue)} property, ${Number(rental.landPercent.toFixed(1))}% land, ${rental.recoveryYears}-year depreciation, ${money(r.accelerated)} accelerated`;
    }
    function drawBar(name, tax, base, restText) {
        const fill = byId(name + '-bar');
        const rest = byId(name + '-rest');
        const share = base ? Math.min(1, tax / base) : 0;
        fill.style.width = `${(share * 100).toFixed(2)}%`;
        fill.classList.toggle('tight', share < 0.2);
        const lead = share < 0.2 && tax > 0.5 ? `<span class="lead">${money(tax)}</span>` : '';
        rest.innerHTML = lead + restText;
    }
    function render() {
        const defaults = byId('carousel-defaults').checked;
        const preset = defaults ? byId('preset').value : 'custom';
        const mode = readRadio('mode', 'compare');
        const rental = Object.fromEntries(rentalKeys.map(key => [key, defaults ? tables.rental[key] : readNumber(key)]));
        rental.preset = preset;
        syncAmountControls();
        syncMode();
        syncSplit();
        try {
            const status = readRadio('status', 'single');
            const amount = readNumber('amount');
            const result = mode === 'split'
                ? TaxStructure.calculateSplit({ amount, status, rental, split: { wages: readNumber('splitWages'), gains: readNumber('splitGains'), rental: readNumber('splitRental') } }, tables)
                : TaxStructure.calculate({ amount, status, rental }, tables);
            lastResult = result;
            const w = result.wages;
            const g = result.gains;
            const r = result.rental;
            const wagesAmount = mode === 'split' ? w.amount : result.amount;
            const gainsAmount = mode === 'split' ? g.amount : result.amount;
            const rentalAmount = mode === 'split' ? r.amount : result.amount;
            const loss = r.taxableRental < -0.5;
            const values = {
                amountLabel: result.amount, standardDeduction: result.deduction,
                wagesAmount, gainsAmount, rentalAmount,
                wagesTotal: w.total, incomeTax: w.incomeTax, socialSecurity: w.socialSecurity,
                medicare: w.medicare, additionalMedicare: w.additionalMedicare, wagesRetained: wagesAmount - w.total,
                gainsTotal: g.total, capitalGainsTax: g.capitalGainsTax, niit: g.niit, gainsRetained: gainsAmount - g.total,
                rentalResult: r.taxableRental, expenses: -r.expenses, cashBeforeTax: r.cashBeforeTax,
                standardDepreciation: -r.standardDepreciation, acceleratedDepreciation: -r.accelerated,
                rentalTax: r.total, rentalTaxLine: r.total, rentalRetained: r.cashBeforeTax - r.total
            };
            Object.entries(values).forEach(([key, value]) => set(key, money(value)));
            set('wagesRate', percent(w.total, wagesAmount));
            set('gainsRate', percent(g.total, gainsAmount));
            set('rentalRate', percent(r.total, rentalAmount));
            set('expensePercentLabel', expenseLabel(rental));
            document.querySelectorAll('[data-value="rentalResult"]').forEach(element => element.classList.toggle('loss', loss));
            document.querySelectorAll('[data-label="rentalResult"]').forEach(element => { element.textContent = loss ? 'Paper loss on the return' : 'Taxable rental income'; });
            byId('rental-keep-label').textContent = loss ? 'Paper loss, not a refund' : `${percent(r.total, rentalAmount)} of rent`;
            document.querySelector('[data-row="additionalMedicare"]').hidden = w.additionalMedicare < 0.5;
            drawBar('wages', w.total, wagesAmount, `${percent(w.total, wagesAmount)} gone`);
            drawBar('gains', g.total, gainsAmount, `${percent(g.total, gainsAmount)} gone`);
            drawBar('rental', r.total, rentalAmount, loss
                ? `$0 tax · ${money(-r.taxableRental)} paper loss`
                : `${percent(r.total, rentalAmount)} gone on ${money(r.taxableRental)} taxable`);
            if (r.total < 0.5 && !loss) byId('rental-rest').innerHTML = `$0 tax · ${money(r.taxableRental)} taxable, under the deduction`;
            if (mode === 'split') {
                set('splitTotal', money(result.total));
                set('splitRate', percent(result.total, result.amount));
                set('allWages', money(result.allWages));
                set('allWagesRate', percent(result.allWages, result.amount));
                set('splitRetained', money(result.amount - r.expenses - result.total));
            }
            byId('assumption-line').textContent = assumptionLine(rental, r);
            byId('error').hidden = true;
            byId('results').hidden = false;
            byId('rental-note').textContent = loss
                ? 'The paper loss is not a refund and is not used to offset the other income here. Whether it can be deducted now or carried forward depends on passive-activity, basis and at-risk rules.'
                : 'Rental profit is taxed as ordinary income, plus the investment surtax when it applies. Rental losses never automatically offset wages in this model.';
            byId('preset-note').textContent = preset === 'updated'
                ? 'Updated carousel: $60,000 total depreciation. The $150,000 example produces a $15,500 paper loss.'
                : preset === 'brief'
                    ? 'Original carousel: $29,091 building depreciation plus $60,000 accelerated. The $150,000 example produces a $44,591 paper loss.'
                    : 'Custom: building basis ÷ recovery years, plus the accelerated amount you enter. Enter only the extra first-year deduction above the straight-line baseline. This is not a cost-segregation calculation.';
            byId('result-status').textContent = mode === 'split'
                ? `Results updated. Total federal tax on this split: ${money(result.total)}. If all wages: ${money(result.allWages)}.`
                : `Results updated. Wages: ${money(w.total)}. Long-term gains: ${money(g.total)}. Rental tax: ${money(r.total)}, taxable result ${money(r.taxableRental)}.`;
        } catch (error) {
            lastResult = null;
            byId('error').textContent = error.message;
            byId('error').hidden = false;
            byId('results').hidden = true;
            byId('result-status').textContent = 'Results unavailable. Check the message above the results.';
        }
    }
    const query = new URLSearchParams(location.search);
    if (query.get('rental') === 'updated') byId('preset').value = 'updated';
    byId('carousel-defaults').addEventListener('change', () => { syncDefaults(); render(); });
    byId('preset').addEventListener('change', () => { syncDefaults(); render(); });
    ['amount', ...rentalKeys, ...splitKeys].forEach(id => {
        byId(id).addEventListener('input', render);
        byId(id).addEventListener('change', render);
    });
    document.querySelectorAll('input[name="status"], input[name="mode"]').forEach(input => input.addEventListener('change', render));
    range.addEventListener('input', () => {
        byId('amount').value = range.value;
        render();
    });
    splitKeys.forEach(key => byId(key + '-range').addEventListener('input', () => {
        byId(key).value = byId(key + '-range').value;
        render();
    }));
    byId('reset').addEventListener('click', () => {
        byId('amount').value = tables.defaultAmount;
        byId('advanced').open = false;
        setRadio('status', 'single');
        setRadio('mode', 'compare');
        byId('splitWages').value = 60;
        byId('splitGains').value = 20;
        byId('splitRental').value = 20;
        byId('carousel-defaults').checked = true;
        byId('preset').value = query.get('rental') === 'updated' ? 'updated' : 'brief';
        syncDefaults();
        render();
    });
    syncDefaults();
    render();
})();
