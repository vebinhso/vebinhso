# Architecture decisions

- Store the active locale client-side and resolve bilingual content at read time, because users switch languages per device.
- Keep Vietnamese system questions canonical and pair them by stable ID with position-aligned English questions and choices; never auto-translate teacher/class or uploaded assignment content.
