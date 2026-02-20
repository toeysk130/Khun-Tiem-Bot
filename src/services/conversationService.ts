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
      // Execute the pending command through the normal dispatcher
      const commandArr = session.pendingCommand.split(" ");
      const command = commandArr[0];
      sessions.delete(userId);
      await commandDispatcher(userMetadata, command, commandArr);
      return;
    }

    if (isCancel) {
      sessions.delete(userId);
      await replyMessage(
        lineClient,
        userMetadata.replyToken,
        "❌ ยกเลิกเรียบร้อย",
      );
      return;
    }

    // Not a clear confirm/cancel — re-ask
    await replyMessage(
      lineClient,
      userMetadata.replyToken,
      `🤖 ตอบ "ใช่" เพื่อยืนยัน หรือ "ไม่" เพื่อยกเลิก\n\n📝 ${session.pendingCommand}`,
    );
    return;
  }

  // ── GPT Parsing ──
  session.conversationHistory.push({ role: "user", content: message });

  const result = await parseNaturalLanguageCommand(
    session.conversationHistory,
    userMetadata.username,
  );

  if (!result) {
    // GPT failed — fall back to regular AI chat
    sessions.delete(userId);
    const { chatWithAI } = await import("./openaiService");
    const reply = await chatWithAI(message);
    await replyMessage(lineClient, userMetadata.replyToken, reply);
    return;
  }

  // No relevant intent detected — regular AI chat
  if (!result.intent) {
    sessions.delete(userId);
    const { chatWithAI } = await import("./openaiService");
    const reply = await chatWithAI(message);
    await replyMessage(lineClient, userMetadata.replyToken, reply);
    return;
  }

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
    );
    return;
  }

  // GPT generated a complete command — ask for confirmation
  if (result.command) {
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
