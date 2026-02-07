function extractOpenAIText(payload) {
    if (payload.output_text && typeof payload.output_text === 'string') {
        return payload.output_text;
    }

    if (!Array.isArray(payload.output)) {
        return '';
    }

    const parts = [];
    for (const block of payload.output) {
        const content = block.content || [];
        for (const item of content) {
            if (item.type === 'output_text' || item.type === 'text') {
                if (item.text) parts.push(item.text);
            }
        }
    }

    return parts.join('\n').trim();
}

async function runOpenAI(prompt, options) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY for OpenAI provider.');
    }

    const model = options.model || process.env.OPENAI_MODEL || 'gpt-5';

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            input: [
                { role: 'system', content: options.systemPrompt || 'You are a helpful expert content agent.' },
                { role: 'user', content: prompt }
            ],
            temperature: options.temperature ?? 0.3
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const text = extractOpenAIText(payload);
    if (!text) {
        throw new Error('OpenAI response contained no text output.');
    }

    return text;
}

async function runAnthropic(prompt, options) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('Missing ANTHROPIC_API_KEY for Anthropic provider.');
    }

    const model = options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.3,
            system: options.systemPrompt || 'You are a helpful expert content agent.',
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Anthropic request failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const text = (payload.content || [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
        .trim();

    if (!text) {
        throw new Error('Anthropic response contained no text output.');
    }

    return text;
}

function dryRun(prompt, options) {
    const skill = options.skill || 'unknown-skill';
    return [
        `# Dry Run Output (${skill})`,
        '',
        'PASS',
        '',
        'Dry run mode is enabled. No external LLM call was made.',
        '',
        'Prompt excerpt:',
        prompt.slice(0, 500)
    ].join('\n');
}

async function runLLM(prompt, options = {}) {
    if (options.dryRun) {
        return dryRun(prompt, options);
    }

    const provider = (options.provider || process.env.PIPELINE_LLM_PROVIDER || 'openai').toLowerCase();

    if (provider === 'openai') {
        return runOpenAI(prompt, options);
    }

    if (provider === 'anthropic') {
        return runAnthropic(prompt, options);
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
}

module.exports = {
    runLLM
};
