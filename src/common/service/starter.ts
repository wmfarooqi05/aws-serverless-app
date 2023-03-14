import { authenticate } from "./google-auth";
import { listEvents } from "./CalenderService";

authenticate((auth) => {
  listEvents(auth);
});
