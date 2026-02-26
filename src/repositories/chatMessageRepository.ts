import { pool } from "../configs/database";

export interface ChatMessage {
  id?: number;
  lineUserId: string;
  messageId: string;
  quoteToken: string | null;
  textContent: string | null;
  senderRole: "user" | "bot";
  createdAt?: Date;
}

export async function createChatMessageTableIfNotExists() {
  const query = `
    CREATE TABLE IF NOT EXISTS line_chat_messages (
      id BIGSERIAL PRIMARY KEY,
      line_user_id VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) NOT NULL UNIQUE,
      quote_token VARCHAR(255),
      text_content TEXT,
      sender_role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log("Table 'line_chat_messages' created or already exists.");
  } catch (error) {
    console.error("Error creating 'line_chat_messages' table:", error);
  }
}

export async function saveChatMessage(message: ChatMessage): Promise<void> {
  const query = `
    INSERT INTO line_chat_messages (line_user_id, message_id, quote_token, text_content, sender_role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (message_id) DO NOTHING;
  `;
  const values = [
    message.lineUserId,
    message.messageId,
    message.quoteToken,
    message.textContent,
    message.senderRole,
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error("Error saving chat message:", error);
  }
}

export async function getChatMessageById(messageId: string): Promise<ChatMessage | null> {
  const query = `
    SELECT
      id,
      line_user_id AS "lineUserId",
      message_id AS "messageId",
      quote_token AS "quoteToken",
      text_content AS "textContent",
      sender_role AS "senderRole",
      created_at AS "createdAt"
    FROM line_chat_messages
    WHERE message_id = $1
  `;
  
  try {
    const result = await pool.query(query, [messageId]);
    if (result.rows.length > 0) {
      return result.rows[0] as ChatMessage;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving chat message by ID:", error);
    return null;
  }
}
