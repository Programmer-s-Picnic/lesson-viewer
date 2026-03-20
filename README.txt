Programmer's Picnic Editor Hub

Added in this package:
- assets/css/styles.css
- assets/js/hub.js
- pull notifications UI and polling support
- notifications.sample.json

Notifications source:
https://editor.learnwithchampak.live/notifications.json

Supported JSON shapes:
1) Array
[
  {"id":"x1","title":"Title","message":"Body","url":"https://...","createdAt":"2026-03-20T18:00:00+05:30"}
]

2) Object with notifications/items/data array
{"notifications": [...]} 

Recognized fields per item:
- id / slug / key / uuid / guid
- title / name / heading / label
- message / body / text / description / summary
- url / link / href
- createdAt / updatedAt / date / time / timestamp
- important / priority: "high" / level: "high"

Behavior:
- polls every 60 seconds
- shows unread badge on the Notifications button
- opens a notification drawer
- optional browser alerts when permission is granted
- marks all unread items as read when the drawer is opened


Badge support added:
- Installed app icon/taskbar/dock badge sync where the platform supports the Badging API
- Browser tab title count fallback like (3) Programmer's Picnic Editor Hub
- In-app notification badge remains unchanged
