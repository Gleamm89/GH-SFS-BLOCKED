import fs from "node:fs";

const BASE_URL = process.env.SAL_BASE_URL || "https://app.salsify.com";
const ORG_ID = process.env.SAL_ORG_ID;
const API_KEY = process.env.SAL_API_KEY;
const OUTPUT = process.env.SAL_OUTPUT || "attributes.json";

if (!ORG_ID || !API_KEY) {
  console.error("Missing SAL_ORG_ID or SAL_API_KEY");
  process.exit(1);
}

async function main() {
  const url = `${BASE_URL}/api/v1/orgs/${encodeURIComponent(ORG_ID)}/attributes`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 1000)}`);
  }

  const json = await res.json();
  const attrs = Array.isArray(json) ? json : (json.data ?? json);

  fs.writeFileSync(OUTPUT, JSON.stringify(attrs, null, 2));
  console.log(`Saved ${Array.isArray(attrs) ? attrs.length : "?"} attributes to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
