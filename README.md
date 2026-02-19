# 🤖 ขุนเทียม (Khun-Tiem-Bot)

LINE Chatbot สำหรับ**จัดการวันลา**และ **Happy Hour** ภายในทีม — ใช้งานผ่าน LINE Chat ได้ทันที

## ✨ ฟีเจอร์หลัก

- 📝 แจ้งลาทุกประเภท (พักร้อน, ป่วย, กิจ, อบรม)
- ❤️ จัดการ Happy Hour (เพิ่ม/ใช้/อนุมัติ)
- 📊 ดูรายงานวันลา — **Flex Message** สวยงาม (วันนี้, สัปดาห์, เดือน, ส่วนตัว)
- 📈 สรุปยอดวันลาแยกประเภท + **Carousel** swipe ดูแต่ละคน
- 🏆 สถิติเดือน — เปรียบเทียบกับเดือนก่อนแบบขำๆ
- ✅ ระบบ Approve สำหรับ Admin
- 🗑️ ลบรายการ — ยืนยันก่อนลบด้วยปุ่ม Confirm
- 🔔 แจ้งเตือนอัตโนมัติทุกวันจันทร์ + เตือนก่อนวันลา
- 📅 Year filter — ดูเฉพาะปีนี้ หรือ `ทั้งหมด` ย้อนหลัง

---

## 🛠️ Tech Stack

| Component | Technology                              |
| --------- | --------------------------------------- |
| Runtime   | Node.js + TypeScript                    |
| Framework | Express.js                              |
| Database  | PostgreSQL                              |
| Messaging | LINE Messaging API (`@line/bot-sdk` v8) |
| Scheduler | node-cron                               |
| Deploy    | Railway                                 |

---

## 🚀 Setup & Development

```bash
# 1. ติดตั้ง dependencies
yarn install --ignore-engines

# 2. สร้างไฟล์ .env
cp .env.example .env
# แล้วกรอกค่า (ดู Environment Variables ด้านล่าง)

# 3. รัน development server
yarn dev

# 4. Build production
yarn build

# 5. รัน tests
yarn test
```

### Environment Variables

| Variable               | Description                   |
| ---------------------- | ----------------------------- |
| `PORT`                 | Port สำหรับ Express server    |
| `CHANNEL_SECRET`       | LINE Channel Secret           |
| `CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token     |
| `ADMIN_ID`             | LINE User ID ของ Admin        |
| `GROUP_ID`             | LINE Group ID ของทีม          |
| `GROUP_ID_ADMIN`       | LINE Group ID ของ Admin group |
| `DATABASE_URL`         | PostgreSQL connection string  |

---

## 📖 คู่มือการใช้งาน — ทุก Command

> พิมพ์ `คำสั่ง` ใน LINE Chat เพื่อดูรายการคำสั่งทั้งหมด
>
> 💡 **Year Filter:** คำสั่ง `รายงาน ของฉัน`, `แอบดู`, `สรุป` จะแสดงข้อมูล **เฉพาะปีปัจจุบัน** เป็นค่า default
> เพิ่ม `ทั้งหมด` หลังคำสั่ง เพื่อดูข้อมูลย้อนหลังทุกปี เช่น: `รายงาน ของฉัน ทั้งหมด`

---

### 📌 สมัคร — ลงทะเบียนผู้ใช้ใหม่

ต้องสมัครก่อนจึงจะใช้คำสั่งอื่นได้

```
สมัคร
```

**Response:**

```
🥰 Added new member successfully
```

ถ้าสมัครแล้ว:

```
User สมชาย มีอยู่ในระบบแล้วครับ
```

---

### 📝 แจ้งลา — แจ้งวันลาทุกประเภท

**รูปแบบ:**

```
แจ้งลา <ประเภท> <วันที่> <จำนวน> <สถานะ> <เหตุผล>
```

| พารามิเตอร์ | ตัวเลือก                                                 |
| ----------- | -------------------------------------------------------- |
| ประเภท      | `ลาพักร้อน` `ลาป่วย` `ลากิจ`                             |
| วันที่      | `01JAN25` (วันเดียว) หรือ `01JAN25-03JAN25` (หลายวัน)    |
| จำนวน       | `1วัน` `ครึ่งเช้า` `ครึ่งบ่าย` `2วัน` `3วัน` ... `11วัน` |
| สถานะ       | `key` (คีย์แล้ว) หรือ `nokey` (ยังไม่คีย์)               |
| เหตุผล      | ข้อความอะไรก็ได้ (optional)                              |

**ตัวอย่าง:**

ลาวันเดียว:

```
แจ้งลา ลาพักร้อน 15FEB25 1วัน key ไปเที่ยว
```

ลาครึ่งวัน:

```
แจ้งลา ลาป่วย 20FEB25 ครึ่งเช้า nokey ไม่สบาย
```

ลาหลายวัน:

```
แจ้งลา ลากิจ 10MAR25-12MAR25 3วัน nokey ธุระส่วนตัว
```

**Response:**

```
🥰 Added new leave request for สมชาย successfully
```

---

### 📝 nc — แจ้งลาประเภท Non-Counting (ไม่นับลา)

**รูปแบบ:**

```
nc <ประเภท> <วันที่> <จำนวน> <เหตุผล>
```

| พารามิเตอร์ | ตัวเลือก                                       |
| ----------- | ---------------------------------------------- |
| ประเภท      | `อบรม` `training` `กิจกรรมบริษัท` `ตรวจสุขภาพ` |

**ตัวอย่าง:**

```
nc อบรม 26JAN25-28JAN25 3วัน อบรม security awareness
```

**Response:**

```
🥰 Added new leave request for สมชาย successfully
```

---

### ✏️ อัปเดต — แก้ไขสถานะวันลา

**รูปแบบ:**

```
อัปเดต <id> <สถานะ>
```

| สถานะ   | ความหมาย                 |
| ------- | ------------------------ |
| `key`   | คีย์ในระบบแล้ว           |
| `nokey` | ยังไม่ได้คีย์            |
| `cer`   | มีใบรับรองแพทย์ (ลาป่วย) |
| `nocer` | ไม่มีใบรับรองแพทย์       |

**ตัวอย่าง:**

```
อัปเดต 42 key
```

**Response:**

```
✅ Update ID:42 to 'key'
🚀 ข้อมูลล่าสุด: <42> สมชาย ลาพักร้อน 15FEB25 1วัน key
```

---

### 🗑️ ลบ — ลบ/ยกเลิกวันลา (มีปุ่มยืนยัน)

ลบได้เฉพาะรายการของตัวเอง (Admin ลบได้ทุก ID)

**รูปแบบ:**

```
ลบ <id>
```

**ตัวอย่าง:**

```
ลบ 42
```

**Response:** แสดง Flex Card ยืนยันพร้อมปุ่ม:

- 🗑️ **ลบเลย** → ลบรายการ
- ❌ **ยกเลิก** → ยกเลิกการลบ

---

### ❤️ hh เพิ่ม — เพิ่มชั่วโมง Happy Hour

**รูปแบบ:**

```
hh เพิ่ม <จำนวน> <เหตุผล>
```

**ตัวอย่าง:**

```
hh เพิ่ม 2h ทำงาน OT วัน launch
```

**Response:**

```
❤️ สร้าง Request hh สำหรับ สมชาย สำเร็จ
🙅‍♂️ ที่ยังไม่ Approve: 2 hours
🙆‍♂️ ที่ Approve: 8 hours
```

---

### ❤️ hh ใช้ — ใช้ชั่วโมง Happy Hour เป็นวันลา

**รูปแบบ:**

```
hh ใช้ <จำนวน> <วันที่> <จำนวนวัน> <เหตุผล>
```

| จำนวน HH | ตัวเลือก                 |
| -------- | ------------------------ |
| ชั่วโมง  | `1h` `2h` `3h` ... `40h` |

**ตัวอย่าง:**

```
hh ใช้ 4h 20FEB25 ครึ่งบ่าย ไปธุระ
```

**Response:**

```
❤️‍🔥 ใช้ hh สำหรับ สมชาย สำเร็จ คงเหลือ: 4 hours
```

---

### ✅ approve — อนุมัติวันลา (Admin เท่านั้น)

**รูปแบบ:**

```
approve <id>
approve <id1>,<id2>,<id3>
```

**ตัวอย่าง:**

```
approve 42
approve 40,41,42
```

**Response:**

```
✅ Approve request IDs: 40, 41, 42 successfully
```

---

### ✅ hh approve — อนุมัติ Happy Hour (Admin เท่านั้น)

**รูปแบบ:**

```
hh approve <id>
hh approve <id1>,<id2>
```

**ตัวอย่าง:**

```
hh approve 5,6
```

**Response:**

```
✅ อนุมัติ Happy Hour สำเร็จสำหรับ ID: 5, 6
```

---

### 📊 รายงาน — ดูรายงานวันลา

**รูปแบบ:**

```
รายงาน <ประเภท>
```

| ประเภท     | แสดงอะไร                                  |
| ---------- | ----------------------------------------- |
| `วันนี้`   | คนที่ลาวันนี้ (Flex bubble)               |
| `วีคนี้`   | คนที่ลาสัปดาห์นี้ (Flex สีสัน Mon-Fri)    |
| `วีคหน้า`  | คนที่ลาสัปดาห์หน้า                        |
| `เดือนนี้` | สรุปรายเดือน — **Carousel** swipe แต่ละคน |
| `ของฉัน`   | รายการลาทั้งหมด + HH (Flex bubble, ปีนี้) |

> 💡 เพิ่ม `ทั้งหมด` เพื่อดูย้อนหลัง เช่น: `รายงาน ของฉัน ทั้งหมด`

#### รายงาน วันนี้

```
รายงาน วันนี้
```

**Response:** Flex bubble แสดงรายชื่อคนลา พร้อม legend สี (🟢 Approved, 🟡 Keyed, 🔴 Pending)

#### รายงาน วีคนี้ / วีคหน้า

```
รายงาน วีคนี้
```

**Response:** Flex bubble แสดง 5 วัน (จ-ศ) พร้อม chip สี แต่ละวัน

#### รายงาน เดือนนี้

```
รายงาน เดือนนี้
```

**Response:** Carousel — การ์ดแต่ละคน แสดงรายการลา + จำนวนวัน

#### รายงาน ของฉัน

```
รายงาน ของฉัน
รายงาน ของฉัน ทั้งหมด
```

**Response:** Flex bubble แสดง: HH เหลือ, รายการลาพร้อม status, HH ที่รอ approve

---

### 📈 สรุป — สรุปยอดวันลา

Default แสดง**เฉพาะปีนี้** เพิ่ม `ทั้งหมด` เพื่อดูย้อนหลัง

```
สรุป
สรุป ทั้งหมด
```

**Response:** Flex bubble — สรุปแยกตามประเภทลา พร้อมจำนวนวัน + ครั้ง + ยอดรวม

Admin ดูสรุปทั้งทีม:

```
สรุป ทีม
สรุป ทีม ทั้งหมด
```

**Response:** Carousel — การ์ดแต่ละคน แสดงประเภทลา + HH คงเหลือ

---

### ⚠️ เตือน — ดูรายการที่รอ Approve

```
เตือน
```

**Response:**

```
✏️ รายการที่รอการ Approve [ทั้งหมด]

🔴<43> สมหญิง ลาป่วย 20FEB25 ครึ่งเช้า nokey
🟡<44> สมศักดิ์ ลาพักร้อน 25FEB25-26FEB25 2วัน key

❤️ HH ที่รอการ Approve

🙅‍♂️ <5> สมชาย 2h (OT วัน launch)
```

---

### 👀 แอบดู — ดูรายงานของคนอื่น

```
แอบดู <ชื่อ>
```

**ตัวอย่าง:**

```
แอบดู สมหญิง
```

**Response:** Flex bubble — เหมือน `รายงาน ของฉัน` เพิ่ม `ทั้งหมด` ดูย้อนหลัง:

```
แอบดู สมหญิง ทั้งหมด
```

---

### 📋 ตาราง — ดูข้อมูลในตาราง

```
ตาราง <ชื่อตาราง>
```

| ตาราง        | แสดงอะไร                                        |
| ------------ | ----------------------------------------------- |
| `member`     | Flex — รายชื่อ + HH เหลือ + HH รอ approve + รวม |
| `happy_hour` | ยอด HH คงเหลือทุกคน                             |

#### ตาราง member

```
ตาราง member
```

**Response:** Flex bubble — ตารางสมาชิก:

| ชื่อ       | HH เหลือ | รอ approve |
| ---------- | -------- | ---------- |
| สมชาย 👑   | **6h**   | 2h         |
| สมหญิง     | **10h**  | -          |
| **📊 รวม** | **16h**  | **2h**     |

#### ตาราง happy_hour

```
ตาราง happy_hour
```

**Response:**

```
❤️ ยอด HH คงเหลือแต่ละคน
- สมชาย: 6h
- สมหญิง: 10h
- สมศักดิ์: 4h
```

---

### ❓ คำสั่ง — แสดงรายการคำสั่งทั้งหมด

```
คำสั่ง
```

**Response:** Carousel 4 การ์ด swipe ดูได้:

| การ์ด         | หมวด                              | คำสั่งที่แสดง     |
| ------------- | --------------------------------- | ----------------- |
| 📝 วันลา      | แจ้งลา, nc, อัปเดต, ลบ            | พร้อมตัวอย่างเต็ม |
| ❤️ Happy Hour | hh เพิ่ม, hh ใช้                  | พร้อมตัวอย่าง     |
| 📊 ดูข้อมูล   | รายงาน, แอบดู, สรุป, สถิติ, ตาราง | ทุกรูปแบบ         |
| 👑 Admin      | approve, hh approve, เตือน        | + 💡 Tip ย้อนหลัง |

---

### 🏆 สถิติ — สถิติสนุกๆ ประจำเดือน

```
สถิติ
```

**Response:** Flex bubble — สถิติเดือนปัจจุบัน:

- 📝 จำนวนรายการลา, 📊 รวมจำนวนวัน, 📊 เฉลี่ยต่อคน
- 🏆 แชมป์ลามากสุด, 📋 ประเภทยอดฮิต, 📅 วันลายอดฮิต
- พร้อมเปรียบเทียบกับเดือนก่อนแบบตลกๆ 😂

---

## 📁 โครงสร้างไฟล์

```
src/
├── __tests__/           # Unit tests (65 tests)
├── configs/
│   ├── constants.ts     # ค่าคงที่และ mappings
│   ├── database.ts      # PostgreSQL connection pool
│   └── lineClient.ts    # LINE Bot SDK client
├── cron/
│   ├── cronJobs.ts      # Weekly report + daily reminder
│   └── pushMessage.ts   # Push messages (weekly + reminder)
├── handlers/
│   ├── commandDispatcher.ts
│   ├── handleIncomingMessage.ts
│   ├── postbackHandler.ts  # ปุ่ม Confirm/Cancel postback
│   └── commands/        # Handler แต่ละคำสั่ง
├── queue/
│   └── commandQueue.ts  # จัดคิวคำสั่ง (max 5 พร้อมกัน)
├── repositories/        # Data access layer
├── services/            # Business logic layer
├── types/               # TypeScript interfaces
├── utils/
│   ├── flexMessage.ts   # Flex Message builders
│   ├── sendLineMsg.ts   # Reply helpers (text/flex)
│   └── utils.ts         # Date formatting, helpers
├── validations/         # Input validation
└── app.ts               # Entry point
```

---

## 🧪 Testing

```bash
yarn test
```

ครอบคลุม 65 test cases:

- ✅ Command Queue (concurrency, error handling)
- ✅ Utils (date formatting, week calculation)
- ✅ Constants validation
- ✅ ทุก Command handler (input validation, Flex response messages)
- ✅ สถิติ, สรุป, postback handlers

---

## 📝 License

MIT
