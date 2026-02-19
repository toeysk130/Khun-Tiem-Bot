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

// Alias for backward compatibility
export const pushMsg = replyMessage;
