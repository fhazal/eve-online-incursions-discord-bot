import fetch from "node-fetch";

export async function getJumpsBetweenSystems(fromSystemId: number, toSystemId: number): Promise<number> {
  const response = await fetch(`https://esi.evetech.net/latest/route/${fromSystemId}/${toSystemId}/`);
  const route = await response.json();
  return route.length;
}
