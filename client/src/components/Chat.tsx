import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@dos/shared';
import { useStore } from '../store.js';

export function Chat({ messages, meId }: { messages: ChatMessage[]; meId: string }) {
  const sendChat = useStore((s) => s.sendChat);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat-title">Diskussion</div>
      <div className="chat-log">
        {messages.length === 0 && <p className="muted small">Inga meddelanden än.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-msg ${m.system ? 'chat-system' : ''} ${
              m.playerId === meId ? 'chat-mine' : ''
            }`}
          >
            {!m.system && <span className="chat-name">{m.name}:</span>}{' '}
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          value={text}
          maxLength={500}
          placeholder="Skriv ett meddelande…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="btn btn-small" onClick={send}>
          Skicka
        </button>
      </div>
    </div>
  );
}
