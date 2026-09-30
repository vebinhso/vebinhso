# Architecture decisions

- Store the active locale client-side and resolve bilingual content at read time, because users switch languages per device.
- Keep Vietnamese question fields canonical and add position-aligned English fields, because grading is index-based.
