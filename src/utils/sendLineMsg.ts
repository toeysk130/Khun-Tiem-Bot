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
    await client.replyMessage(replyToken, all);
  }
}

export async function replyMessage(
  client: Client,
  replyToken: string,
  msg: string,
) {
  const message: Message = { type: "text", text: msg };
  if (replyBuffers.has(replyToken)) {
    replyBuffers.get(replyToken)!.push(message);
    return;
  }
  await client.replyMessage(replyToken, message);
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
  await client.replyMessage(replyToken, flexMessage);
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
  await client.replyMessage(replyToken, messages);
}

// ── Quick Reply Helpers ──

export interface QuickReplyLabel {
  label: string; // display text (max 20 chars)
  text?: string; // text to send (defaults to label)
}

export function makeQuickReplyItems(
  items: QuickReplyLabel[],
): {
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
