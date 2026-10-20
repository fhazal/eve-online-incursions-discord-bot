import { readFileSync, writeFileSync } from "fs";

const path = "incursions_cache.json";
const raw = readFileSync(path, "utf-8");
const cache = JSON.parse(raw);

function parseJumpValue(val: any): number | null {
  const n = parseInt(val);
  return isNaN(n) ? null : n;
}

if (cache.lastIncursion?.incursionInfo?.numberOfJumpsFromLastIncursion) {
  cache.lastIncursion.incursionInfo.numberOfJumpsFromLastIncursion =
    parseJumpValue(cache.lastIncursion.incursionInfo.numberOfJumpsFromLastIncursion);
}

for (const entry of cache.currentIncursions ?? []) {
  if (entry.incursionInfo?.numberOfJumpsFromLastIncursion) {
    entry.incursionInfo.numberOfJumpsFromLastIncursion =
      parseJumpValue(entry.incursionInfo.numberOfJumpsFromLastIncursion);
  }
}

writeFileSync(path, JSON.stringify(cache, null, 2));
console.log("✅ Jump counts cleaned to numeric or null.");
