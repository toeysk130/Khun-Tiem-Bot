import { keywordMappings } from "../configs/constants";
import { ILeaveSchedule } from "../types/interface";
import { convertDatetimeToDDMMYY, getDisplayLeaveDate } from "./utils";
import { FlexBubble, FlexCarousel, FlexMessage } from "@line/bot-sdk";

// ── Color Palette ──
const COLORS = {
  primary: "#4A90D9",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
  info: "#3498DB",
  muted: "#95A5A6",
  dark: "#2C3E50",
  light: "#ECF0F1",
  hh: "#E91E63",
  bg: "#F8F9FA",
};

function statusColor(isApprove: boolean, status: string): string {
  if (isApprove) return COLORS.success;
  if (status === "key") return COLORS.warning;
  return COLORS.danger;
}

function statusEmoji(isApprove: boolean, status: string): string {
  if (isApprove) return "🟢";
  if (status === "key") return "🟡";
  return "🔴";
}

function statusText(isApprove: boolean, status: string): string {
  if (isApprove) return "Approved";
  if (status === "key") return "Keyed";
  return "Not Keyed";
}

// ── Flex Bubble Builders ──

export function buildLeaveSuccessBubble(
  member: string,
  leaveType: string,
  dateDisplay: string,
  periodDetail: string,
  description: string,
): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "✅ แจ้งลาสำเร็จ",
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
      ],
      backgroundColor: COLORS.success,
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: member,
          weight: "bold",
          size: "lg",
          color: COLORS.dark,
        },
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            buildInfoRow("📋 ประเภท", leaveType),
            buildInfoRow("📅 วันที่", dateDisplay),
            buildInfoRow("⏱️ จำนวน", periodDetail),
            ...(description ? [buildInfoRow("💬 เหตุผล", description)] : []),
          ],
        },
      ],
      paddingAll: "15px",
    },
  };

  return {
    type: "flex",
    altText: `✅ แจ้งลาสำเร็จ — ${member}`,
    contents: bubble,
  };
}

export function buildTodayReportBubble(leaves: ILeaveSchedule[]): FlexMessage {
  const leaveRows = leaves.map((l) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    margin: "md" as const,
    contents: [
      {
        type: "text" as const,
        text: `${statusEmoji(l.is_approve, l.status)}`,
        size: "sm" as const,
        flex: 0,
      },
      {
        type: "text" as const,
        text: `${l.member}`,
        size: "sm" as const,
        weight: "bold" as const,
        flex: 3,
        color: COLORS.dark,
      },
      {
        type: "text" as const,
        text: `${l.leave_type} ${l.period_detail}`,
        size: "xs" as const,
        flex: 4,
        color: COLORS.muted,
        align: "end" as const,
      },
    ],
  }));

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📋 คนที่ลาวันนี้ (${leaves.length} คน)`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "🟢 Approved",
              size: "xxs",
              color: COLORS.success,
              flex: 1,
            },
            {
              type: "text",
              text: "🟡 Keyed",
              size: "xxs",
              color: COLORS.warning,
              flex: 1,
            },
            {
              type: "text",
              text: "🔴 Pending",
              size: "xxs",
              color: COLORS.danger,
              flex: 1,
            },
          ],
          margin: "none",
        },
        { type: "separator", margin: "md" },
        ...(leaveRows.length > 0
          ? leaveRows
          : [
              {
                type: "text" as const,
                text: "ไม่มีใครลาวันนี้ 🎉",
                size: "sm" as const,
                color: COLORS.muted,
                margin: "md" as const,
                align: "center" as const,
              },
            ]),
      ],
      paddingAll: "15px",
    },
  };

  return {
    type: "flex",
    altText: `📋 คนที่ลาวันนี้ ${leaves.length} คน`,
    contents: bubble,
  };
}

export function buildWeeklyReportBubble(
  title: string,
  dayRows: { day: string; date: string; members: string[] }[],
): FlexMessage {
  const dayColors = ["#F1C40F", "#E91E63", "#27AE60", "#E67E22", "#3498DB"];

  const rows = dayRows.map((row, i) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    margin: "md" as const,
    contents: [
      {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          {
            type: "text" as const,
            text: row.day,
            size: "xs" as const,
            weight: "bold" as const,
            color: "#FFFFFF",
            align: "center" as const,
          },
          {
            type: "text" as const,
            text: row.date.split("-").pop() || "",
            size: "xxs" as const,
            color: "#FFFFFF",
            align: "center" as const,
          },
        ],
        backgroundColor: dayColors[i],
        cornerRadius: "md",
        paddingAll: "5px",
        width: "45px",
        justifyContent: "center" as const,
      },
      {
        type: "text" as const,
        text: row.members.length > 0 ? row.members.join(", ") : "—",
        size: "xs" as const,
        flex: 5,
        wrap: true,
        color: row.members.length > 0 ? COLORS.dark : COLORS.muted,
        gravity: "center" as const,
      },
    ],
  }));

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `😶‍🌫️ ${title}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
      ],
      backgroundColor: COLORS.info,
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: rows,
      paddingAll: "15px",
    },
  };

  return { type: "flex", altText: title, contents: bubble };
}

export function buildMonthlyCarousel(
  monthTitle: string,
  memberData: { member: string; leaves: ILeaveSchedule[]; totalDays: number }[],
): FlexMessage {
  const bubbles: FlexBubble[] = memberData.map((data) => ({
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `👤 ${data.member}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `รวม ${data.totalDays} วัน`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: data.leaves.map((l) => ({
        type: "box" as const,
        layout: "horizontal" as const,
        spacing: "sm" as const,
        margin: "sm" as const,
        contents: [
          {
            type: "text" as const,
            text: statusEmoji(l.is_approve, l.status),
            size: "sm" as const,
            flex: 0,
          },
          {
            type: "text" as const,
            text: `${l.leave_type}`,
            size: "xs" as const,
            flex: 2,
            color: COLORS.dark,
          },
          {
            type: "text" as const,
            text: getDisplayLeaveDate(l.leave_start_dt, l.leave_end_dt),
            size: "xxs" as const,
            flex: 3,
            color: COLORS.muted,
            align: "end" as const,
          },
        ],
      })),
      paddingAll: "12px",
      spacing: "sm",
    },
  }));

  const carousel: FlexCarousel = {
    type: "carousel",
    contents: bubbles.slice(0, 10), // LINE limit: 10 bubbles
  };

  return {
    type: "flex",
    altText: `📊 ${monthTitle}`,
    contents: carousel,
  };
}

export function buildSummaryBubble(
  member: string,
  summaryRows: { type: string; days: number; count: number }[],
  totalDays: number,
): FlexMessage {
  const rows = summaryRows.map((row) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    margin: "md" as const,
    contents: [
      {
        type: "text" as const,
        text: `📋 ${row.type}`,
        size: "sm" as const,
        flex: 3,
        color: COLORS.dark,
      },
      {
        type: "text" as const,
        text: `${row.days} วัน`,
        size: "sm" as const,
        flex: 2,
        align: "end" as const,
        color: COLORS.primary,
        weight: "bold" as const,
      },
      {
        type: "text" as const,
        text: `(${row.count} ครั้ง)`,
        size: "xs" as const,
        flex: 2,
        align: "end" as const,
        color: COLORS.muted,
      },
    ],
  }));

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📈 สรุปวันลา`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        { type: "text", text: member, size: "sm", color: "#FFFFFFCC" },
      ],
      backgroundColor: COLORS.info,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        ...rows,
        { type: "separator", margin: "lg" },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "📊 รวมทั้งหมด",
              size: "sm",
              flex: 3,
              weight: "bold",
              color: COLORS.dark,
            },
            {
              type: "text",
              text: `${totalDays} วัน`,
              size: "md",
              flex: 2,
              align: "end",
              weight: "bold",
              color: COLORS.success,
            },
          ],
        },
      ],
      paddingAll: "12px",
    },
  };

  return {
    type: "flex",
    altText: `📈 สรุปวันลาของ ${member}: ${totalDays} วัน`,
    contents: bubble,
  };
}

export function buildTeamSummaryCarousel(
  memberSummaries: {
    member: string;
    types: { type: string; days: number }[];
    totalDays: number;
    hhRemaining: number;
  }[],
): FlexMessage {
  const bubbles: FlexBubble[] = memberSummaries.map((data) => ({
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `👤 ${data.member}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: `📊 ${data.totalDays} วัน`,
              size: "xs",
              color: "#FFFFFFCC",
              flex: 1,
            },
            {
              type: "text",
              text: `❤️ HH: ${data.hhRemaining}h`,
              size: "xs",
              color: "#FFFFFFCC",
              flex: 1,
              align: "end",
            },
          ],
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: data.types.map((t) => ({
        type: "box" as const,
        layout: "horizontal" as const,
        margin: "sm" as const,
        contents: [
          {
            type: "text" as const,
            text: `📋 ${t.type}`,
            size: "sm" as const,
            flex: 3,
            color: COLORS.dark,
          },
          {
            type: "text" as const,
            text: `${t.days} วัน`,
            size: "sm" as const,
            flex: 1,
            align: "end" as const,
            weight: "bold" as const,
            color: COLORS.primary,
          },
        ],
      })),
      paddingAll: "12px",
    },
  }));

  return {
    type: "flex",
    altText: `📈 สรุปวันลาทั้งทีม`,
    contents: { type: "carousel", contents: bubbles.slice(0, 10) },
  };
}

export function buildDeleteConfirmBubble(
  id: string,
  member: string,
  leaveType: string,
  dateDisplay: string,
  periodDetail: string,
): FlexMessage {
  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "⚠️ ยืนยันการลบ",
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
      ],
      backgroundColor: COLORS.warning,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: `ID: ${id}`, size: "xs", color: COLORS.muted },
        {
          type: "text",
          text: member,
          size: "md",
          weight: "bold",
          color: COLORS.dark,
          margin: "sm",
        },
        buildInfoRow("📋", leaveType),
        buildInfoRow("📅", dateDisplay),
        buildInfoRow("⏱️", periodDetail),
      ],
      paddingAll: "12px",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: COLORS.danger,
          action: {
            type: "postback",
            label: "🗑️ ลบเลย",
            data: `action=delete&id=${id}`,
            displayText: `ยืนยันลบ ID:${id}`,
          },
        },
        {
          type: "button",
          style: "secondary",
          action: {
            type: "postback",
            label: "❌ ยกเลิก",
            data: `action=cancel_delete&id=${id}`,
            displayText: "ยกเลิกการลบ",
          },
        },
      ],
      paddingAll: "12px",
    },
  };

  return {
    type: "flex",
    altText: `⚠️ ยืนยันลบ ID:${id} - ${member} ${leaveType}`,
    contents: bubble,
  };
}

export function buildMonthlyStatsBubble(
  monthName: string,
  current: {
    total: number;
    totalDays: number;
    totalMembers: number;
    topLeaver: { name: string; days: number } | null;
    mostPopularType: { type: string; count: number } | null;
    busiestDay: { day: string; count: number } | null;
  },
  prev: {
    total: number;
    totalDays: number;
    topLeaver: { name: string; days: number } | null;
  },
  prevMonthName: string,
): FlexMessage {
  const avgPerPerson =
    current.totalMembers > 0
      ? Math.round((current.totalDays / current.totalMembers) * 10) / 10
      : 0;

  // Fun comparison messages
  const funComparisons: string[] = [];
  const diff = current.total - prev.total;
  if (diff > 0) {
    funComparisons.push(
      `📈 ลามากกว่าเดือน${prevMonthName} ${diff} ครั้ง... ทำงานหนักมากใช่มั้ยทุกคน? 😅`,
    );
  } else if (diff < 0) {
    funComparisons.push(
      `📉 ลาน้อยกว่าเดือน${prevMonthName} ${Math.abs(diff)} ครั้ง! ขยันกันจัง 💪`,
    );
  } else {
    funComparisons.push(
      `🤝 ลาเท่าเดือน${prevMonthName}เป๊ะ... นัดกันมาละหรอ? 🤔`,
    );
  }

  if (current.topLeaver && prev.topLeaver) {
    if (current.topLeaver.name === prev.topLeaver.name) {
      funComparisons.push(
        `🔥 ${current.topLeaver.name} ครองแชมป์ 2 เดือนซ้อน! อยู่ออฟฟิศบ้างนะ 😂`,
      );
    }
  }

  if (current.total === 0) {
    funComparisons.push(
      "🎉 ไม่มีใครลาเลย! ทีมเราเป็นทีมในฝัน... หรือลืมแจ้ง? 🤣",
    );
  }

  const rows: any[] = [
    buildStatRow("📝 รายการลาเดือนนี้", `${current.total} ครั้ง`),
    buildStatRow("📊 รวม", `${current.totalDays} วัน`),
    buildStatRow("📊 เฉลี่ยต่อคน", `${avgPerPerson} วัน`),
  ];

  if (current.topLeaver) {
    rows.push(
      buildStatRow(
        "🏆 แชมป์ลามากสุด",
        `${current.topLeaver.name} (${current.topLeaver.days} วัน)`,
      ),
    );
  }
  if (current.mostPopularType) {
    rows.push(
      buildStatRow(
        "📋 ประเภทยอดฮิต",
        `${current.mostPopularType.type} (${current.mostPopularType.count} ครั้ง)`,
      ),
    );
  }
  if (current.busiestDay) {
    rows.push(
      buildStatRow(
        "📅 วันลายอดฮิต",
        `${current.busiestDay.day} (${current.busiestDay.count} คน)`,
      ),
    );
  }

  // Add fun comparison as separator + text
  rows.push({ type: "separator" as const, margin: "lg" as const });
  funComparisons.forEach((msg) => {
    rows.push({
      type: "text" as const,
      text: msg,
      size: "xs" as const,
      color: COLORS.muted,
      wrap: true,
      margin: "sm" as const,
    });
  });

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `🏆 สถิติเดือน${monthName}`,
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: "ข้อมูลสนุกๆ ของทีมเรา 😎",
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: "#8E44AD",
      paddingAll: "15px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: rows,
      paddingAll: "15px",
      spacing: "md",
    },
  };

  return {
    type: "flex",
    altText: `🏆 สถิติเดือน${monthName}`,
    contents: bubble,
  };
}

export function buildPersonalReportBubble(
  member: string,
  leaves: ILeaveSchedule[],
  hhInfo: {
    notApproved: number;
    remaining: number;
    pendingHH: { id: number; hours: number; description: string }[];
  },
  yearLabel: string,
): FlexMessage {
  const FIRST_PAGE_LIMIT = 15;
  const NEXT_PAGE_LIMIT = 20;

  // Helper: build leave rows
  function buildLeaveRows(items: ILeaveSchedule[]) {
    const rows: any[] = [];
    items.forEach((l) => {
      // Main row: emoji + ID + type + date
      rows.push({
        type: "box" as const,
        layout: "horizontal" as const,
        spacing: "sm" as const,
        margin: "sm" as const,
        contents: [
          {
            type: "text" as const,
            text: statusEmoji(l.is_approve, l.status),
            size: "sm" as const,
            flex: 0,
          },
          {
            type: "text" as const,
            text: `<${l.id}>`,
            size: "xxs" as const,
            flex: 1,
            color: COLORS.muted,
          },
          {
            type: "text" as const,
            text: l.leave_type,
            size: "xs" as const,
            flex: 2,
            color: COLORS.dark,
          },
          {
            type: "text" as const,
            text: `${getDisplayLeaveDate(l.leave_start_dt, l.leave_end_dt)} (${l.period_detail})`,
            size: "xxs" as const,
            flex: 4,
            color: COLORS.muted,
            align: "end" as const,
            wrap: true,
          },
        ],
      });
      // Detail row: description only
      if (l.description) {
        rows.push({
          type: "text" as const,
          text: `     ${l.description}`,
          size: "xxs" as const,
          color: COLORS.muted,
          margin: "none" as const,
        });
      }
    });
    return rows;
  }

  // Build first bubble body
  const firstPageLeaves = leaves.slice(0, FIRST_PAGE_LIMIT);
  const firstLeaveRows = buildLeaveRows(firstPageLeaves);

  const bodyContents: any[] = [
    {
      type: "box" as const,
      layout: "horizontal" as const,
      contents: [
        {
          type: "text" as const,
          text: `🙅‍♂️ HH รอ approve: ${hhInfo.notApproved}h`,
          size: "xs" as const,
          color: COLORS.warning,
          flex: 1,
        },
        {
          type: "text" as const,
          text: `❤️ HH เหลือ: ${hhInfo.remaining}h`,
          size: "xs" as const,
          color: COLORS.success,
          flex: 1,
          align: "end" as const,
        },
      ],
    },
    { type: "separator" as const, margin: "md" as const },
    ...(firstLeaveRows.length > 0
      ? firstLeaveRows
      : [
          {
            type: "text" as const,
            text: "ยังไม่มีรายการลา 🎉",
            size: "sm" as const,
            color: COLORS.muted,
            margin: "md" as const,
            align: "center" as const,
          },
        ]),
  ];

  // HH pending section (first bubble only)
  if (hhInfo.pendingHH.length > 0) {
    bodyContents.push({ type: "separator" as const, margin: "md" as const });
    bodyContents.push({
      type: "text" as const,
      text: "❤️ HH ที่รอ Approve",
      size: "xs" as const,
      color: COLORS.hh,
      weight: "bold" as const,
      margin: "md" as const,
    });
    hhInfo.pendingHH.forEach((hh) => {
      bodyContents.push({
        type: "text" as const,
        text: `🙅‍♂️ <${hh.id}> ${hh.hours}h ${hh.description ? `(${hh.description})` : ""}`,
        size: "xxs" as const,
        color: COLORS.dark,
        margin: "sm" as const,
      });
    });
  }

  // Calculate total pages
  const remaining = leaves.length - FIRST_PAGE_LIMIT;
  const extraPages = remaining > 0 ? Math.ceil(remaining / NEXT_PAGE_LIMIT) : 0;
  const totalPages = 1 + Math.min(extraPages, 11); // LINE max 12 bubbles

  const pageLabel = totalPages > 1 ? ` (1/${totalPages})` : "";

  const firstBubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📋 ${member}${pageLabel}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `${yearLabel} • ${leaves.length} รายการ`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "12px",
    },
  };

  // Single page — return bubble directly
  if (totalPages === 1) {
    return {
      type: "flex",
      altText: `📋 รายการของ ${member} (${yearLabel})`,
      contents: firstBubble,
    };
  }

  // Multi-page — build Carousel
  const bubbles: FlexBubble[] = [firstBubble];

  for (let page = 2; page <= totalPages; page++) {
    const start = FIRST_PAGE_LIMIT + (page - 2) * NEXT_PAGE_LIMIT;
    const end = start + NEXT_PAGE_LIMIT;
    const pageLeaves = leaves.slice(start, end);
    const pageRows = buildLeaveRows(pageLeaves);

    bubbles.push({
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `📋 ${member} (${page}/${totalPages})`,
            weight: "bold",
            size: "md",
            color: "#FFFFFF",
          },
          {
            type: "text",
            text: `${yearLabel} • รายการที่ ${start + 1}-${Math.min(end, leaves.length)}`,
            size: "xs",
            color: "#FFFFFFCC",
          },
        ],
        backgroundColor: COLORS.primary,
        paddingAll: "12px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: pageRows,
        paddingAll: "12px",
      },
    });
  }

  return {
    type: "flex",
    altText: `📋 รายการของ ${member} (${yearLabel}) ${leaves.length} รายการ`,
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

export function buildMemberListBubble(
  members: {
    name: string;
    isAdmin: boolean;
    hhRemaining: number;
    hhPending: number;
  }[],
): FlexMessage {
  // Header row
  const headerRow = {
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    margin: "none" as const,
    contents: [
      {
        type: "text" as const,
        text: "ชื่อ",
        size: "xxs" as const,
        color: COLORS.muted,
        flex: 3,
        weight: "bold" as const,
      },
      {
        type: "text" as const,
        text: "HH เหลือ",
        size: "xxs" as const,
        color: COLORS.muted,
        flex: 2,
        align: "center" as const,
        weight: "bold" as const,
      },
      {
        type: "text" as const,
        text: "รอ approve",
        size: "xxs" as const,
        color: COLORS.muted,
        flex: 2,
        align: "center" as const,
        weight: "bold" as const,
      },
    ],
  };

  const memberRows = members.map((m) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    spacing: "sm" as const,
    margin: "sm" as const,
    contents: [
      {
        type: "text" as const,
        text: `${m.name}${m.isAdmin ? " (admin)" : ""}`,
        size: "sm" as const,
        color: COLORS.dark,
        flex: 3,
      },
      {
        type: "text" as const,
        text: `${m.hhRemaining}h`,
        size: "sm" as const,
        color: m.hhRemaining > 0 ? COLORS.success : COLORS.muted,
        flex: 2,
        align: "center" as const,
        weight: "bold" as const,
      },
      {
        type: "text" as const,
        text: m.hhPending > 0 ? `${m.hhPending}h` : "-",
        size: "sm" as const,
        color: m.hhPending > 0 ? COLORS.warning : COLORS.muted,
        flex: 2,
        align: "center" as const,
      },
    ],
  }));

  const totalHH = members.reduce((s, m) => s + m.hhRemaining, 0);
  const totalPending = members.reduce((s, m) => s + m.hhPending, 0);

  const bubble: FlexBubble = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "👥 สมาชิกในทีม",
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `${members.length} คน`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: "#2C3E50",
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        headerRow,
        { type: "separator" as const, margin: "sm" as const },
        ...memberRows,
        { type: "separator" as const, margin: "md" as const },
        {
          type: "box" as const,
          layout: "horizontal" as const,
          spacing: "sm" as const,
          margin: "md" as const,
          contents: [
            {
              type: "text" as const,
              text: "📊 รวม",
              size: "xs" as const,
              color: COLORS.dark,
              flex: 3,
              weight: "bold" as const,
            },
            {
              type: "text" as const,
              text: `${totalHH}h`,
              size: "xs" as const,
              color: COLORS.success,
              flex: 2,
              align: "center" as const,
              weight: "bold" as const,
            },
            {
              type: "text" as const,
              text: totalPending > 0 ? `${totalPending}h` : "-",
              size: "xs" as const,
              color: COLORS.warning,
              flex: 2,
              align: "center" as const,
              weight: "bold" as const,
            },
          ],
        },
      ],
      paddingAll: "12px",
    },
  };

  return {
    type: "flex",
    altText: `👥 สมาชิกในทีม ${members.length} คน`,
    contents: bubble,
  };
}

// ── Helper builders ──

function buildInfoRow(label: string, value: string) {
  return {
    type: "box" as const,
    layout: "horizontal" as const,
    margin: "sm" as const,
    contents: [
      {
        type: "text" as const,
        text: label,
        size: "sm" as const,
        color: COLORS.muted,
        flex: 2,
      },
      {
        type: "text" as const,
        text: value,
        size: "sm" as const,
        color: COLORS.dark,
        flex: 4,
        wrap: true,
      },
    ],
  };
}

function buildStatRow(label: string, value: string) {
  return {
    type: "box" as const,
    layout: "horizontal" as const,
    contents: [
      {
        type: "text" as const,
        text: label,
        size: "sm" as const,
        color: COLORS.dark,
        flex: 3,
        wrap: true,
      },
      {
        type: "text" as const,
        text: value,
        size: "sm" as const,
        color: COLORS.primary,
        flex: 3,
        align: "end" as const,
        weight: "bold" as const,
        wrap: true,
      },
    ],
  };
}

// ══════════════════════════════════════════════════════════
// Generic Result Bubble (success / error / info)
// ══════════════════════════════════════════════════════════

type ResultType = "success" | "error" | "info" | "warning" | "hh";

const RESULT_THEMES: Record<
  ResultType,
  { bg: string; icon: string; label: string }
> = {
  success: { bg: "#27AE60", icon: "✅", label: "สำเร็จ" },
  error: { bg: "#E74C3C", icon: "❌", label: "ผิดพลาด" },
  info: { bg: "#3498DB", icon: "ℹ️", label: "ข้อมูล" },
  warning: { bg: "#F39C12", icon: "⚠️", label: "แจ้งเตือน" },
  hh: { bg: "#E91E63", icon: "❤️", label: "Happy Hour" },
};

export function buildResultBubble(
  type: ResultType,
  title: string,
  details: { label: string; value: string; color?: string }[],
  altText?: string,
): FlexMessage {
  const theme = RESULT_THEMES[type];

  const detailRows = details.map((d) => ({
    type: "box" as const,
    layout: "horizontal" as const,
    margin: "sm" as const,
    contents: [
      {
        type: "text" as const,
        text: d.label,
        size: "sm" as const,
        color: COLORS.muted,
        flex: 2,
      },
      {
        type: "text" as const,
        text: d.value,
        size: "sm" as const,
        color: d.color || COLORS.dark,
        flex: 3,
        align: "end" as const,
        weight: "bold" as const,
        wrap: true,
      },
    ],
  }));

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${theme.icon} ${title}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
      backgroundColor: theme.bg,
      paddingAll: "12px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents:
        detailRows.length > 0
          ? detailRows
          : [
              {
                type: "text" as const,
                text: "เรียบร้อย",
                size: "sm" as const,
                color: COLORS.muted,
                align: "center" as const,
              },
            ],
      paddingAll: "12px",
      spacing: "sm",
    },
  };

  return {
    type: "flex",
    altText: altText || `${theme.icon} ${title}`,
    contents: bubble,
  };
}

// ══════════════════════════════════════════════════════════
// Leave Date Picker Flow — Interactive leave request via Flex
// ══════════════════════════════════════════════════════════

export function buildLeaveTypePickerBubble(): FlexMessage {
  const types = ["ลาพักร้อน", "ลาป่วย", "ลากิจ"];

  const leaveButtons = types.map((t) => ({
    type: "button" as const,
    style: "primary" as const,
    color: COLORS.primary,
    action: {
      type: "datetimepicker" as const,
      label: t,
      data: `action=leave_date&type=${t}`,
      mode: "date" as const,
    },
    margin: "sm" as const,
    height: "sm" as const,
  }));

  // HH button — separate color
  const hhButton = {
    type: "button" as const,
    style: "primary" as const,
    color: COLORS.hh,
    action: {
      type: "datetimepicker" as const,
      label: "ใช้ HH ❤️",
      data: "action=leave_date&type=hh",
      mode: "date" as const,
    },
    margin: "sm" as const,
    height: "sm" as const,
  };

  const buttons = [...leaveButtons, hhButton];

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "📅 แจ้งลาง่าย",
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: "เลือกประเภทลา แล้วเลือกวันที่",
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: buttons,
      paddingAll: "12px",
      spacing: "sm",
    },
  };

  return {
    type: "flex",
    altText: "📅 แจ้งลาง่าย — เลือกประเภทลา",
    contents: bubble,
  };
}

export function buildLeavePeriodPickerBubble(
  leaveType: string,
  date: string,
): FlexMessage {
  const cancelBtn = {
    type: "button" as const,
    style: "secondary" as const,
    action: {
      type: "postback" as const,
      label: "❌ ยกเลิก",
      data: "action=leave_cancel",
    },
    margin: "md" as const,
    height: "sm" as const,
  };

  const periods = [
    { label: "🌞 เต็มวัน", value: "1วัน" },
    { label: "🌅 ครึ่งเช้า", value: "ครึ่งเช้า" },
    { label: "🌇 ครึ่งบ่าย", value: "ครึ่งบ่าย" },
  ];

  const periodButtons = periods.map((p) => ({
    type: "button" as const,
    style: (p.value === "1วัน" ? "primary" : "secondary") as
      | "primary"
      | "secondary",
    color: p.value === "1วัน" ? COLORS.primary : undefined,
    action: {
      type: "postback" as const,
      label: p.label,
      data: `action=leave_period&type=${leaveType}&date=${date}&period=${p.value}`,
    },
    margin: "sm" as const,
    height: "sm" as const,
  }));

  const multiDayBtn = {
    type: "button" as const,
    style: "primary" as const,
    color: COLORS.warning,
    action: {
      type: "datetimepicker" as const,
      label: "📅 หลายวัน (เลือกวันสิ้นสุด)",
      data: `action=leave_end_date&type=${leaveType}&start=${date}`,
      mode: "date" as const,
    },
    margin: "sm" as const,
    height: "sm" as const,
  };

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📅 ${leaveType === "hh" ? "ใช้ HH ❤️" : leaveType}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `วันที่เริ่ม: ${date}`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.warning,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ลาวันเดียว หรือหลายวัน?",
          size: "sm",
          color: COLORS.dark,
          weight: "bold",
        },
        ...periodButtons,
        { type: "separator" as const, margin: "md" as const },
        multiDayBtn,
        cancelBtn,
      ],
      paddingAll: "12px",
      spacing: "sm",
    },
  };

  return {
    type: "flex",
    altText: `📅 ${leaveType} ${date} — เลือกช่วงเวลา`,
    contents: bubble,
  };
}

export function buildLeaveDaysPickerBubble(
  leaveType: string,
  startDate: string,
  endDate: string,
): FlexMessage {
  const dayOptions = ["1วัน", "2วัน", "3วัน", "4วัน", "5วัน", "6วัน", "7วัน"];

  const buttons = dayOptions.map((d) => ({
    type: "button" as const,
    style: "secondary" as const,
    action: {
      type: "postback" as const,
      label: d,
      data: `action=leave_range_days&type=${leaveType}&date=${startDate}-${endDate}&period=${d}`,
    },
    margin: "xs" as const,
    height: "sm" as const,
  }));

  const cancelBtn = {
    type: "button" as const,
    style: "secondary" as const,
    action: {
      type: "postback" as const,
      label: "❌ ยกเลิก",
      data: "action=leave_cancel",
    },
    margin: "md" as const,
    height: "sm" as const,
  };

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📅 ${leaveType === "hh" ? "ใช้ HH ❤️" : leaveType}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `${startDate} ถึง ${endDate}`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.info,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ลาจริงกี่วัน? (ไม่นับเสาร์-อาทิตย์/วันหยุด)",
          size: "sm",
          color: COLORS.dark,
          weight: "bold",
          wrap: true,
        },
        ...buttons,
        cancelBtn,
      ],
      paddingAll: "12px",
      spacing: "none",
    },
  };

  return {
    type: "flex",
    altText: `📅 ${leaveType} ${startDate}-${endDate} — ลาจริงกี่วัน?`,
    contents: bubble,
  };
}

export function buildLeaveKeyPickerBubble(
  leaveType: string,
  date: string,
  period: string,
): FlexMessage {
  const cancelBtn = {
    type: "button" as const,
    style: "secondary" as const,
    action: {
      type: "postback" as const,
      label: "❌ ยกเลิก",
      data: "action=leave_cancel",
    },
    margin: "md" as const,
    height: "sm" as const,
  };

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `📅 ${leaveType}`,
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `${date} • ${period}`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.info,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "มี Key ลาไหม?",
          size: "sm",
          color: COLORS.dark,
          weight: "bold",
        },
        {
          type: "button" as const,
          style: "primary" as const,
          color: COLORS.success,
          action: {
            type: "postback" as const,
            label: "✅ มี Key ลา",
            data: `action=leave_confirm&type=${leaveType}&date=${date}&period=${period}&key=key`,
          },
          margin: "sm" as const,
          height: "sm" as const,
        },
        {
          type: "button" as const,
          style: "secondary" as const,
          action: {
            type: "postback" as const,
            label: "❌ ไม่มี Key ลา",
            data: `action=leave_confirm&type=${leaveType}&date=${date}&period=${period}&key=nokey`,
          },
          margin: "sm" as const,
          height: "sm" as const,
        },
        cancelBtn,
      ],
      paddingAll: "12px",
      spacing: "sm",
    },
  };

  return {
    type: "flex",
    altText: `📅 ${leaveType} ${date} — มี Key ลาไหม?`,
    contents: bubble,
  };
}

export function buildHhHoursPickerBubble(
  date: string,
  period: string,
): FlexMessage {
  const hours = [
    { label: "1h", value: "1" },
    { label: "2h", value: "2" },
    { label: "4h (ครึ่งวัน)", value: "4" },
    { label: "8h (เต็มวัน)", value: "8" },
  ];

  const cancelBtn = {
    type: "button" as const,
    style: "secondary" as const,
    action: {
      type: "postback" as const,
      label: "❌ ยกเลิก",
      data: "action=leave_cancel",
    },
    margin: "md" as const,
    height: "sm" as const,
  };

  const buttons = hours.map((h) => ({
    type: "button" as const,
    style: (h.value === "4" ? "primary" : "secondary") as
      | "primary"
      | "secondary",
    color: h.value === "4" ? COLORS.hh : undefined,
    action: {
      type: "postback" as const,
      label: `❤️ ${h.label}`,
      data: `action=hh_confirm&date=${date}&period=${period}&hours=${h.value}`,
    },
    margin: "sm" as const,
    height: "sm" as const,
  }));

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "❤️ ใช้ Happy Hour",
          weight: "bold",
          size: "md",
          color: "#FFFFFF",
        },
        {
          type: "text",
          text: `${date} • ${period}`,
          size: "xs",
          color: "#FFFFFFCC",
        },
      ],
      backgroundColor: COLORS.hh,
      paddingAll: "16px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ใช้กี่ชั่วโมง?",
          size: "sm",
          color: COLORS.dark,
          weight: "bold",
        },
        ...buttons,
        cancelBtn,
      ],
      paddingAll: "12px",
      spacing: "sm",
    },
  };

  return {
    type: "flex",
    altText: `❤️ ใช้ HH ${date} — เลือกจำนวนชั่วโมง`,
    contents: bubble,
  };
}
