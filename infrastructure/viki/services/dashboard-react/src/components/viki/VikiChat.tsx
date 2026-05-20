import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'viki';
  content: string;
}

interface VikiChatProps {
  onStateChange?: (state: 'idle' | 'thinking' | 'speaking') => void;
}

export const VikiChat: React.FC<VikiChatProps> = ({ onStateChange }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'viki', content: 'CORTEX systems online. I am VIKI. How can I assist with your operations today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    onStateChange?.('thinking');

    try {
      // Use the secure Traefik proxy with the chat endpoint for memory
      const chatHistory = messages.map(m => ({
        role: m.role === 'viki' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch('/api/viki/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'viki',
          messages: [...chatHistory, { role: 'user', content: userMessage }],
          stream: false
        }),
      });

      if (!response.ok) throw new Error('Neural link failure');

      const data = await response.json();
      onStateChange?.('speaking');
      setMessages(prev => [...prev, { role: 'viki', content: data.message.content }]);
      
      // Return to idle after a delay (simulating speaking time)
      setTimeout(() => onStateChange?.('idle'), 3000);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'viki', content: 'Error: Connection to cognitive core severed.' }]);
      onStateChange?.('idle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="viki-chat-container">
      <div className="viki-chat-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="bubble-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble viki thinking">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
      </div>
      <div className="viki-chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Transmit command..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'SEND'}
        </button>
      </div>
    </div>
  );
};
