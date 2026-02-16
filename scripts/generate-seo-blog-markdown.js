#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TOPICS_PATH = path.join(ROOT_DIR, 'data', 'seo-topics-100.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'content', 'blog');
const TODAY = new Date().toISOString().split('T')[0];

const CATEGORY_MAP = {
    tax_strategies: 'Tax Strategies',
    retirement_planning: 'Retirement',
    business_structures: 'Business Structures',
    investing: 'Investing',
    debt_management: 'Debt Management',
    passive_income: 'Passive Income'
};

function flattenTopics(topicsData) {
    return Object.entries(topicsData.categories).flatMap(([categoryKey, category]) => {
        return category.topics.map((topic) => ({
            ...topic,
            categoryKey
        }));
    });
}

function buildDescription(topic) {
    const base = `Learn ${topic.primary_keyword} with a practical plan, examples, and common mistakes to avoid so you can make better wealth-building decisions.`;
    return base.length <= 160 ? base : `${base.slice(0, 157)}...`;
}

function buildDate(index) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toISOString().split('T')[0];
}

function buildMarkdown(topic, index) {
    const description = buildDescription(topic);
    const category = CATEGORY_MAP[topic.categoryKey] || 'Investing';
    const keyword = topic.primary_keyword;

    return `---
title: "${topic.title}"
description: "${description}"
date: "${buildDate(index)}"
modifiedDate: "${TODAY}"
author: "Preston Seo"
category: "${category}"
image: /assets/images/blog/${topic.slug}.jpg
keywords:
  - "${keyword}"
  - "${category.toLowerCase()}"
  - "wealth building"
---

${keyword} is most effective when you use a clear process and track results each quarter. This guide explains how to apply ${keyword} in a simple, repeatable way.

## What Is ${topic.title}?

${topic.title} is a strategy focused on improving outcomes through better decisions, planning, and execution. The goal is to lower friction, reduce avoidable mistakes, and improve long-term returns.

## Who Benefits Most

- Investors who want a practical framework instead of theory
- Operators who need repeatable steps they can implement quickly
- Busy professionals who need efficient planning

## 5-Step Implementation Plan

1. Define your target outcome and timeline.
2. Gather baseline numbers and identify constraints.
3. Choose a strategy and set clear decision rules.
4. Execute in weekly sprints with simple tracking.
5. Review progress monthly and refine your plan.

## Example Calculation

Use a before-and-after comparison to measure real impact:

- Baseline annual outcome: $20,000
- Improvement target: 20%
- Projected gain: $4,000

This method keeps the focus on measurable progress instead of assumptions.

## Common Mistakes to Avoid

- Starting without clear metrics
- Overcomplicating the first version of the plan
- Skipping monthly reviews and course-correction

## FAQ

### How long does it take to see results?

Most people can see leading indicators in 30-90 days when execution is consistent.

### Do I need advanced experience first?

No. Start with a basic version, then add complexity only after you validate what works.

### What should I track first?

Track one output metric and one process metric so you can connect effort to outcomes.

## Conclusion

${topic.title} works best when you keep the process simple, data-driven, and consistent. If you want help applying this in your own portfolio, explore additional training from Legacy Investing Show.
`;
}

function generatePosts(options = {}) {
    const topicsPath = options.topicsPath || TOPICS_PATH;
    const outputDir = options.outputDir || OUTPUT_DIR;
    const overwrite = options.overwrite || false;

    const topicsData = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));
    const topics = flattenTopics(topicsData);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let created = 0;
    let skipped = 0;

    topics.forEach((topic, index) => {
        const filePath = path.join(outputDir, `${topic.slug}.md`);
        if (fs.existsSync(filePath) && !overwrite) {
            skipped++;
            return;
        }

        fs.writeFileSync(filePath, buildMarkdown(topic, index));
        created++;
    });

    return {
        totalTopics: topics.length,
        created,
        skipped
    };
}

function main() {
    const overwrite = process.argv.includes('--overwrite');
    const result = generatePosts({ overwrite });
    console.log(`Generated SEO blog posts`);
    console.log(`Total topics: ${result.totalTopics}`);
    console.log(`Created: ${result.created}`);
    console.log(`Skipped: ${result.skipped}`);
}

if (require.main === module) {
    main();
}

module.exports = {
    buildDescription,
    buildMarkdown,
    flattenTopics,
    generatePosts
};
