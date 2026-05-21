import React, { useState, useRef, useEffect } from 'react';
import { VikiAvatarRenderer } from './VikiAvatarRenderer';
import './VikiDedicatedChat.css';

interface Message {
  role: 'user' | 'viki';
  content: string;
  modelUsed?: 'viki' | 'codellama';
}

export const VikiDedicatedChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'viki', 
      content: 'CORTEX sovereign systems activated. Cognitive bridge established. I am VIKI, your cybernetic command intelligence. Transmit query, technician.',
      modelUsed: 'viki'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vikiState, setVikiState] = useState<'idle' | 'thinking' | 'speaking' | 'alert'>('idle');
  
  // Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // References
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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

  const currentTypingModel = detectCodingNeed(input) ? 'codellama' : 'viki';

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

  const sendMessage = async (textToSend?: string) => {
    const rawMessage = textToSend || input;
    if (!rawMessage.trim() || isLoading) return;

    const userQuery = rawMessage.trim();
    setInput('');
    
    // Detect which model to send to
    const modelToUse = detectCodingNeed(userQuery) ? 'codellama' : 'viki';

    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);
    setVikiState('thinking');

    try {
      const chatHistory = messages.map(m => ({
        role: m.role === 'viki' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch('/api/viki/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages: [...chatHistory, { role: 'user', content: userQuery }],
          stream: false
        }),
      });

      if (!response.ok) throw new Error('Neural link failure');

      const data = await response.json();
      const reply = data.message.content;

      setMessages(prev => [...prev, { 
        role: 'viki', 
        content: reply,
        modelUsed: modelToUse
      }]);
      
      // Trigger voice read-back
      speakResponse(reply);
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'viki', 
        content: 'Emergency Alert: Connection to neural cortex has been severed.',
        modelUsed: 'viki'
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

  const handleBack = () => {
    // Mute/Cancel voice when exiting
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Return to main dashboard
    window.location.search = '';
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
          {/* Active Model Indicator Strip */}
          <div className="model-indicator-bar">
            <span className="node-label font-space">NEURAL COGNITIVE BRIDGES:</span>
            <div className="node-badges">
              <div className={`node-badge viki ${currentTypingModel === 'viki' ? 'active' : ''}`}>
                <span className="badge-glow"></span>
                VIKI COGNITRON (viki)
              </div>
              <div className={`node-badge codellama ${currentTypingModel === 'codellama' ? 'active' : ''}`}>
                <span className="badge-glow"></span>
                CODER SPECIALIST (codellama)
              </div>
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
                        {msg.modelUsed === 'codellama' ? 'codellama' : 'viki'}
                      </span>
                    )}
                  </div>
                  
                  <div className="bubble-content font-space">
                    {msg.content}
                  </div>

                  {msg.role === 'viki' && (
                    <button 
                      className="copy-bubble-btn"
                      onClick={() => handleCopy(msg.content, i)}
                      title="Copy Output"
                    >
                      {copiedIndex === i ? '✓ COPIED' : '⧉ COPY OUTPUT'}
                    </button>
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
                    <span className="font-space">SYNTHESIZING COGNITIVE RESPONSE...</span>
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
                  // Cancel if active
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
