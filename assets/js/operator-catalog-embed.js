/*! operator catalog embed */
(function () {
  var tools = [{"slug":"cost-segregation-savings","title":"Cost segregation savings","question":"How much extra year-one depreciation tax savings could a study produce?","category":"taxes-payroll"},{"slug":"1031-exchange-deferred-gain","title":"1031 exchange deferred gain","question":"How much gain is deferred if you replace a rental and how much boot is taxed now?","category":"taxes-payroll"},{"slug":"bonus-depreciation-estimate","title":"Bonus depreciation estimate","question":"What year-one deduction does a bonus percentage create on qualifying basis?","category":"taxes-payroll"},{"slug":"depreciation-recapture","title":"Depreciation recapture","question":"How much of a rental sale is recapture versus long-term capital gain?","category":"taxes-payroll"},{"slug":"quarterly-estimated-tax","title":"Quarterly estimated tax","question":"What should each remaining estimated payment be, and what does safe harbor require?","category":"taxes-payroll"},{"slug":"qbi-deduction-estimate","title":"QBI deduction estimate","question":"What 20% qualified business income deduction survives a simple wage limitation?","category":"taxes-payroll"},{"slug":"scorp-vs-sole-prop","title":"S corp vs sole prop tax","question":"How much self-employment tax might an S corp salary split save versus Schedule C?","category":"taxes-payroll"},{"slug":"fire-number","title":"FIRE number","question":"What portfolio would cover your spending at the withdrawal rate you choose?","category":"money"},{"slug":"four-percent-rule","title":"4% rule withdrawal","question":"What first-year withdrawal does your portfolio support at the rate you choose?","category":"money"},{"slug":"rule-of-72","title":"Rule of 72","question":"How long until this return doubles the money, and what is the exact compound time?","category":"money"},{"slug":"dividend-reinvestment","title":"Dividend reinvestment","question":"What could reinvested dividends and monthly adds grow to at a constant yield?","category":"money"},{"slug":"roth-vs-traditional","title":"Roth vs Traditional","question":"Which account wins after tax if rates today and in retirement are different?","category":"money"},{"slug":"heloc-payment","title":"HELOC payment","question":"What is the interest-only cost of a drawn HELOC versus a fully amortizing payment?","category":"banking-borrowing"},{"slug":"pmi-removal","title":"PMI removal","question":"How many months until the loan reaches 80% LTV so PMI can drop?","category":"banking-borrowing"},{"slug":"extra-payment-priority","title":"Extra payment priority","question":"Should extra cash hit the mortgage or higher-rate consumer debt first?","category":"banking-borrowing"},{"slug":"credit-utilization","title":"Credit utilization","question":"What percent of revolving limits is used, and how much paydown reaches 30% or 10%?","category":"banking-borrowing"},{"slug":"str-break-even-occupancy","title":"STR break-even occupancy","question":"What occupancy keeps a short-term rental from losing money at this nightly rate?","category":"housing-moving"},{"slug":"str-adr-needed","title":"STR ADR needed","question":"What nightly rate covers costs and your target profit at this occupancy?","category":"housing-moving"},{"slug":"str-cleaning-turnover-cost","title":"STR cleaning & turnover","question":"What do turnovers really cost each month once cleaner, supplies, and laundry are included?","category":"housing-moving"},{"slug":"midterm-vs-str","title":"Midterm vs STR","question":"Does nightly STR net more than a furnished midterm lease after fees and ops?","category":"housing-moving"},{"slug":"cap-rate","title":"Cap rate","question":"What capitalization rate does this rental's NOI produce at the price you would pay?","category":"housing-moving"},{"slug":"cash-on-cash-return","title":"Cash-on-cash return","question":"What cash-on-cash return remains after vacancy, operating costs, and debt service?","category":"housing-moving"},{"slug":"dscr","title":"DSCR","question":"Does net operating income cover the annual mortgage by the ratio a DSCR lender wants?","category":"housing-moving"},{"slug":"brrrr-analysis","title":"BRRRR analysis","question":"How much cash stays in a buy-rehab-rent-refinance deal, and what cash flow is left?","category":"housing-moving"},{"slug":"house-hack-cash-flow","title":"House hack cash flow","question":"What is your net housing cost after rent from other units or rooms?","category":"housing-moving"}];
  var SECTION_ID = "operator-calculators";

  function card(tool) {
    return '<a data-operator-tool="' + tool.slug + '" class="flex items-start justify-between gap-4 border-b border-line px-1 py-3.5 transition-colors hover:bg-accent-soft/50" href="/tools/' + tool.slug + '"><div class="min-w-0"><span class="text-[15px] font-medium text-ink">' + tool.title + '</span><p class="mt-0.5 text-[13px] text-ink-muted">' + tool.question + '</p></div><span aria-hidden="true" class="text-ink-faint">→</span></a>';
  }

  function section(list, heading) {
    return '<section id="' + SECTION_ID + '" class="scroll-mt-24 mb-10" aria-labelledby="cat-operator-calculators"><div class="mb-2 flex items-baseline justify-between gap-4"><h2 id="cat-operator-calculators" class="text-[18px] font-semibold tracking-tight text-ink">' + heading + '<span class="ml-2 text-[13px] font-normal text-ink-faint">' + list.length + '</span></h2></div><p class="mb-3 text-[13px] text-ink-muted">Tax, investing, debt, short-term rental, and real-estate calculators mapped to Legacy Investing Show topics.</p><div class="border-t border-line">' + list.map(card).join('') + '</div></section>';
  }

  function toolMatches(tool, q) {
    if (!q) return true;
    return (tool.title + ' ' + tool.question).toLowerCase().indexOf(q) !== -1;
  }

  function findEmptyState() {
    var nodes = document.querySelectorAll('p');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent.indexOf('No calculators match') !== -1) return nodes[i];
    }
    return null;
  }

  function query() {
    var search = document.getElementById('catalog-search');
    return search ? search.value.toLowerCase() : '';
  }

  function applySearch() {
    var q = query();
    var visible = 0;
    document.querySelectorAll('#' + SECTION_ID + ' [data-operator-tool]').forEach(function (row) {
      var hide = Boolean(q) && row.textContent.toLowerCase().indexOf(q) === -1;
      row.hidden = hide;
      if (!hide) visible += 1;
    });
    document.querySelectorAll('.space-y-10 [data-operator-tool]').forEach(function (row) {
      row.hidden = Boolean(q) && row.textContent.toLowerCase().indexOf(q) === -1;
    });
    var sectionEl = document.getElementById(SECTION_ID);
    if (sectionEl) {
      sectionEl.hidden = Boolean(q) && visible === 0;
      var countSpan = sectionEl.querySelector('#cat-operator-calculators span');
      if (countSpan) {
        countSpan.textContent = String(q ? visible : sectionEl.querySelectorAll('[data-operator-tool]').length);
      }
    }
    var empty = findEmptyState();
    if (empty) empty.style.display = (q && visible > 0) ? 'none' : '';
  }

  function ensureIndexSection() {
    if (document.getElementById(SECTION_ID)) return;
    var catalog = document.querySelector('[aria-labelledby="catalog-heading"]');
    if (catalog) catalog.insertAdjacentHTML('beforeend', section(tools, 'Tax, STR, debt & investing'));
  }

  function inject() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/tools';
    var search = document.getElementById('catalog-search');
    if (search && !search.dataset.operatorBound) {
      search.dataset.operatorBound = '1';
      search.addEventListener('input', applySearch);
    }
    if (path === '/tools' || path === '/tools/index.html') {
      ensureIndexSection();
      applySearch();
      return;
    }
    var match = path.match(/\/tools\/categories\/([a-z0-9-]+)/);
    if (!match) return;
    var list = tools.filter(function (tool) { return tool.category === match[1]; });
    if (!list.length) return;
    var q = query();
    var host = document.querySelector('.space-y-10');
    var native = host && host.querySelector('.border-t.border-line');
    if (native) {
      list.forEach(function (tool) {
        if (!native.querySelector('[href="/tools/' + tool.slug + '"]')) {
          native.insertAdjacentHTML('beforeend', card(tool));
        }
      });
      var leftover = document.getElementById(SECTION_ID);
      if (leftover && !q) leftover.remove();
    } else if (q) {
      var matched = list.filter(function (tool) { return toolMatches(tool, q); });
      var empty = findEmptyState();
      var existing = document.getElementById(SECTION_ID);
      if (matched.length) {
        if (empty) empty.style.display = 'none';
        if (!existing) {
          var html = section(matched, 'Tax, STR, debt & investing');
          if (empty) empty.insertAdjacentHTML('afterend', html);
          else {
            var heading = document.getElementById('catalog-heading');
            if (heading) heading.insertAdjacentHTML('afterend', html);
          }
        }
      } else if (existing) {
        existing.remove();
      }
    }
    applySearch();
  }

  inject();
  setTimeout(inject, 50);
  setTimeout(inject, 400);
  var queued = null;
  var observer = new MutationObserver(function () {
    if (queued) return;
    queued = setTimeout(function () {
      queued = null;
      observer.disconnect();
      inject();
      var path = window.location.pathname.replace(/\/+$/, '') || '/tools';
      if (path === '/tools' || path === '/tools/index.html') {
        if (document.getElementById(SECTION_ID) && document.getElementById('catalog-search')) return;
      }
      observer.observe(document.body, { childList: true, subtree: true });
    }, 80);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () {
    var path = window.location.pathname.replace(/\/+$/, '') || '/tools';
    if (path === '/tools' || path === '/tools/index.html') observer.disconnect();
  }, 1500);
})();
