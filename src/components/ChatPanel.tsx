'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Zap, ShieldAlert } from 'lucide-react';

const DEFAULT_PROMPTS = [
    'What if China invades Taiwan in 2027?',
    'Iran vs Israel — who wins?',
    'Can India take back PoK?',
    'Russia attacks Europe scenario',
    'Nuclear risk assessment',
];

const COMMANDER_PROMPTS = [
    'What are my immediate strategic threats?',
    'Give me a tactical breakdown of our active assigned bases.',
    'What happens if I launch a preemptive strike now?',
    'Analyze the economic fallout of a blockade.',
    'Which allies will support us in a conflict?'
];

export default function ChatPanel() {
    const { chatMessages, sendChatMessage, isChatLoading, activeScenario, playerCountry } = useApp();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isChatLoading]);

    const handleSend = () => {
        const msg = input.trim();
        if (!msg || isChatLoading) return;
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = '42px';
        sendChatMessage(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = '42px';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    };

    const activePrompts = playerCountry ? COMMANDER_PROMPTS : DEFAULT_PROMPTS;

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <ShieldAlert size={18} style={{ color: playerCountry ? '#ef4444' : '#bc8cff' }} />
                <h2>{playerCountry ? 'Strategic Advisor' : 'Wargame AI'}</h2>
                <span className="ai-badge">
                    <Zap size={10} style={{ marginRight: 3 }} />
                    {playerCountry ? 'Classified Uplink' : 'Groq + PyTorch'}
                </span>
            </div>

            <div className="chat-messages">
                {chatMessages.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)',
                    }}>
                        <ShieldAlert size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: playerCountry ? '#ef4444' : 'inherit' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: playerCountry ? '#ef4444' : 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {playerCountry ? `${playerCountry} HIGH COMMAND ADVISOR` : 'WARGAME-AI Ready'}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                            {playerCountry
                                ? <>Commander, I am online and tracking all assets.<br />Ask me for tactical analysis, strike recommendations,<br />or economic impact projections.</>
                                : <>Ask me about any geopolitical scenario.<br />I&apos;ll use the live PyTorch model to analyze<br />conflict probabilities, alliance cascades,<br />and strategic outcomes.</>}
                        </div>
                        {activeScenario && (
                            <div style={{
                                marginTop: 16, padding: '10px 14px', background: 'rgba(88, 166, 255, 0.06)',
                                border: '1px solid rgba(88, 166, 255, 0.15)', borderRadius: 10, fontSize: 11,
                                color: 'var(--accent-blue)',
                            }}>
                                📍 Active: <strong>{activeScenario.scenario.title}</strong> — ask me about it!
                            </div>
                        )}
                    </div>
                )}

                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role === 'user' ? 'user' : ''}`}>
                        <div className={`message-avatar ${msg.role === 'user' ? 'human' : 'ai'}`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className="message-content">
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                                <p>{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isChatLoading && (
                    <div className="chat-message">
                        <div className="message-avatar ai">
                            <Bot size={14} />
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                                <div className="typing-dot" />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Analyzing with GNN+LSTM model...
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <div className="quick-prompts">
                    {activePrompts.map((prompt, i) => (
                        <button
                            key={i}
                            className="quick-prompt"
                            onClick={() => {
                                if (!isChatLoading) {
                                    setInput(prompt);
                                    sendChatMessage(prompt);
                                }
                            }}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
                <div className="chat-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={input}
                        onChange={handleTextareaInput}
                        onKeyDown={handleKeyDown}
                        placeholder={playerCountry ? "Request tactical advice Commander..." : "Ask about any war scenario..."}
                        rows={1}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isChatLoading}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
