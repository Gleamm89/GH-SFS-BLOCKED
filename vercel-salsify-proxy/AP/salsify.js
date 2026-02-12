// Vercel Serverless Function to proxy Salsify Product API securely.
// Env vars required: SALSIFY_TOKEN, SALSIFY_ORG_ID (optional if full URL passed), SALSIFY_BASE_URL (optional)

export default async function handler(request, response) {
  try {
    const { sku } = request.query;
    if (!sku) {
      return response.status(400).json({ error: "Missing 'sku' query parameter." });
    }

    // Organization ID from your example URL: s-852ea8aa-b3aa-44b6-8c04-7bc2acefd665
    const ORG_ID = process.env.SALSIFY_ORG_ID || 's-852ea8aa-b3aa-44b6-8c04-7bc2acefd665';
    const BASE = process.env.SALSIFY_BASE_URL || 'https://app.salsify.com/api/v1';

    const token = process.env.SALSIFY_TOKEN;
    if (!token) {
      return response.status(500).json({ error: 'Server missing SALSIFY_TOKEN.' });
    }

    // SKU may be either the Salsify product id or a property like "sku". If you use a custom SKU property,
    // you can swap to the search endpoint. Here we use the direct product id path exactly as in your example.
    const productUrl = `${BASE}/orgs/${encodeURIComponent(ORG_ID)}/products/${encodeURIComponent(sku)}`;

    const apiRes = await fetch(productUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return response.status(apiRes.status).json({
        error: `Salsify error ${apiRes.status}`,
        details: errText
      });
    }

    const product = await apiRes.json();

    // Depending on your Salsify model, these may live in:
    // - product.properties['Blocked_Channels'] / product.properties['Blocked_countries']
    // - product.derived_properties[...] or other paths
    // The code below tries several common locations safely.

    function getAny(obj, pathArr) {
      // pathArr like ['properties','Blocked_Channels']
      return pathArr.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    }

    const candidates = {
      blockedChannels:
        getAny(product, ['properties', 'Blocked_Channels']) ??
        getAny(product, ['properties', 'blocked_channels']) ??
        getAny(product, ['properties', 'Blocked Channels']) ??
        getAny(product, ['derived_properties', 'Blocked_Channels']),
      blockedCountries:
        getAny(product, ['properties', 'Blocked_countries']) ??
        getAny(product, ['properties', 'blocked_countries']) ??
        getAny(product, ['properties', 'Blocked countries']) ??
        getAny(product, ['derived_properties', 'Blocked_countries']),
    };

    // Normalize arrays if they are CSV strings
    function normalizeList(value) {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        const parts = value.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
        return parts;
      }
      return value ?? null;
    }

    const blockedChannels = normalizeList(candidates.blockedChannels) || [];
    const blockedCountries = normalizeList(candidates.blockedCountries) || [];

    response.setHeader('Access-Control-Allow-Origin', '*'); // Tighten to your GitHub Pages domain if needed
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (request.method === 'OPTIONS') return response.status(204).end();

    return response.status(200).json({
      sku,
      blockedChannels,
      blockedCountries,
      rawExtract: {
        keysTried: Object.keys(candidates),
        valuesFound: candidates
      }
    });
  } catch (e) {
    console.error(e);
    return response.status(500).json({ error: 'Unexpected server error', details: String(e) });
  }
}
``
