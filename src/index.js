async function scrapeAppStoreRanking() {
    try {
      const response = await fetch('https://apps.apple.com/us/charts/iphone/finance-apps/6015?chart=top-free');
      const html = await response.text();
      
      // Simple parsing to find Coinbase in the rankings
      const coinbaseIndex = html.toLowerCase().indexOf('coinbase');
      if (coinbaseIndex === -1) {
        return null;
      }
      
      // Find the nearest ranking number before the Coinbase mention
      const precedingText = html.substring(0, coinbaseIndex);
      const rankMatches = precedingText.match(/(\d+)[^\d]*$/);
      
      if (rankMatches && rankMatches[1]) {
        return parseInt(rankMatches[1]);
      }
      
      return null;
    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  }
  
  async function storeRanking(env, ranking) {
    if (!ranking) return;
    
    const timestamp = new Date().toISOString();
    const data = {
      ranking,
      timestamp
    };
    
    // Store the latest ranking
    await env.RANK_STORE.put('latest', JSON.stringify(data));
    
    // Also store in historical data
    const historicalKey = `historical:${timestamp.split('T')[0]}:${timestamp.split('T')[1].split(':')[0]}`;
    await env.RANK_STORE.put(historicalKey, JSON.stringify(data));
  }
  
  async function getHistoricalData(env) {
    const list = await env.RANK_STORE.list({ prefix: 'historical:' });
    const historicalData = [];
    
    for (const key of list.keys) {
      const value = await env.RANK_STORE.get(key.name);
      if (value) {
        historicalData.push(JSON.parse(value));
      }
    }
    
    return historicalData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  
  export default {
    // Handle scheduled task
    async scheduled(event, env, ctx) {
      const ranking = await scrapeAppStoreRanking();
      await storeRanking(env, ranking);
    },
    
    // Handle HTTP requests
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      
      // Set CORS headers
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      };
      
      // Handle different endpoints
      if (url.pathname === '/api/latest') {
        const latest = await env.RANK_STORE.get('latest');
        return new Response(latest || '{}', { headers });
      }
      
      if (url.pathname === '/api/historical') {
        const historical = await getHistoricalData(env);
        return new Response(JSON.stringify(historical), { headers });
      }
      
      return new Response('Not Found', { status: 404 });
    }
  };