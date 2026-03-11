import {
  ncTypes,
  validKeyStatus,
  validLeaveAmounts,
  validLeaveTypes,
} from "../configs/constants";
import { lineClient } from "../configs/lineClient";
import { commandDispatcher } from "../handlers/commandDispatcher";
import { UserMetaData } from "../types/interface";
import { replyMessage } from "../utils/sendLineMsg";
import { parseNaturalLanguageCommand } from "./openaiService";

// ── Session Store ──

interface ConversationSession {
  userMetadata: UserMetaData;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  pendingCommand: string | null;
  awaitingConfirm: boolean;
  lastActivity: number;
}

const sessions = new Map<string, ConversationSession>();

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Command Validator ──
// Checks GPT-generated commands against real format rules
// before showing to the user. Returns null if valid, or an error string.

const DATE_REGEX =
  /^\d{2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{2}$/i;
const DATE_RANGE_REGEX =
  /^\d{2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{2}-\d{2}(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\d{2}$/i;
const HH_AMT_REGEX = /^\d+h$/;

function validateGeneratedCommand(command: string): string | null {
  const parts = command.split(" ");
  const cmd = parts[0];

  switch (cmd) {
    case "แจ้งลา": {
      // แจ้งลา <type> <date> <amount> <key> [reason]
      if (parts.length < 5)
        return "แจ้งลา ต้องมีอย่างน้อย 5 ส่วน: แจ้งลา <ประเภท> <วันที่> <จำนวน> <key/nokey> [เหตุผล]";
      if (!validLeaveTypes.includes(parts[1]))
        return `ประเภทลา "${parts[1]}" ไม่ถูกต้อง ต้องเป็น: ${validLeaveTypes.join(", ")}`;
      if (!DATE_REGEX.test(parts[2]) && !DATE_RANGE_REGEX.test(parts[2]))
        return `วันที่ "${parts[2]}" ไม่ถูกต้อง ต้องเป็น DDMMMYY เช่น 20FEB26 หรือ 20FEB26-22FEB26`;
      if (!validLeaveAmounts.includes(parts[3]))
        return `จำนวนวัน "${parts[3]}" ไม่ถูกต้อง ต้องเป็น: 1วัน, 2วัน, ..., ครึ่งเช้า, ครึ่งบ่าย`;
      if (!["key", "nokey"].includes(parts[4]))
        return `สถานะ key "${parts[4]}" ไม่ถูกต้อง ต้องเป็น key หรือ nokey`;
      return null;
    }

    case "nc": {
      // nc <type> <date> <amount> [reason]
      if (parts.length < 4)
        return "nc ต้องมีอย่างน้อย 4 ส่วน: nc <ประเภท> <วันที่> <จำนวน> [เหตุผล]";
      if (!ncTypes.includes(parts[1]))
        return `ประเภท NC "${parts[1]}" ไม่ถูกต้อง ต้องเป็น: ${ncTypes.join(", ")}`;
      if (!DATE_REGEX.test(parts[2]) && !DATE_RANGE_REGEX.test(parts[2]))
        return `วันที่ "${parts[2]}" ไม่ถูกต้อง ต้องเป็น DDMMMYY`;
      if (!validLeaveAmounts.includes(parts[3]))
        return `จำนวนวัน "${parts[3]}" ไม่ถูกต้อง`;
      return null;
    }

    case "hh": {
      if (parts.length < 3)
        return "hh ต้องมีอย่างน้อย: hh เพิ่ม <N>h หรือ hh ใช้ <N>h <วันที่> <จำนวน>";
      const subCmd = parts[1];

      if (subCmd === "เพิ่ม") {
        // hh เพิ่ม <N>h [reason]
        if (!HH_AMT_REGEX.test(parts[2]))
          return `จำนวน HH "${parts[2]}" ไม่ถูกต้อง ต้องเป็นตัวเลข+h เช่น 1h, 2h`;
        return null;
      }

      if (subCmd === "ใช้") {
        // hh ใช้ <N>h <date> <amount> [reason]
        if (parts.length < 5)
          return "hh ใช้ ต้องมี: hh ใช้ <N>h <วันที่> <จำนวนวัน> [เหตุผล] เช่น hh ใช้ 1h 20FEB26 ครึ่งบ่าย เลิกไว";
        if (!HH_AMT_REGEX.test(parts[2]))
          return `จำนวน HH "${parts[2]}" ไม่ถูกต้อง ต้องเป็นตัวเลข+h เช่น 1h`;
        if (!DATE_REGEX.test(parts[3]) && !DATE_RANGE_REGEX.test(parts[3]))
          return `วันที่ "${parts[3]}" ไม่ถูกต้อง ต้องเป็น DDMMMYY`;
        if (!validLeaveAmounts.includes(parts[4]))
          return `จำนวนวัน "${parts[4]}" ไม่ถูกต้อง ต้องเป็น: 1วัน, ครึ่งเช้า, ครึ่งบ่าย, ...`;
        return null;
      }

      if (subCmd === "approve") {
        if (parts.length < 3)
          return "hh approve ต้องมี ID เช่น hh approve 3,4,8 หรือ hh approve all";
        return null;
      }

      if (subCmd === "ลบ") {
        if (parts.length < 3) return "hh ลบ ต้องมี ID เช่น hh ลบ 5";
        if (isNaN(Number(parts[2])))
          return `ID "${parts[2]}" ต้องเป็นตัวเลข`;
        return null;
      }

      return `คำสั่ง hh "${subCmd}" ไม่ถูกต้อง ต้องเป็น: เพิ่ม, ใช้, approve, ลบ`;
    }

    case "ลบ": {
      if (parts.length < 2) return "ลบ ต้องระบุ ID เช่น ลบ 123";
      if (isNaN(Number(parts[1]))) return `ID "${parts[1]}" ต้องเป็นตัวเลข`;
      return null;
    }

    case "อัปเดต": {
      if (parts.length < 3)
        return "อัปเดต ต้องมี: อัปเดต <ID> <key/nokey/cer/nocer>";
      if (isNaN(Number(parts[1]))) return `ID "${parts[1]}" ต้องเป็นตัวเลข`;
      if (!validKeyStatus.includes(parts[2]))
        return `สถานะ "${parts[2]}" ไม่ถูกต้อง ต้องเป็น: ${validKeyStatus.join(", ")}`;
      return null;
    }

    default:
      return `คำสั่ง "${cmd}" ไม่รองรับ ต้องเป็น: แจ้งลา, nc, hh, ลบ, อัปเดต`;
  }
}

// ── Public API ──

export function hasActiveSession(userId: string): boolean {
  const session = sessions.get(userId);
  if (!session) return false;
  if (Date.now() - session.lastActivity > SESSION_TIMEOUT_MS) {
    sessions.delete(userId);
    return false;
  }
  return true;
}

export async function handleConversation(
  userId: string,
  message: string,
  userMetadata: UserMetaData,
  quotedText?: string | null,
  quoteToken?: string | null,
): Promise<void> {
  let session = sessions.get(userId);

  // New session (first natural-language message)
  if (!session) {
    session = {
      userMetadata,
      conversationHistory: [],
      pendingCommand: null,
      awaitingConfirm: false,
      lastActivity: Date.now(),
    };
    sessions.set(userId, session);
  }

  // Update metadata (new reply token every message)
  session.userMetadata = userMetadata;
  session.lastActivity = Date.now();

  // ── Confirm / Cancel ──
  if (session.awaitingConfirm) {
    const lower = message.trim().toLowerCase();
    const isConfirm =
      lower === "ใช่" ||
      lower === "ตกลง" ||
      lower === "ยืนยัน" ||
      lower === "ok" ||
      lower === "yes" ||
      lower === "y";
    const isCancel =
      lower === "ไม่" ||
      lower === "ยกเลิก" ||
      lower === "cancel" ||
      lower === "no" ||
      lower === "n";

    if (isConfirm && session.pendingCommand) {
      const commandArr = session.pendingCommand.split(" ");
      const command = commandArr[0];
      sessions.delete(userId);
      await commandDispatcher(userMetadata, command, commandArr, true);
      return;
    }

    if (isCancel) {
      sessions.delete(userId);
      await replyMessage(
        lineClient,
        userMetadata.replyToken,
        "❌ ยกเลิกเรียบร้อย",
        quoteToken || undefined,
      );
      return;
    }

    // Not a clear confirm/cancel — re-ask
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      `🤖 ตอบ "ใช่" เพื่อยืนยัน หรือ "ไม่" เพื่อยกเลิก\n\n📝 ${session.pendingCommand}`,
      quoteToken || undefined,
    );
    return;
  }

  // ── GPT Parsing ──
  session.conversationHistory.push({ role: "user", content: message });

  const result = await parseNaturalLanguageCommand(
    session.conversationHistory,
    userMetadata.username,
    quotedText,
  );

  if (!result) {
    sessions.delete(userId);
    const { chatWithAI } = await import("./openaiService");

    let prompt = message;
    if (quotedText)
      prompt += `\n(ผู้ใช้ได้ตอบกลับข้อความเดิมของคุณว่า: "${quotedText}")`;

    const reply = await chatWithAI(prompt);
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      reply,
      quoteToken || undefined,
    );
    return;
  }

  // No relevant intent detected — regular AI chat
  if (!result.intent) {
    sessions.delete(userId);
    const { chatWithAI } = await import("./openaiService");

    let prompt = message;
    if (quotedText)
      prompt += `\n(ผู้ใช้ได้ตอบกลับข้อความเดิมของคุณว่า: "${quotedText}")`;

    const reply = await chatWithAI(prompt);
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      reply,
      quoteToken || undefined,
    );
    return;
  }

  // Allowed everywhere now

  // GPT has a question (missing info)
  if (!result.command && result.question) {
    session.conversationHistory.push({
      role: "assistant",
      content: result.question,
    });
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      `🤖 ${result.question}`,
      quoteToken || undefined,
    );
    return;
  }

  // GPT generated a command — validate it before showing
  if (result.command) {
    const validationError = validateGeneratedCommand(result.command);

    if (validationError) {
      // Feed error back to GPT for auto-correction (1 retry)
      session.conversationHistory.push({
        role: "assistant",
        content: `สร้างคำสั่ง: ${result.command}`,
      });
      session.conversationHistory.push({
        role: "user",
        content: `คำสั่งที่สร้างมาไม่ถูกต้อง: ${validationError} กรุณาแก้ไขให้ถูกต้อง หรือถามข้อมูลที่ขาด`,
      });

      const retry = await parseNaturalLanguageCommand(
        session.conversationHistory,
        userMetadata.username,
        quotedText,
      );

      // Retry succeeded with a valid command
      if (retry?.command) {
        const retryError = validateGeneratedCommand(retry.command);
        if (!retryError) {
          session.pendingCommand = retry.command;
          session.awaitingConfirm = true;
          await replyMessage(
            lineClient,
            userMetadata.replyToken,
            `🤖 ขุนเทียมแปลงให้แล้วนะ:\n\n📝 ${retry.command}\n\nตอบ "ใช่" เพื่อยืนยัน หรือ "ไม่" เพื่อยกเลิก`,
            quoteToken || undefined,
          );
          return;
        }
      }

      // Retry returned a question instead (asking for missing info)
      if (retry?.question) {
        session.conversationHistory.push({
          role: "assistant",
          content: retry.question,
        });
        await replyMessage(
          lineClient,
          userMetadata.replyToken,
          `🤖 ${retry.question}`,
          quoteToken || undefined,
        );
        return;
      }

      // Retry completely failed — ask user manually
      await replyMessage(
        lineClient,
        userMetadata.replyToken,
        `🤖 ขอโทษที ข้อมูลยังไม่ครบ: ${validationError}\nช่วยบอกรายละเอียดเพิ่มหน่อยนะเพื่อน`,
        quoteToken || undefined,
      );
      return;
    }

    // Command is valid!
    session.pendingCommand = result.command;
    session.awaitingConfirm = true;
    session.conversationHistory.push({
      role: "assistant",
      content: `สร้างคำสั่ง: ${result.command}`,
    });
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      `🤖 ขุนเทียมแปลงให้แล้วนะ:\n\n📝 ${result.command}\n\nตอบ "ใช่" เพื่อยืนยัน หรือ "ไม่" เพื่อยกเลิก`,
      quoteToken || undefined,
    );
    return;
  }

  // Fallback — no command, no question
  sessions.delete(userId);
}

// ── Cleanup (runs periodically) ──

setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(userId);
    }
  }
}, 60_000); // check every minute
