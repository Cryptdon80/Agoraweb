"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getChatHistory,
  ChatHistoryItem,
} from "../../lib/chat-history";

export default function HistoryChatPage() {
  const params = useParams();
  const id = String(params.id);

  const [chat, setChat] = useState<ChatHistoryItem | null>(null);

  useEffect(() => {
    const history = getChatHistory();
    const found = history.find((item) => item.id === id);
    setChat(found || null);
  }, [id]);

  if (!chat) {
    return (
      <main className="history-page">
        <div className="history-card">
          <h1>Chat not found</h1>
          <p>
            This conversation could not be found in your saved history.
          </p>

          <Link href="/history" className="button">
            ← Back to History
          </Link>
        </div>

        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
          }

          .history-page {
            min-height: 100dvh;
            padding: 30px 20px;
            background: var(--background);
            color: var(--text);
          }

          .history-card {
            width: min(850px, 100%);
            margin: 80px auto;
            padding: 28px;
            border: 1px solid var(--border);
            border-radius: 22px;
            background: var(--surface);
          }

          h1 {
            margin: 0 0 10px;
          }

          p {
            color: var(--muted);
            line-height: 1.5;
          }

          .button {
            display: inline-block;
            margin-top: 18px;
            padding: 12px 18px;
            border-radius: 13px;
            background: var(--yellow);
            color: #050505;
            font-weight: 800;
            text-decoration: none;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="history-page">
      <header className="history-header">
        <Link href="/history" className="back-button">
          ← History
        </Link>

        <h1>{chat.title}</h1>

        <p>
          {chat.messages.length} messages
        </p>
      </header>

      <section className="messages">
        {chat.messages.map((message, index) => (
          <div
            key={`${chat.id}-${index}`}
            className={
              message.role === "user"
                ? "message user-message"
                : "message assistant-message"
            }
          >
            <div className="bubble">
              {message.text}
            </div>
          </div>
        ))}
      </section>

      <div className="bottom-action">
        <Link href="/chat" className="continue-button">
          Continue in Chat
        </Link>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
        }

        .history-page {
          min-height: 100dvh;
          padding: 30px 20px 120px;
          background: var(--background);
          color: var(--text);
        }

        .history-header {
          width: min(850px, 100%);
          margin: 0 auto 30px;
        }

        .back-button {
          display: inline-block;
          margin-bottom: 24px;
          padding: 10px 15px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: 26px;
        }

        .history-header p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .messages {
          width: min(850px, 100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          display: flex;
          width: 100%;
        }

        .assistant-message {
          justify-content: flex-start;
        }

        .user-message {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 78%;
          padding: 14px 17px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .assistant-message .bubble {
          background: var(--surface);
          border: 1px solid var(--border);
          border-bottom-left-radius: 6px;
        }

        .user-message .bubble {
          background: var(--yellow);
          color: #050505;
          border-bottom-right-radius: 6px;
          font-weight: 600;
        }

        .bottom-action {
          position: fixed;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: min(850px, calc(100% - 32px));
        }

        .continue-button {
          display: block;
          width: 100%;
          padding: 15px;
          border-radius: 15px;
          background: var(--yellow);
          color: #050505;
          text-align: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        @media (max-width: 600px) {
          .history-page {
            padding: 20px 14px 110px;
          }

          h1 {
            font-size: 22px;
          }

          .bubble {
            max-width: 90%;
          }
        }
      `}</style>
    </main>
  );
}
