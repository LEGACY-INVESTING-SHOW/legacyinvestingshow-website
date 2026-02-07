const { URL } = require('url');

async function searchWithTavily(query, options) {
    const apiKey = options.apiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error('Missing TAVILY_API_KEY for Tavily web search.');
    }

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'advanced',
            max_results: options.maxResults || 8,
            include_answer: false,
            include_raw_content: false
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Tavily search failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const rows = payload.results || [];

    return rows.map((row) => ({
        title: row.title || '',
        url: row.url || '',
        snippet: row.content || '',
        source: 'tavily'
    }));
}

async function searchWithSerpApi(query, options) {
    const apiKey = options.apiKey || process.env.SERPAPI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing SERPAPI_API_KEY for SerpAPI web search.');
    }

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', String(options.maxResults || 10));

    const response = await fetch(url.toString());
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SerpAPI search failed (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const rows = payload.organic_results || [];

    return rows.map((row) => ({
        title: row.title || '',
        url: row.link || '',
        snippet: row.snippet || row.snippet_highlighted_words?.join('. ') || '',
        source: 'serpapi'
    }));
}

function dryRunResults(query, maxResults) {
    const count = maxResults || 5;
    const rows = [];

    for (let i = 1; i <= count; i++) {
        rows.push({
            title: `Dry-run result ${i} for: ${query}`,
            url: `https://example.com/${encodeURIComponent(query)}/${i}`,
            snippet: `Synthetic snippet ${i} for query: ${query}`,
            source: 'dry-run'
        });
    }

    return rows;
}

async function searchWeb(query, options = {}) {
    const provider = (options.provider || process.env.SEARCH_PROVIDER || 'tavily').toLowerCase();

    if (options.dryRun) {
        return dryRunResults(query, options.maxResults);
    }

    if (provider === 'tavily') {
        return searchWithTavily(query, options);
    }

    if (provider === 'serpapi') {
        return searchWithSerpApi(query, options);
    }

    if (provider === 'none') {
        return [];
    }

    throw new Error(`Unsupported search provider: ${provider}`);
}

module.exports = {
    searchWeb
};
