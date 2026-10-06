import { useNavigate } from "react-router-dom";

// The "+ New booking" button calls this from any page. The booking modal arrives in Phase 3;
// until then it takes you to the Bookings page. Swap the body here and every button follows.
export function useOpenNewBooking() {
  const navigate = useNavigate();
  return () => navigate("/bookings");
}
