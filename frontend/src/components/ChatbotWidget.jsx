import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage } from '../api';

export default function ChatbotWidget({ role, isQuizActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getWelcomeMessage = () => {
    if (role === 'teacher') {
      return "Hi! I'm your AI Assistant. Ask me to list your classes, analyze class-wide performance, or draft a structured quiz!";
    }
    return "Hi! I'm your AI Assistant. Ask me to list your enrolled classes or show your detailed behavioral performance report!";
  };

  // Load chat history on mount
  useEffect(() => {
    const saved = localStorage.getItem(`studydb_chat_history_${role}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    } else {
      setMessages([
        { role: 'assistant', content: getWelcomeMessage() }
      ]);
    }
  }, [role]);

  // Close chat if a quiz starts
  useEffect(() => {
    if (isQuizActive) {
      setIsOpen(false);
    }
  }, [isQuizActive]);

  // Save to local storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`studydb_chat_history_${role}`, JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearHistory = () => {
    const initMsg = [{ role: 'assistant', content: getWelcomeMessage() }];
    setMessages(initMsg);
    localStorage.setItem(`studydb_chat_history_${role}`, JSON.stringify(initMsg));
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await sendChatMessage(text, messages);
      
      if (res.response && res.response.trim().startsWith('{"_mcp_action"')) {
        try {
          const actionData = JSON.parse(res.response);
          if (actionData._mcp_action === "SPAWN_QUIZ") {
            window.dispatchEvent(new CustomEvent('SPAWN_QUIZ', { detail: actionData.payload }));
            setMessages([...newMessages, { role: 'assistant', content: "I've drafted the quiz and opened the Quiz Creator for you!" }]);
            return;
          }
          if (actionData._mcp_action === "REQUEST_CLASS_SELECTION") {
            const originalPrompt = actionData.payload?.original_prompt || '';
            window.dispatchEvent(new CustomEvent('REQUEST_CLASS_SELECTION', { detail: { original_prompt: originalPrompt } }));
            setMessages([...newMessages, { role: 'assistant', content: "Please select a class from the dashboard so I can fetch its topics and draft the quiz!" }]);
            return;
          }
        } catch (e) {
          console.error("Failed to parse MCP action", e);
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: "⚠️ Error connecting to assistant. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const userMsg = input.trim();
    setInput('');
    sendMessage(userMsg);
  };

  // Sends a message to the backend silently — no user bubble shown in the chat UI.
  // Used for internal system handshakes like the class-selection resume message.
  const sendSilentMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await sendChatMessage(text, messages);
      if (res.response && res.response.trim().startsWith('{"_mcp_action"')) {
        try {
          const actionData = JSON.parse(res.response);
          if (actionData._mcp_action === "SPAWN_QUIZ") {
            window.dispatchEvent(new CustomEvent('SPAWN_QUIZ', { detail: actionData.payload }));
            setMessages(prev => [...prev, { role: 'assistant', content: "I've drafted the quiz and opened the Quiz Creator for you!" }]);
            return;
          }
        } catch (e) {
          console.error("Failed to parse MCP action", e);
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error connecting to assistant. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleRemoteSend = (e) => {
      sendSilentMessage(e.detail);
    };
    window.addEventListener("SEND_CHAT_MESSAGE", handleRemoteSend);
    return () => window.removeEventListener("SEND_CHAT_MESSAGE", handleRemoteSend);
  }, [messages, isLoading]);

  if (isQuizActive) {
    return (
      <div
        title="Chat is paused during a quiz. Focus!"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          fontSize: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e2e8f0',
          border: '3px solid #94a3b8',
          boxShadow: '4px 4px 0 #94a3b8',
          cursor: 'not-allowed',
          color: '#94a3b8',
          userSelect: 'none',
        }}
      >
        🔒
      </div>
    );
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        className="brutal-btn brutal-btn-pink"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          fontSize: '24px',
          padding: 0
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="brutal-card"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '350px',
            height: '500px',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            padding: 0
          }}
        >
          {/* Header */}
          <div style={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            padding: '16px',
            borderBottom: 'var(--border-width) solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}> AI Assistant</h3>
            <button 
              onClick={clearHistory}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '12px'
              }}
            >
              Clear Chat
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  backgroundColor: msg.role === 'user' ? 'var(--secondary)' : 'var(--white)',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  border: '2px solid var(--border)',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  boxShadow: '2px 2px 0 var(--border)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px'
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'var(--yellow)',
                  border: '2px solid var(--border)',
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 0',
                  boxShadow: '2px 2px 0 var(--border)',
                  fontSize: '14px',
                  fontWeight: 'bold'
              }}>
                Typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Slash Command Autocomplete Dropdown */}
          {input.startsWith('/') && (
            <div style={{
              position: 'absolute',
              bottom: '75px',
              left: '16px',
              right: '16px',
              backgroundColor: 'var(--white)',
              border: '2px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '4px 4px 0 var(--border)',
              zIndex: 10000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {(role === 'teacher' ? [
                { cmd: '/draft_quiz ', desc: 'Draft a new quiz' },
                { cmd: '/analyze_student ', desc: 'Analyze student performance' }
              ] : []).filter(c => c.cmd.startsWith(input) && input.length < c.cmd.length).map((c, i) => (
                <div 
                  key={i}
                  onClick={() => setInput(c.cmd)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--yellow)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg)'}
                >
                  <span style={{ color: 'var(--primary)' }}>{c.cmd}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 'normal', fontSize: '12px' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            style={{
              padding: '16px',
              borderTop: 'var(--border-width) solid var(--border)',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--white)'
            }}
          >
            <input 
              type="text" 
              className="brutal-input"
              style={{ flex: 1, padding: '8px 12px' }}
              placeholder="Ask me anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="brutal-btn brutal-btn-accent"
              style={{ padding: '8px 16px' }}
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
