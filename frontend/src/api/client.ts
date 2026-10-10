import type { Staff, ShiftWithListing, ActionHistoryItem, Listing } from '../types';

const BASE_URL = ''; // Relative path leverages Vite dev proxy or static serving

export async function fetchStaff(): Promise<Staff[]> {
  const res = await fetch(`${BASE_URL}/api/staff`);
  if (!res.ok) throw new Error('Failed to load staff list');
  return res.json();
}

export async function fetchShifts(userId?: string): Promise<ShiftWithListing[]> {
  const url = userId ? `${BASE_URL}/api/shifts?user_id=${encodeURIComponent(userId)}` : `${BASE_URL}/api/shifts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load shifts');
  return res.json();
}

export async function fetchHistory(): Promise<ActionHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/history`);
  if (!res.ok) throw new Error('Failed to load action history');
  return res.json();
}

export async function postListing(actorId: string, shiftId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId, shift_id: shiftId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to post shift' }));
    throw errorData;
  }
  return res.json();
}

export async function withdrawListing(listingId: string, actorId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings/${encodeURIComponent(listingId)}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to withdraw listing' }));
    throw errorData;
  }
  return res.json();
}

export async function claimListing(listingId: string, actorId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings/${encodeURIComponent(listingId)}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to claim shift' }));
    throw errorData;
  }
  return res.json();
}

export async function unclaimListing(listingId: string, actorId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings/${encodeURIComponent(listingId)}/unclaim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to unclaim shift' }));
    throw errorData;
  }
  return res.json();
}

export async function approveListing(listingId: string, actorId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings/${encodeURIComponent(listingId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Approval refused' }));
    throw errorData;
  }
  return res.json();
}

export async function rejectListing(listingId: string, actorId: string): Promise<Listing> {
  const res = await fetch(`${BASE_URL}/api/listings/${encodeURIComponent(listingId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to reject claim' }));
    throw errorData;
  }
  return res.json();
}

export async function resetDatabase(): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/api/admin/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset database');
  return res.json();
}
