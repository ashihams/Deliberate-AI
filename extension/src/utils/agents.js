// Agent-related constants extracted from popup.js without behavior changes.
// The committee UI lives in the legacy popup.html / popup.js entry, which
// continues to own its own copy of these for runtime use. This module exists
// so future React surfaces can import the same data without duplication.

export const AGENT_COLORS = {
  marcus: "#7F77DD",
  diana: "#1D9E75",
  raj: "#EF9F27",
  james: "#378ADD",
};

export const DEFAULT_AGENTS = [
  { id: "marcus", name: "Marcus", ens_name: "marcus.deliberate.eth", reputation: 500, active: true },
  { id: "diana", name: "Diana", ens_name: "diana.deliberate.eth", reputation: 500, active: true },
  { id: "raj", name: "Raj", ens_name: "raj.deliberate.eth", reputation: 500, active: true },
  { id: "james", name: "James", ens_name: "james.deliberate.eth", reputation: 500, active: true },
];

export function findAgent(agents, id) {
  if (!id) return undefined;
  return agents.find((a) => a.id === String(id).toLowerCase());
}
