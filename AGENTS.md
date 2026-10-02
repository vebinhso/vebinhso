# Architecture decisions

- Store the active locale client-side and resolve bilingual content at read time, because users switch languages per device.
- Keep Vietnamese system questions canonical and pair them by stable ID with position-aligned English questions and choices; never auto-translate teacher/class or uploaded assignment content.

- Wall-attached door/window behavior keys off DOOR_IDS/WINDOW_IDS in the catalog (isDoorItem/isWindowItem), so new door or window models snap, cut holes and open without touching game logic.
- Keep the Hội An river activity modular in HoiAnRiver and persist its lightweight lantern inventory per account on-device, because it is cosmetic gameplay and must not add map-render churn.
- AI Centre check→skill mapping lives in the ai_check_skill table (read server-side with a 60s cache), never in code, so admins can rewire skills without deploys.
- AI result feedback is written only through server functions with the service client; tables stay admin-read-only and student attachments require both parent consent and a per-submission opt-in.
- Aggregate link and phone safety signals store only normalized domains or prefixes and coarse risk buckets, never raw user input.
- Render the playable and dressing-room avatar through one shared chibi character assembly, so body proportions, garment silhouettes and patterns stay identical everywhere.
- Determine first-time character setup from the account-scoped character_outfit row, never device storage, so returning users skip setup on every device.
