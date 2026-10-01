# Architecture decisions

- Store the active locale client-side and resolve bilingual content at read time, because users switch languages per device.
- Keep Vietnamese system questions canonical and pair them by stable ID with position-aligned English questions and choices; never auto-translate teacher/class or uploaded assignment content.

- Wall-attached door/window behavior keys off DOOR_IDS/WINDOW_IDS in the catalog (isDoorItem/isWindowItem), so new door or window models snap, cut holes and open without touching game logic.
