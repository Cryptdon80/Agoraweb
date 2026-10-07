"use client";

import {
  createContext,
  useContext,
  useState,
} from "react";
import {
  saveChatHistory,
} from "./chat-history";

export type Message = {
  role: "user" | "assistant";
  text: string;
  image?: string;
};

type ChatContextType = {
  messages: Message[];
  setMessages: React.Dispatch<
    React.SetStateAction<Message[]>
  >;
  saveCurrentChat: () => void;
};

const ChatContext =
  createContext<ChatContextType | null>(null);

function createChatId() {
  return (
    Date.now().toString() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 9)
  );
}

export function ChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",
        text:
          "Welcome to Agora. What would you like to build today?",
      },
    ]);

  const [chatId] = useState(createChatId);

  function saveCurrentChat() {
    const messagesToSave = messages.filter(
      (message) =>
        !(
          message.role === "assistant" &&
          message.text ===
            "Welcome to Agora. What would you like to build today?"
        )
    );

    if (!messagesToSave.length) {
      return;
    }

    saveChatHistory(
      chatId,
      messagesToSave
    );
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        saveCurrentChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
}