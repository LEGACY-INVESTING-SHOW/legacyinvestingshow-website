# 005 - C01-C10 Edge-Case Comparison Pages

## Status
- in-progress

## Goal
Ship 10 high-quality comparison pages for edge-case tax/investing scenarios, verify in browser, and deploy live.

## Scope
- Create `/compare/index.html` hub
- Create 10 pages:
  - /compare/augusta-rule-vs-home-office-deduction-s-corp
  - /compare/mfj-vs-mfs-high-income-student-loans
  - /compare/safe-harbor-vs-annualized-income-1099
  - /compare/cost-segregation-vs-str-loophole-w2-passive-loss
  - /compare/721-upreit-vs-dst-aging-landlords
  - /compare/pricelabs-vs-pms-native-pricing-multi-property
  - /compare/solo-401k-loan-vs-heloc-down-payment
  - /compare/mark-to-market-vs-capital-gains-active-traders
  - /compare/qcd-first-vs-roth-conversion-first-irmaa
  - /compare/installment-sale-vs-deferred-sales-trust-small-business-exit
- Include deep sections: scenario matrix, worked example, edge-case risks, checklist, CPA questions, FAQ
- Update build + sitemap to include new compare pages
- Browser verify all pages with agent-browser
- Commit, push, deploy, and validate live URLs

## Checklist
- [ ] Add generator script and structured page data
- [ ] Generate 10 compare pages + compare hub
- [ ] Add build script entry to package.json
- [ ] Add compare dir to sitemap generator
- [ ] Run build and confirm output integrity
- [ ] Verify 10 pages with agent-browser snapshots
- [ ] Commit and push to main
- [ ] Confirm deployment and provide URLs

## Notes
- Must avoid thin content and generic comparisons
- Must keep educational/non-advisory framing for YMYL safety
