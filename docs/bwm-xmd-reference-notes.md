# BWM XMD reference notes

The public BWM XMD site describes the product as a multi-device WhatsApp bot with more than 1000 features and specifically advertises auto status views among its capabilities.

Sources reviewed:

- https://bwmxmd.co.ke/ — public BWM XMD site; search result description advertises auto status views and other automation.
- https://pro.bwmxmd.co.ke/ — BWM XMD PRO site; direct page opened successfully but exposed no readable feature documentation in the sandbox page extraction.
- https://www.youtube.com/watch?v=TlHrKaw5--w — search result referencing frequently used BWM features.
- https://www.youtube.com/watch?v=NpJ4_Y4xR9I — search result for BWM XMD deployment tutorial.
- https://www.youtube.com/watch?v=4r5OewBgLIs — search result for BWM XMD self-hosting tutorial.

The public search evidence confirms auto-status viewing as a BWM XMD feature, but does not provide a reliable, complete command list for always-online, fake typing, or fake recording. MESH-TECH therefore implements these as explicit per-instance controls rather than claiming undocumented BWM internals. The parity controls are `.autoview on/off` (aliases `.autostatus` and `.statusview`), `.autolike on/off` (alias `.statuslike`), and `.wapresence on/off`, `.wapresence typing`, `.wapresence recording`, or `.wapresence none` (aliases `.alwaysonline` and `.presence`). The runtime now consumes these settings: incoming statuses are read and optionally reacted to, always-online presence is refreshed every 25 seconds, and typing/recording presence is emitted for incoming chats. Settings are stored per BotInstance and the focused regression test verifies the behavior.
