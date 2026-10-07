import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import { useAsyncData, type AsyncData } from "@/lib/useAsyncData";
import type { Booking } from "@/types/booking";
import { matchesSearch } from "../bookings.metrics";
import {
  fetchBookingCount,
  fetchBookingsPage,
  fetchMatchingBookings,
  PAGE_SIZE,
  type BookingFilters,
  type BookingsPage,
} from "../bookings.service";

const ERROR_MESSAGE = "We couldn't load the bookings.";
const NO_PAGE: BookingsPage = { bookings: [], lastDoc: null };

// Which page of the current view is showing. `cursors[n]` is where page n starts (null = the very beginning).
type Pager = { viewKey: string; pageIndex: number; cursors: (QueryDocumentSnapshot | null)[] };

export type BookingsData = {
  rows: AsyncData<Booking[]>; // the page the table shows
  total: number | null; // "of 42"; null while it is still loading
  pageIndex: number;
  matching: AsyncData<Booking[]>; // everything matching the filters and search (up to the read limit): summary + export
  capped: boolean; // true when more bookings match than were read, so the summary covers only the newest
  goNext: () => void;
  goPrevious: () => void;
  goFirst: () => void;
};

// Two ways to fill the table (AGENTS.md section 8):
// - Normal: one cursor-paginated page at a time from Firestore, with the total from a count query.
// - Searching: Firestore has no "contains" search, so the matching bookings (bounded, see MATCHING_LIMIT) are read once
//   per filter choice and searched in memory. Typing never triggers a new read.
// `reloadKey` is bumped after a cancel or delete to read everything again.
export function useBookingsData(filters: BookingFilters, term: string, reloadKey: number): BookingsData {
  const { date, courtId, status } = filters;
  const request = useMemo(() => ({ filters: { date, courtId, status }, reloadKey }), [date, courtId, status, reloadKey]);
  const search = term.trim();
  const searching = search !== "";

  // Changing a filter or the search starts again from page 1, without needing an effect to reset anything
  const viewKey = `${date}|${courtId}|${status}|${search.toLowerCase()}`;
  const [pager, setPager] = useState<Pager>({ viewKey, pageIndex: 0, cursors: [null] });
  const current: Pager = pager.viewKey === viewKey ? pager : { viewKey, pageIndex: 0, cursors: [null] };
  const cursor = current.cursors[current.pageIndex] ?? null;

  const loadMatching = useCallback(() => fetchMatchingBookings(request.filters), [request]);
  const matching = useAsyncData(loadMatching, ERROR_MESSAGE);

  const loadCount = useCallback(() => fetchBookingCount(request.filters), [request]);
  const count = useAsyncData(loadCount, ERROR_MESSAGE);

  // Not needed while searching (the list then comes from `matching`), so it reads nothing
  const loadPage = useCallback(
    () => (searching ? Promise.resolve(NO_PAGE) : fetchBookingsPage(request.filters, cursor)),
    [request, searching, cursor],
  );
  const page = useAsyncData(loadPage, ERROR_MESSAGE);

  const matchingBookings = matching.status === "ready" ? matching.data : null;
  const searched = useMemo(
    () => (searching && matchingBookings ? matchingBookings.filter((booking) => matchesSearch(booking, search)) : null),
    [matchingBookings, searching, search],
  );

  let rows: AsyncData<Booking[]>;
  if (searching) {
    if (matching.status !== "ready") {
      rows = matching;
    } else {
      const from = current.pageIndex * PAGE_SIZE;
      rows = { status: "ready", data: (searched ?? []).slice(from, from + PAGE_SIZE) };
    }
  } else {
    rows = page.status === "ready" ? { status: "ready", data: page.data.bookings } : page;
  }

  const matchingView: AsyncData<Booking[]> =
    matching.status !== "ready" ? matching : { status: "ready", data: searched ?? matching.data };

  const total = searching ? (searched?.length ?? null) : count.status === "ready" ? count.data : null;
  const capped = matching.status === "ready" && count.status === "ready" && count.data > matching.data.length;

  function goNext() {
    if (searching) {
      setPager({ ...current, pageIndex: current.pageIndex + 1 });
      return;
    }
    if (page.status !== "ready" || !page.data.lastDoc) return;
    const cursors = [...current.cursors];
    cursors[current.pageIndex + 1] = page.data.lastDoc;
    setPager({ ...current, cursors, pageIndex: current.pageIndex + 1 });
  }

  return {
    rows,
    total,
    pageIndex: current.pageIndex,
    matching: matchingView,
    capped,
    goNext,
    goPrevious: () => setPager({ ...current, pageIndex: Math.max(current.pageIndex - 1, 0) }),
    goFirst: () => setPager({ ...current, pageIndex: 0 }),
  };
}
