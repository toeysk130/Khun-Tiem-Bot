import { Client, FlexMessage, Message } from "@line/bot-sdk";

// ── Reply Buffer ──
// Collects handler replies so the dispatcher can bundle them
// with AI commentary in a single replyMessage call (free Reply API).
const replyBuffers = new Map<string, Message[]>();

export function startReplyBuffer(replyToken: string) {
  replyBuffers.set(replyToken, []);
}

export async function flushReplyBuffer(
  client: Client,
  replyToken: string,
  extraMessages: Message[] = [],
): Promise<void> {
  const buffered = replyBuffers.get(replyToken) || [];
  replyBuffers.delete(replyToken);
  const all = [...buffered, ...extraMessages].slice(0, 5); // LINE limit
  if (all.length > 0) {
    const res = await client.replyMessage(replyToken, all);
    // Log outbound messages
    if (res && (res as any).sentMessages) {
      await logSentMessages(all, (res as any).sentMessages);
    }
  }
}

export async function replyMessage(
  client: Client,
  replyToken: string,
  msg: string,
  quoteToken?: string,
) {
  const message: Message & { quoteToken?: string } = {
    type: "text",
    text: msg,
  };
  if (quoteToken) {
    message.quoteToken = quoteToken;
  }
  if (replyBuffers.has(replyToken)) {
    replyBuffers.get(replyToken)!.push(message);
    return;
  }
  const res = await client.replyMessage(replyToken, message);
  if (res && (res as any).sentMessages) {
    await logSentMessages([message], (res as any).sentMessages);
  }
}

export async function replyFlexMessage(
  client: Client,
  replyToken: string,
  flexMessage: FlexMessage,
) {
  if (replyBuffers.has(replyToken)) {
    replyBuffers.get(replyToken)!.push(flexMessage);
    return;
  }
  const res = await client.replyMessage(replyToken, flexMessage);
  if (res && (res as any).sentMessages) {
    await logSentMessages([flexMessage], (res as any).sentMessages);
  }
}

export async function replyMessages(
  client: Client,
  replyToken: string,
  messages: Message[],
) {
  if (replyBuffers.has(replyToken)) {
    replyBuffers.get(replyToken)!.push(...messages);
    return;
  }
  const res = await client.replyMessage(replyToken, messages);
  if (res && (res as any).sentMessages) {
    await logSentMessages(messages, (res as any).sentMessages);
  }
}

// ── Outbound Logging Helper ──
async function logSentMessages(
  originalMessages: Message[],
  sentMessagesInfo: any[],
) {
  try {
    const { saveChatMessage } =
      await import("../repositories/chatMessageRepository");
    for (
      let i = 0;
      i < Math.min(originalMessages.length, sentMessagesInfo.length);
      i++
    ) {
      const msg = originalMessages[i];
      const info = sentMessagesInfo[i];

      let textContent = null;
      if (msg.type === "text") {
        textContent = msg.text;
      } else if (msg.type === "flex") {
        textContent = "[Flex Message: " + msg.altText + "]";
      } else {
        textContent = "[" + msg.type.toUpperCase() + " Message]";
      }

      await saveChatMessage({
        lineUserId: "system_bot", // LINE reply API doesn't know userId upfront in the wrapper natively without passing MORE args. Using 'system_bot' is fine for quotes, or we can improve it.
        messageId: info.id,
        quoteToken: info.quoteToken || null,
        textContent: textContent,
        senderRole: "bot",
      });
    }
  } catch (err) {
    console.error("Failed to log sent messages", err);
  }
}

// ── Quick Reply Helpers ──

export interface QuickReplyLabel {
  label: string; // display text (max 20 chars)
  text?: string; // text to send (defaults to label)
}

export function makeQuickReplyItems(items: QuickReplyLabel[]): {
  type: "action";
  action: { type: "message"; label: string; text: string };
}[] {
  return items.map((item) => ({
    type: "action" as const,
    action: {
      type: "message" as const,
      label: item.label.slice(0, 20),
      text: item.text ?? item.label,
    },
  }));
}

/**
 * Attach quick reply buttons to the last message in the reply buffer.
 * Call this BEFORE flushReplyBuffer.
 */
export function attachQuickReply(replyToken: string, items: QuickReplyLabel[]) {
  const buffer = replyBuffers.get(replyToken);
  if (!buffer || buffer.length === 0) return;

  const lastMsg = buffer[buffer.length - 1];
  (lastMsg as any).quickReply = {
    items: makeQuickReplyItems(items),
  };
}

// Alias for backward compatibility
export const pushMsg = replyMessage;
