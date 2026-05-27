import React, { useState, useRef, useEffect } from 'react';
import { VikiAvatarRenderer } from './VikiAvatarRenderer';
import './VikiDedicatedChat.css';

interface Message {
  role: 'user' | 'viki';
  content: string;
  modelUsed?: 'viki' | 'codellama' | 'gpt-4o';
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

export const VikiDedicatedChat: React.FC = () => {
  // Multiple sessions and persistent archive
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const savedSessions = localStorage.getItem('viki_chat_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Robust sanitization: verify all sessions are valid objects with active messages arrays
          const valid = parsed.filter(s => s && typeof s === 'object' && s.id && Array.isArray(s.messages));
          if (valid.length > 0) return valid;
        }
      }
      
      // Migration from old single history if it exists
      const savedHistory = localStorage.getItem('viki_chat_history');
      if (savedHistory) {
        const historyMsgs = JSON.parse(savedHistory);
        if (Array.isArray(historyMsgs) && historyMsgs.length > 0) {
          return [{
            id: 'session-migrated',
            title: 'Restored Operational Log',
            timestamp: Date.now(),
            messages: historyMsgs
          }];
        }
      }
    } catch (e) {
      console.error("Failed to parse sessions from localStorage:", e);
    }

    return [{
      id: 'session-default',
      title: 'Neural Session: Alpha',
      timestamp: Date.now(),
      messages: [
        {
          role: 'viki',
          content: 'CORTEX sovereign systems activated. Cognitive bridge established. I am VIKI, your cybernetic command intelligence. Transmit query, technician.',
          modelUsed: 'viki'
        }
      ]
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('viki_active_session_id') || 'session-default';
  });

  const [showArchive, setShowArchive] = useState(false);

  // Derive current messages with bulletproof array fallback
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { messages: [] };
  const messages = Array.isArray(activeSession.messages) ? activeSession.messages : [];

  // Custom setMessages function that updates the active session nested messages
  const setMessages = (updateFn: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prevSessions => {
      const exists = prevSessions.some(s => s.id === activeSessionId);
      const targetId = exists ? activeSessionId : (prevSessions[0]?.id || 'session-default');

      if (!exists && prevSessions.length > 0) {
        setTimeout(() => setActiveSessionId(targetId), 0);
      }

      return prevSessions.map(s => {
        if (s.id === targetId) {
          const currentMsgs = Array.isArray(s.messages) ? s.messages : [];
          const nextMessages = typeof updateFn === 'function' ? updateFn(currentMsgs) : updateFn;
          
          // Auto-rename session title from the first user message if title is default or basic
          let nextTitle = s.title;
          if (s.title === 'Neural Session: Alpha' || s.title.startsWith('Session:')) {
            const firstUserMsg = nextMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              nextTitle = firstUserMsg.content.substring(0, 24) + (firstUserMsg.content.length > 24 ? '...' : '');
            }
          }

          return {
            ...s,
            messages: nextMessages,
            title: nextTitle,
            timestamp: Date.now()
          };
        }
        return s;
      });
    });
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vikiState, setVikiState] = useState<'idle' | 'thinking' | 'speaking' | 'alert'>('idle');
  
  // Settings
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem('viki_voice_name') || '';
  });

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
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  // Firefox Speech Recognition Fallback States
  const [showMicError, setShowMicError] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Save sessions and settings to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('viki_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('viki_active_session_id', activeSessionId);
  }, [activeSessionId]);

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

  // Load and monitor available OS speech voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setAvailableVoices(allVoices);
      
      // Select default if not chosen
      if (allVoices.length > 0 && !localStorage.getItem('viki_voice_name')) {
        const femaleVoice = allVoices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('samantha') ||
              v.name.toLowerCase().includes('google us english') ||
              v.name.toLowerCase().includes('hazel'))
        ) || allVoices.find(v => v.lang.startsWith('en')) || allVoices[0];
        
        if (femaleVoice) {
          setSelectedVoiceName(femaleVoice.name);
          localStorage.setItem('viki_voice_name', femaleVoice.name);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Voice Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      let hasSent = false;

      rec.onstart = () => {
        setIsListening(true);
        setVikiState('thinking');
        hasSent = false;
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text.trim()) {
          hasSent = true;
          rec.stop();
          setIsListening(false);
          setVikiState('thinking');
          setInput(text);
          sendMessageRef.current(text);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (!hasSent) {
          setVikiState('idle');
        }
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

    try {
      // Stop any ongoing voice playback and force resume if stuck in a paused state
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Clean markdown characters for spoken response
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block generated.') // announce code generation
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~#\-]/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Dynamic voice selection from settings or default English
      const voices = window.speechSynthesis.getVoices();
      const chosenVoice = voices.find(v => v.name === selectedVoiceName) || voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('google us english') ||
            v.name.toLowerCase().includes('hazel'))
      ) || voices.find(v => v.lang.startsWith('en'));

      if (chosenVoice) {
        utterance.voice = chosenVoice;
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
    } catch (e) {
      console.warn("SpeechSynthesis playback failed safely:", e);
      setVikiState('idle');
    }
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

    // Unlock SpeechSynthesis context safely on user interaction
    if ('speechSynthesis' in window) {
      try {
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch (e) {
        console.warn("SpeechSynthesis unlock failed safely:", e);
      }
    }

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

      let fullContent = '';

      if (modelToUse === 'gpt-4o') {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No reader interface available');

        // Append placeholder Viki bubble
        setMessages(prev => [...prev, { 
          role: 'viki', 
          content: '',
          modelUsed: modelToUse
        }]);

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

            if (cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const jsonStr = cleanLine.substring(6);
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  if (!hasStartedStreaming) {
                    hasStartedStreaming = true;
                    setVikiState('speaking');
                  }
                  fullContent += delta;
                  updateLastMessage(fullContent);
                }
              } catch (e) {
                // Buffer line segment
              }
            }
          }
        }

        const leftover = buffer.trim();
        if (leftover && leftover.startsWith('data: ')) {
          try {
            const jsonStr = leftover.substring(6);
            if (jsonStr !== '[DONE]') {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                updateLastMessage(fullContent);
              }
            }
          } catch (e) {
            console.error("Failed to parse leftover gpt-4o buffer segment:", e);
          }
        }
      } else {
        // Non-streaming response parsing for local Viki Agent
        const text = await response.text();
        if (!text.trim()) throw new Error('Empty response received from neural link');

        const parsed = JSON.parse(text);
        const content = parsed.message?.content || parsed.response || '';
        if (content) {
          fullContent = content;
          setMessages(prev => [...prev, { 
            role: 'viki', 
            content: fullContent,
            modelUsed: modelToUse
          }]);
          setVikiState('speaking');
        } else {
          throw new Error('Could not parse response content from neural link');
        }
      }

      // If muted or TTS is not available, return state to idle immediately after text streaming ends
      if (isMuted || !('speechSynthesis' in window)) {
        setVikiState('idle');
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

  // Keep sendMessageRef updated to prevent stale closures in async voice handlers
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const handleMicClick = async () => {
    // Unlock SpeechSynthesis context safely on user interaction
    if ('speechSynthesis' in window) {
      try {
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch (e) {
        console.warn("SpeechSynthesis unlock failed safely:", e);
      }
    }

    // 1. If native Web Speech API is supported, use it!
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
      return;
    }

    // 2. Browser SpeechRecognition not supported (e.g. Firefox by default).
    // Fallback to server-side audio capture & transcription using MediaRecorder
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setShowMicError(true);
      return;
    }

    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      setVikiState('idle');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        recorder.onstop = async () => {
          // Clean up microphone streams immediately
          stream.getTracks().forEach(track => track.stop());
          
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size === 0) return;
          
          setIsTranscribing(true);
          setVikiState('thinking');
          
          try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice_input.webm');
            
            const response = await fetch('/api/viki/api/transcribe', {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) throw new Error('Transcription link failure');
            
            const data = await response.json();
            if (data.text && data.text.trim()) {
              setInput(data.text);
              await sendMessageRef.current(data.text);
            } else if (data.error) {
              console.warn('STT warning:', data.error);
            }
          } catch (err) {
            console.error('Transcription failed:', err);
          } finally {
            setIsTranscribing(false);
            setVikiState(prev => prev === 'speaking' ? 'speaking' : 'idle');
          }
        };
        
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsListening(true);
        setVikiState('thinking');
      } catch (err) {
        console.error('Microphone stream access error:', err);
        setShowMicError(true);
      }
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to purge all neural logs across all sessions? This action is irreversible.")) {
      const initialSession: ChatSession = {
        id: 'session-default',
        title: 'Neural Session: Alpha',
        timestamp: Date.now(),
        messages: [
          { 
            role: 'viki', 
            content: 'CORTEX neural logs purged. Systems restarted. Ready for fresh operations, technician.',
            modelUsed: 'viki'
          }
        ]
      };
      setSessions([initialSession]);
      setActiveSessionId('session-default');
      localStorage.removeItem('viki_chat_history'); // clear legacy cache
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setVikiState('idle');
    }
  };

  const handleCreateSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `Session: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      timestamp: Date.now(),
      messages: [
        {
          role: 'viki',
          content: 'New cybernetic dialogue initialized. Establish operational parameters, technician.',
          modelUsed: 'viki'
        }
      ]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      alert("Cannot delete the final remaining active session. Initiate a new session first.");
      return;
    }
    if (window.confirm("Purge this dialogue session from the Neural Archive?")) {
      const nextSessions = sessions.filter(s => s.id !== id);
      setSessions(nextSessions);
      if (activeSessionId === id) {
        setActiveSessionId(nextSessions[0].id);
      }
    }
  };

  const handleRenameSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const newName = prompt("Enter new title for this operational log:", session.title);
    if (newName && newName.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newName.trim() } : s));
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
            className={`archive-toggle-btn ${showArchive ? 'active' : ''}`}
            onClick={() => setShowArchive(!showArchive)}
            title="Open Neural Archive (Saved Chats)"
          >
            📂 NEURAL ARCHIVE
          </button>

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

                <div className="settings-group" style={{ marginTop: '15px' }}>
                  <label htmlFor="viki-voice" style={{ display: 'block', marginBottom: '5px', color: '#88aaff', fontSize: '12px', fontWeight: 'bold' }}>
                    🔊 VIKI VOICE SYNTHESIS ENGINE
                  </label>
                  <select
                    id="viki-voice"
                    value={selectedVoiceName}
                    onChange={(e) => {
                      setSelectedVoiceName(e.target.value);
                      localStorage.setItem('viki_voice_name', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#040711',
                      border: '1px solid rgba(0, 240, 255, 0.25)',
                      borderRadius: '4px',
                      color: '#00f0ff',
                      fontFamily: 'Courier New, monospace',
                      outline: 'none',
                      marginTop: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    {availableVoices.length === 0 ? (
                      <option value="">(No system speech voices detected - browser/OS TTS is unconfigured)</option>
                    ) : (
                      availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang}) {voice.localService ? '[Local]' : '[Cloud]'}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => speakResponse("System link established. Voice diagnostics online.")}
                    style={{
                      marginTop: '10px',
                      padding: '6px 12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid #00f0ff',
                      color: '#00f0ff',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontFamily: 'Courier New, monospace',
                      fontSize: '11px',
                      letterSpacing: '1px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 240, 255, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)')}
                  >
                    🔊 RUN VOICE DIAGNOSTIC TEST
                  </button>
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
            
            {isTranscribing && (
              <div className="console-row viki thinking">
                <div className="row-avatar">👤</div>
                <div className="console-bubble user thinking" style={{ border: '1px solid var(--neon-coder)' }}>
                  <div className="bubble-meta">
                    <span className="sender-name">TECHNICIAN</span>
                    <span className="model-tag pulse" style={{ background: 'var(--neon-coder)', color: '#000' }}>TRANSCRIBING...</span>
                  </div>
                  <div className="neural-thinking-loader">
                    <div className="pulse-circle" style={{ background: 'var(--neon-coder)', boxShadow: '0 0 8px var(--neon-coder)' }}></div>
                    <span className="font-space" style={{ color: 'var(--neon-coder)' }}>TRANSCRIBING NEURAL AUDIO SIGNAL...</span>
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

        {/* Collapsible Neural Archive Sidebar */}
        {showArchive && (
          <div className="archive-sidebar glassmorphic font-space">
            <div className="archive-header">
              <span className="archive-header-title">📂 NEURAL ARCHIVE</span>
              <button className="new-session-btn font-space" onClick={handleCreateSession}>
                + NEW DIALOGUE
              </button>
            </div>
            
            <div className="archive-list">
              {sessions.map(s => (
                <div 
                  key={s.id} 
                  className={`archive-item ${s.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => setActiveSessionId(s.id)}
                >
                  <div className="archive-item-main">
                    <span className="archive-item-icon">📄</span>
                    <span className="archive-item-title" title={s.title}>
                      {s.title}
                    </span>
                  </div>
                  <div className="archive-item-actions">
                    <button 
                      className="archive-action-btn rename"
                      onClick={(e) => handleRenameSession(s.id, e)}
                      title="Rename Operational Log"
                    >
                      ✏️
                    </button>
                    <button 
                      className="archive-action-btn delete"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      title="Purge Dialogue Session"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showMicError && (
        <div className="mic-error-modal-overlay" onClick={() => setShowMicError(false)}>
          <div className="mic-error-modal glassmorphic" onClick={(e) => e.stopPropagation()}>
            <div className="mic-error-header font-space">
              <span className="mic-error-icon">⚠️</span>
              <span className="mic-error-title">SPEECH INTERFACE OFFLINE</span>
            </div>
            <div className="mic-error-body font-space">
              <p>Web Speech Recognition is not natively enabled by default in Firefox.</p>
              <p className="mic-instructions-title">🔧 HOW TO ACTIVATE IN FIREFOX:</p>
              <ol className="mic-instructions-list">
                <li>Open a new tab and type <code className="glow-code">about:config</code> in the address bar.</li>
                <li>Accept the warning to proceed.</li>
                <li>Search for <code className="glow-code">media.webspeech.recognition.enable</code> and set it to <strong>true</strong>.</li>
                <li>Search for <code className="glow-code">media.webspeech.recognition.force_enable</code> and set it to <strong>true</strong>.</li>
                <li>Restart Firefox and reload this cockpit.</li>
              </ol>
              <p className="mic-alternative">Alternatively, please use Google Chrome, Apple Safari, or Microsoft Edge for out-of-the-box voice operations.</p>
            </div>
            <div className="mic-error-actions">
              <button className="mic-error-close-btn font-space" onClick={() => setShowMicError(false)}>
                CLOSE PILOT OVERLAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
