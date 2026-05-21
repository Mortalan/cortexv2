import React, { useState, useRef, useEffect } from 'react';
import { VikiAvatarRenderer } from './VikiAvatarRenderer';
import './VikiDedicatedChat.css';

interface Message {
  role: 'user' | 'viki';
  content: string;
  modelUsed?: 'viki' | 'codellama' | 'gpt-4o';
}

export const VikiDedicatedChat: React.FC = () => {
  // Initialize state from localStorage for persistent chat logs
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('viki_chat_history');
      return saved ? JSON.parse(saved) : [
        { 
          role: 'viki', 
          content: 'CORTEX sovereign systems activated. Cognitive bridge established. I am VIKI, your cybernetic command intelligence. Transmit query, technician.',
          modelUsed: 'viki'
        }
      ];
    } catch {
      return [
        { 
          role: 'viki', 
          content: 'CORTEX sovereign systems activated. Cognitive bridge established. I am VIKI, your cybernetic command intelligence. Transmit query, technician.',
          modelUsed: 'viki'
        }
      ];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vikiState, setVikiState] = useState<'idle' | 'thinking' | 'speaking' | 'alert'>('idle');
  
  // Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Hybrid Core and Model Override States
  const [modelMode, setModelMode] = useState<'auto' | 'viki' | 'codellama' | 'gpt-4o'>(() => {
    return (localStorage.getItem('viki_model_mode') as any) || 'auto';
  });
  const [openaiKey, setOpenaiKey] = useState(() => {
    return localStorage.getItem('viki_openai_key') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // References
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Save chat history and settings to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('viki_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('viki_model_mode', modelMode);
  }, [modelMode]);

  useEffect(() => {
    localStorage.setItem('viki_openai_key', openaiKey);
  }, [openaiKey]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Voice Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVikiState('thinking');
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text.trim()) {
          setInput(text);
          sendMessage(text);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        setVikiState(prev => prev === 'thinking' ? 'idle' : prev);
      };

      rec.onerror = (err: any) => {
        console.error('STT Voice Error:', err);
        setIsListening(false);
        setVikiState('idle');
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Heuristic coding keyword classifier
  const detectCodingNeed = (text: string): boolean => {
    const codeKeywords = [
      'code', 'program', 'script', 'function', 'class', 'import', 'docker', 
      'compile', 'refactor', 'bug', 'error', 'database', 'sql', 'html', 
      'css', 'javascript', 'typescript', 'python', 'bash', 'ssh', 'api',
      'write a', 'develop', 'regex', 'json', 'yaml', 'query', 'react', 'vue',
      'angular', 'npm', 'pip', 'git', 'github', 'deploy', 'kubernetes', 'k8s'
    ];
    const lowerText = text.toLowerCase();
    return codeKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Determine active model to showcase in Badge or route to
  const getActiveModel = (textInput: string): 'viki' | 'codellama' | 'gpt-4o' => {
    if (modelMode !== 'auto') {
      return modelMode === 'gpt-4o' ? 'gpt-4o' : (modelMode as 'viki' | 'codellama');
    }
    return detectCodingNeed(textInput) ? 'codellama' : 'viki';
  };


  // Speech Synthesis
  const speakResponse = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    // Stop any ongoing voice playback
    window.speechSynthesis.cancel();

    // Clean markdown characters for spoken response
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block generated.') // announce code generation
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#\-]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Dynamic voice selection (Premium female english)
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('google us english') ||
          v.name.toLowerCase().includes('hazel'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
      setVikiState('speaking');
    };

    utterance.onend = () => {
      setVikiState('idle');
    };

    utterance.onerror = () => {
      setVikiState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const updateLastMessage = (content: string) => {
    setMessages(prev => {
      const next = [...prev];
      if (next.length > 0) {
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: content
        };
      }
      return next;
    });
  };

  const sendMessage = async (textToSend?: string, forceChatGPT: boolean = false) => {
    const rawMessage = textToSend !== undefined ? textToSend : input;
    if (textToSend === undefined && !rawMessage.trim()) return;
    if (isLoading) return;

    const userQuery = rawMessage.trim();
    if (textToSend !== undefined || rawMessage.trim()) {
      setInput('');
    }
    
    // Choose model
    const modelToUse = forceChatGPT ? 'gpt-4o' : getActiveModel(userQuery);

    if (modelToUse === 'gpt-4o' && !openaiKey.trim()) {
      alert('OpenAI Key is missing. Please configure it in settings to enable the ChatGPT Hybrid Core.');
      setShowSettings(true);
      return;
    }

    // Only append user message if it is not a retry
    if (textToSend !== undefined || rawMessage.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    }
    
    setIsLoading(true);
    setVikiState('thinking');

    try {
      // Gather clean chat history
      const chatHistory = messages.map(m => ({
        role: m.role === 'viki' ? 'assistant' : 'user',
        content: m.content
      }));

      let response;
      if (modelToUse === 'gpt-4o') {
        // Stream directly from OpenAI API
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: chatHistory.map(h => ({
              role: h.role === 'assistant' ? 'assistant' : 'user',
              content: h.content
            })).concat({ role: 'user', content: userQuery }),
            stream: true
          })
        });
      } else {
        // Stream from Local Ollama Core
        response = await fetch('/api/viki/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelToUse,
            messages: [...chatHistory, { role: 'user', content: userQuery }],
            stream: true,
            keep_alive: -1
          }),
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Neural link failure');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader interface available');

      // Append placeholder Viki bubble
      setMessages(prev => [...prev, { 
        role: 'viki', 
        content: '',
        modelUsed: modelToUse
      }]);

      let fullContent = '';
      let buffer = '';
      let hasStartedStreaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (modelToUse === 'gpt-4o') {
            if (cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const jsonStr = cleanLine.substring(6);
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  if (!hasStartedStreaming) {
                    hasStartedStreaming = true;
                    setVikiState('idle');
                  }
                  fullContent += delta;
                  updateLastMessage(fullContent);
                }
              } catch (e) {
                // Buffer line segment
              }
            }
          } else {
            try {
              const parsed = JSON.parse(cleanLine);
              const delta = parsed.message?.content || '';
              if (delta) {
                if (!hasStartedStreaming) {
                  hasStartedStreaming = true;
                  setVikiState('idle');
                }
                fullContent += delta;
                updateLastMessage(fullContent);
              }
            } catch (e) {
              // Buffer segment
            }
          }
        }
      }

      speakResponse(fullContent);
      
    } catch (error: any) {
      console.error('API Error:', error);
      setMessages(prev => [...prev, { 
        role: 'viki', 
        content: `Emergency Alert: Neural link failure. ${error.message || 'Connection severed.'}`,
        modelUsed: modelToUse
      }]);
      setVikiState('alert');
      setTimeout(() => setVikiState('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to purge all neural logs? This action is irreversible.")) {
      const initial: Message[] = [
        { 
          role: 'viki', 
          content: 'CORTEX neural logs purged. Systems restarted. Ready for fresh operations, technician.',
          modelUsed: 'viki'
        }
      ];
      setMessages(initial);
      localStorage.setItem('viki_chat_history', JSON.stringify(initial));
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setVikiState('idle');
    }
  };

  const handleBack = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    window.location.search = '';
  };

  // Find last user query to support retry feature
  const getLastUserQuery = (index: number): string | null => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return null;
  };

  const handleOffloadRetry = (index: number) => {
    const query = getLastUserQuery(index);
    if (!query) return;

    if (!openaiKey.trim()) {
      alert('OpenAI Key is missing. Please configure it in settings to retry with ChatGPT.');
      setShowSettings(true);
      return;
    }

    // Remove Viki's failed/unsatisfactory response
    setMessages(prev => prev.filter((_, i) => i !== index));
    
    // Trigger ChatGPT query
    sendMessage(query, true);
  };

  return (
    <div className="viki-dedicated-workspace">
      {/* Immersive glowing cyber background grid */}
      <div className="cyber-grid-overlay"></div>
      
      {/* Futuristic status header */}
      <header className="workspace-header glassmorphic">
        <button className="back-btn" onClick={handleBack}>
          <span className="btn-arrow">«</span> RETURN TO COMMAND CONSOLE
        </button>
        
        <div className="header-actions">
          <button 
            className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Configure Hybrid Core Settings"
          >
            ⚙ HYBRID SYSTEM SETTINGS
          </button>
          
          <button 
            className="clear-logs-btn"
            onClick={handleClearHistory}
            title="Purge all local neural logs"
          >
            ☣ PURGE NEURAL LOGS
          </button>
        </div>

        <div className="header-info">
          <div className="status-label">
            <span className="blinking-dot"></span>
            VIKI LINK: ACTIVE
          </div>
          <div className="telemetry-meta">LATENCY: ~14ms | COGNITIVE CORE: STABLE</div>
        </div>
      </header>

      {/* Main interactive cockpit */}
      <div className="workspace-body">
        {/* Left Side: Full scale 3D Hologram frame */}
        <div className="hologram-viewport glassmorphic">
          <div className="viewport-overlay-hud">
            <div className="hud-corner-tl">
              <span className="hud-tag">NAME // VIKI-CORE</span>
              <span className="hud-tag">VER  // V3.0</span>
            </div>
            <div className="hud-corner-tr">
              <span className="hud-tag">STATE // {vikiState.toUpperCase()}</span>
              <span className="hud-tag">SPECS // RENDER_3D</span>
            </div>
          </div>
          <div className="hologram-avatar-wrapper">
            <VikiAvatarRenderer 
              assetPath="/assets/viki_android_real.glb" 
              vikiState={vikiState} 
            />
          </div>
          <div className="viewport-footer-hud">
            <div className="scannline-effect"></div>
            <div className="hud-bar-glow"></div>
            <span>[ SYSTEM LINK // DIRECT QUANTUM NEURAL NODE ]</span>
          </div>
        </div>

        {/* Right Side: Interactive Dialogue box */}
        <div className="chat-console-viewport glassmorphic">
          
          {/* Slide-down Settings Panel */}
          {showSettings && (
            <div className="hybrid-settings-panel glassmorphic">
              <h3 className="font-space">⚙ HYBRID COGNITIVE CORE CONFIGURATION</h3>
              <p className="settings-desc font-space">
                Configure cloud-based cognitive nodes to offload complex analytical, scripting, or logical tasks when local models require expansion.
              </p>
              
              <div className="settings-form font-space">
                <div className="settings-group">
                  <label htmlFor="openai-key">OPENAI API KEY (GPT-4o):</label>
                  <div className="key-input-wrapper">
                    <input
                      id="openai-key"
                      type={showKey ? 'text' : 'password'}
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-proj-..."
                    />
                    <button 
                      type="button" 
                      className="key-visible-btn"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                <div className="settings-info-badge">
                  <span className="badge-bullet"></span>
                  API Key is stored locally and securely in your browser's LocalStorage.
                </div>
              </div>
            </div>
          )}

          {/* Active Model Selector Strip */}
          <div className="model-indicator-bar">
            <span className="node-label font-space">NEURAL ROUTING CONTROL:</span>
            <div className="node-badges">
              <button 
                className={`node-badge pill auto ${modelMode === 'auto' ? 'active' : ''}`}
                onClick={() => setModelMode('auto')}
                title="Automatically route queries based on keyword heuristic analysis"
              >
                <span className="badge-glow"></span>
                [🤖 AUTO COGNITION]
              </button>
              
              <button 
                className={`node-badge pill viki ${modelMode === 'viki' ? 'active' : ''}`}
                onClick={() => setModelMode('viki')}
                title="Force routing to local Viki customized cognitive base"
              >
                <span className="badge-glow"></span>
                VIKI (LOCAL)
              </button>
              
              <button 
                className={`node-badge pill codellama ${modelMode === 'codellama' ? 'active' : ''}`}
                onClick={() => setModelMode('codellama')}
                title="Force routing to local CodeLlama model"
              >
                <span className="badge-glow"></span>
                CODER SPECIALIST (LOCAL)
              </button>
              
              <button 
                className={`node-badge pill gpt4o ${modelMode === 'gpt-4o' ? 'active' : ''}`}
                onClick={() => setModelMode('gpt-4o')}
                title="Force routing to OpenAI GPT-4o Hybrid Core"
              >
                <span className="badge-glow"></span>
                GPT-4o (HYBRID)
              </button>
            </div>
          </div>

          {/* Conversations Area */}
          <div className="chat-console-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`console-row ${msg.role}`}>
                <div className="row-avatar">
                  {msg.role === 'viki' ? '🤖' : '👨‍💻'}
                </div>
                <div className={`console-bubble ${msg.role}`}>
                  <div className="bubble-meta">
                    <span className="sender-name">
                      {msg.role === 'viki' ? 'VIKI' : 'TECHNICIAN'}
                    </span>
                    {msg.role === 'viki' && msg.modelUsed && (
                      <span className={`model-tag ${msg.modelUsed}`}>
                        {msg.modelUsed === 'codellama' ? 'codellama' : msg.modelUsed === 'gpt-4o' ? 'gpt-4o' : 'viki'}
                      </span>
                    )}
                  </div>
                  
                  <div className="bubble-content font-space">
                    {msg.content}
                  </div>

                  {msg.role === 'viki' && (
                    <div className="bubble-actions">
                      <button 
                        className="copy-bubble-btn"
                        onClick={() => handleCopy(msg.content, i)}
                        title="Copy Output"
                      >
                        {copiedIndex === i ? '✓ COPIED' : '⧉ COPY OUTPUT'}
                      </button>
                      
                      {/* Show Offload Retry button for Viki replies if OpenAI Key is configured and it was local */}
                      {msg.modelUsed !== 'gpt-4o' && openaiKey.trim() && (
                        <button 
                          className="offload-retry-btn"
                          onClick={() => handleOffloadRetry(i)}
                          title="Offload this complex prompt to ChatGPT GPT-4o core"
                        >
                          ⚡ OFFLOAD TO GPT-4o
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="console-row viki thinking">
                <div className="row-avatar">🤖</div>
                <div className="console-bubble viki thinking">
                  <div className="bubble-meta">
                    <span className="sender-name">VIKI</span>
                    <span className="model-tag pulse">COMPUTING...</span>
                  </div>
                  <div className="neural-thinking-loader">
                    <div className="pulse-circle"></div>
                    <span className="font-space">
                      {modelMode === 'gpt-4o' || (modelMode === 'auto' && detectCodingNeed(input))
                        ? 'SYNTHESIZING ADVANCED COGNITIVE STRUCTURE...'
                        : 'SYNTHESIZING LOCAL COGNITIVE RESPONSE...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Cockpit Input Controls */}
          <div className="chat-console-controls">
            {/* STT Microphone Input button */}
            <button 
              className={`mic-trigger-btn ${isListening ? 'listening' : ''}`}
              onClick={handleMicClick}
              title={isListening ? 'Listening... click to stop' : 'Activate Voice Interface (STT)'}
            >
              <div className="mic-icon-wrapper">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              {isListening && (
                <div className="mic-pulse-rings">
                  <span className="ring"></span>
                  <span className="ring"></span>
                </div>
              )}
            </button>

            {/* Mute/Unmute Audio button */}
            <button 
              className={`mute-trigger-btn ${isMuted ? 'muted' : ''}`}
              onClick={() => {
                if (!isMuted) {
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    setVikiState('idle');
                  }
                }
                setIsMuted(!isMuted);
              }}
              title={isMuted ? 'Unmute Viki Voice Output' : 'Mute Viki Voice Output'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                {isMuted ? (
                  <path d="M3.63 3.63L2.22 5.05 7 9.83v2.18c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-2.18l4.07 4.07 1.41-1.41L3.63 3.63zM12 4.71L9.7 7.01 12 9.31V4.71zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z"/>
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                )}
              </svg>
            </button>

            {/* Main keyboard typing console */}
            <div className="console-input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={isListening ? 'Speak now... capturing audio' : 'Type or transmit operational script command...'}
                disabled={isLoading}
              />
              <button 
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="console-send-btn font-space"
              >
                TRANSMIT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
