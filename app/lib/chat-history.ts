export type ChatHistoryMessage = {
  role: "user" | "assistant";
  text: string;
  image?: string;
};

export type ChatHistoryItem = {
  id: string;
  title: string;
  messages: ChatHistoryMessage[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "agora-chat-history";

export function getChatHistory(): ChatHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeTitle(
  messages: ChatHistoryMessage[]
) {
  const firstUserMessage =
    messages.find(
      (message) => message.role === "user"
    )?.text || "New Agora Chat";

  return firstUserMessage.length > 45
    ? firstUserMessage.slice(0, 45) + "..."
    : firstUserMessage;
}

export function saveChatHistory(
  id: string,
  messages: ChatHistoryMessage[],
  createdAt?: number
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!messages.length) {
    return;
  }

  try {
    const existing = getChatHistory();

    const oldChat = existing.find(
      (item) => item.id === id
    );

    const item: ChatHistoryItem = {
      id,
      title: makeTitle(messages),
      messages,
      createdAt:
        oldChat?.createdAt ??
        createdAt ??
        Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [
      item,
      ...existing.filter(
        (chat) => chat.id !== id
      ),
    ];

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Failed to save Agora chat history:",
      error
    );
  }
}

export function deleteChatHistory(
  id: string
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = getChatHistory();

    const updated = existing.filter(
      (chat) => chat.id !== id
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Failed to delete Agora chat history:",
      error
    );
  }
}