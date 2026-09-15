(function () {
    'use strict';

    var specNode = document.getElementById('operator-spec');
    var form = document.getElementById('operator-form');
    var resultRoot = document.getElementById('operator-result');
    var models = window.OperatorCalculatorModels;
    if (!specNode || !form || !resultRoot || !models) return;

    var spec = JSON.parse(specNode.textContent);
    var defaults = {};
    spec.inputs.forEach(function (input) {
        defaults[input.id] = input.default;
    });

    function readInputs() {
        var values = {};
        spec.inputs.forEach(function (input) {
            var field = form.querySelector('[name="' + input.id + '"]');
            values[input.id] = field ? field.value : input.default;
        });
        return values;
    }

    function writeInputs(values) {
        spec.inputs.forEach(function (input) {
            var field = form.querySelector('[name="' + input.id + '"]');
            if (field && values[input.id] !== undefined) field.value = values[input.id];
        });
    }

    function renderResult(result) {
        var rows = (result.rows || []).map(function (row) {
            return '<div class="flex items-baseline justify-between gap-4 border-t border-line/80 pt-2 text-[14px]">' +
                '<span class="text-ink-muted">' + escapeHtml(row.label) + '</span>' +
                '<span class="tabular font-medium text-ink">' + escapeHtml(models.formatValue(row.value, row.format)) + '</span>' +
                '</div>';
        }).join('');
        resultRoot.innerHTML =
            '<p class="text-[13px] font-medium text-ink-muted">' + escapeHtml(result.headline.label) + '</p>' +
            '<p class="mt-1 text-[32px] font-semibold tracking-tight tabular text-ink">' +
            escapeHtml(models.formatValue(result.headline.value, result.headline.format)) + '</p>' +
            (rows ? '<div class="mt-4 space-y-2">' + rows + '</div>' : '');
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function calculate() {
        try {
            var result = models.compute(spec.slug, readInputs());
            renderResult(result);
            if (window.dataLayer) {
                window.dataLayer.push({ event: 'tool_calculate', tool_slug: spec.slug });
            }
        } catch (error) {
            resultRoot.innerHTML =
                '<p class="text-[13px] font-medium text-ink-muted">Check the inputs</p>' +
                '<p class="mt-1 text-[16px] leading-6 text-ink">' + escapeHtml(error.message) + '</p>';
        }
    }

    form.addEventListener('input', calculate);
    form.addEventListener('change', calculate);

    var reset = document.getElementById('operator-reset');
    if (reset) {
        reset.addEventListener('click', function () {
            writeInputs(defaults);
            calculate();
        });
    }

    document.querySelectorAll('[data-example-index]').forEach(function (button) {
        button.addEventListener('click', function () {
            var example = spec.examples[Number(button.getAttribute('data-example-index'))];
            if (!example) return;
            writeInputs(example.inputs);
            document.querySelectorAll('[data-example-index]').forEach(function (other) {
                other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
                other.textContent = other === button ? 'Selected' : 'Use this example';
                other.className = other === button
                    ? 'mt-4 self-start rounded-[6px] px-3 py-1.5 text-[13px] font-medium bg-accent text-paper-raised'
                    : 'mt-4 self-start rounded-[6px] px-3 py-1.5 text-[13px] font-medium border border-line text-ink hover:border-accent hover:bg-accent-soft';
            });
            calculate();
        });
    });

    if (window.dataLayer) {
        window.dataLayer.push({ event: 'tool_view', tool_slug: spec.slug });
    }
})();
