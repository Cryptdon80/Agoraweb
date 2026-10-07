"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteChatHistory,
  getChatHistory,
  ChatHistoryItem,
} from "../lib/chat-history";
import { useChat } from "../lib/chat-context";

export default function HistoryPage() {
  const router = useRouter();
  const { setMessages } = useChat();

  const [history, setHistory] = useState<ChatHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getChatHistory());
  }, []);

  function openChat(chat: ChatHistoryItem) {
    setMessages(chat.messages);
    router.push("/chat");
  }

  function removeChat(
    event: React.MouseEvent,
    id: string
  ) {
    event.stopPropagation();

    deleteChatHistory(id);

    setHistory((current) =>
      current.filter((chat) => chat.id !== id)
    );
  }

  return (
    <main className="history-page">
      <header className="history-header">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/chat")}
        >
          ← Chat
        </button>

        <h1>Chat History</h1>

        <p>
          Your previous Agora conversations.
        </p>
      </header>

      <section className="history-list">
        {history.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">
              A
            </div>

            <h2>No saved conversations yet</h2>

            <p>
              Your conversations will appear here
              when you leave a chat.
            </p>

            <button
              type="button"
              className="start-button"
              onClick={() => router.push("/chat")}
            >
              Start Chat
            </button>
          </div>
        ) : (
          history.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className="history-card"
              onClick={() => openChat(chat)}
            >
              <div className="history-content">
                <div className="history-icon">
                  A
                </div>

                <div className="history-info">
                  <strong>
                    {chat.title}
                  </strong>

                  <span>
                    {chat.messages.length} messages
                  </span>
                </div>
              </div>

              <span
                className="delete-button"
                role="button"
                tabIndex={0}
                aria-label="Delete conversation"
                onClick={(event) =>
                  removeChat(
                    event,
                    chat.id
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();

                    const mouseLikeEvent =
                      event as unknown as React.MouseEvent;

                    removeChat(
                      mouseLikeEvent,
                      chat.id
                    );
                  }
                }}
              >
                ×
              </span>
            </button>
          ))
        )}
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        body {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .history-page {
          min-height: 100dvh;
          padding: 30px 20px;
          background: var(--background);
          color: var(--text);
        }

        .history-header,
        .history-list {
          width: min(850px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .history-header {
          margin-bottom: 35px;
        }

        .back-button {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 10px 15px;
          margin-bottom: 28px;
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .back-button:hover {
          background: var(--surface-2);
        }

        .history-header h1 {
          margin: 0;
          font-size: 28px;
        }

        .history-header p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .history-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--surface);
          color: var(--text);
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .history-card:hover {
          transform: translateY(-2px);
          background: var(--surface-2);
        }

        .history-content {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .history-icon,
        .empty-icon {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: var(--yellow);
          color: #050505;
          font-weight: 900;
        }

        .history-info {
          min-width: 0;
        }

        .history-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .history-info span {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 11px;
        }

        .delete-button {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: var(--muted);
          font-size: 22px;
          cursor: pointer;
        }

        .delete-button:hover {
          background: var(--surface);
          color: var(--text);
        }

        .empty-history {
          padding: 70px 20px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: var(--surface);
          text-align: center;
        }

        .empty-icon {
          width: 50px;
          height: 50px;
          margin: 0 auto 18px;
        }

        .empty-history h2 {
          margin: 0;
          font-size: 18px;
        }

        .empty-history p {
          max-width: 400px;
          margin: 8px auto 22px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .start-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 18px;
          background: var(--yellow);
          color: #050505;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .history-page {
            padding: 20px 14px;
          }

          .history-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </main>
  );
}
