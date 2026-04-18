// Simple session-based tracking for items moved during the current session.
// This state will reset when the page is refreshed.

const sessionMovedItems = new Set<string>();

export const markItemAsSessionMoved = (id: string) => {
  sessionMovedItems.add(id);
};

export const isItemSessionMoved = (id: string) => {
  return sessionMovedItems.has(id);
};
