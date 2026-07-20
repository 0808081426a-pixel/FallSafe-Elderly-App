วางทับเฉพาะไฟล์ feedback.js ในโฟลเดอร์โปรเจกต์เดิม

สาเหตุ:
Firestore Rules ต้องการ ownerId แต่ feedback.js เดิมไม่ได้ส่ง ownerId

ขั้นตอน:
1. คัดลอก feedback.js ไปวางทับไฟล์เดิม
2. GitHub Desktop Summary: Fix feedback ownerId
3. Commit to main
4. Push origin
5. รอ 1-3 นาที แล้วกด Ctrl+F5

ไม่ต้องแก้ Firestore Rules เพิ่ม
