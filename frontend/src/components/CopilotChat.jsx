import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage, resetChat } from '../store/complaintSlice';
import FileUpload from './FileUpload';

const Typewriter = ({ text }) => {
    const [display, setDisplay] = useState('');
    
    useEffect(() => {
        let i = 0;
        setDisplay('');
        const interval = setInterval(() => {
            setDisplay(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 15);
        return () => clearInterval(interval);
    }, [text]);

    const renderText = (str) => {
        return str.split('**').map((chunk, i) => i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk);
    };
    return <span>{renderText(display)}</span>;
};

const CopilotChat = () => {
    const [input, setInput] = useState('');
    const dispatch = useDispatch();
    const { messages, status, error, activeComplaint } = useSelector((state) => state.complaint);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, status]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (!input.trim() || status === 'loading') return;
        if (activeComplaint?.status === 'Committed') return;
        
        dispatch(sendMessage(input));
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const isCommitted = activeComplaint?.status === 'Committed';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff', fontFamily: '"Inter", sans-serif' }}>
            
            {/* Header - Fixed */}
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                    <span style={{ color: '#3b82f6', fontSize: '18px' }}>✨</span> AI Complaint Intake Assistant
                </h2>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>BETA</span>
            </div>

            {/* Document Upload Widget - Fixed */}
            <div style={{ padding: '20px', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
                <FileUpload />
                <div style={{ textAlign: 'center', position: 'relative', margin: '20px 0' }}>
                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                    <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#ffffff', padding: '0 10px', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>OR</span>
                </div>
                <div style={{ 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    textAlign: 'center', 
                    color: '#64748b', 
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Paste Complaint Text / Email
                </div>
                <div style={{ marginTop: '16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', color: '#166534', fontSize: '11px', display: 'flex', gap: '8px' }}>
                    <span>ⓘ</span>
                    <div>
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>Supported formats: PDF, JPG, PNG</div>
                        <div>For emails or other text, paste the content directly into the chat.</div>
                    </div>
                </div>
            </div>

            {/* Chat Messages Area - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '1px' }}>AI ASSISTANT</div>
                
                {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    const isLastAssistantMsg = !isUser && index === messages.length - 1;
                    return (
                        <div 
                            key={index} 
                            style={{
                                alignSelf: isUser ? 'flex-end' : 'flex-start',
                                backgroundColor: isUser ? '#2563eb' : '#f8fafc',
                                color: isUser ? '#ffffff' : '#1e293b',
                                border: isUser ? 'none' : '1px solid #e2e8f0',
                                padding: '14px 18px',
                                borderRadius: '8px',
                                maxWidth: '90%',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                wordWrap: 'break-word',
                            }}
                        >
                            {/* AI Icon for assistant messages */}
                            {!isUser && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#2563eb', fontWeight: '600' }}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 1 1 12 2zM8.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                                    </svg>
                                </div>
                            )}
                            {isLastAssistantMsg ? <Typewriter text={msg.text} /> :
                              msg.text.split('**').map((chunk, i) => i % 2 === 1 ? <strong key={i}>{chunk}</strong> : chunk)}
                        </div>
                    );
                })}
                
                {status === 'loading' && (
                    <div style={{ padding: '10px 0', width: '100%' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '1px', marginBottom: '8px' }}>EXTRACTION PROGRESS</div>
                        <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', position: 'relative', marginBottom: '12px' }}>
                            <div style={{ 
                                position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
                                backgroundColor: '#3b82f6', borderRadius: '6px',
                                animation: 'progress 1.5s infinite linear' 
                            }} />
                        </div>
                        <p style={{ fontSize: '12px', color: '#475569', margin: 0, fontWeight: '500' }}>
                            Analyzing document content and extracting key details...<br/>Please wait, this may take a few moments.
                        </p>
                    </div>
                )}
                
                {error && (
                    <div style={{ alignSelf: 'center', color: '#dc2626', marginTop: '10px', fontSize: '13px' }}>
                        Error: {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Fixed */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff', flexShrink: 0 }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isCommitted ? "Complaint committed. Start a new one." : "Ask me anything about this complaint..."}
                        disabled={status === 'loading' || isCommitted}
                        rows={1}
                        style={{ 
                            width: '100%', 
                            padding: '14px 50px 14px 14px', 
                            borderRadius: '6px', 
                            border: '1px solid #e2e8f0',
                            backgroundColor: isCommitted ? '#f8fafc' : '#ffffff',
                            fontSize: '13px',
                            resize: 'none',
                            fontFamily: 'inherit',
                            outline: 'none',
                            maxHeight: '100px',
                            overflowY: 'auto',
                            boxSizing: 'border-box'
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={status === 'loading' || !input.trim() || isCommitted}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            bottom: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: (status === 'loading' || !input.trim() || isCommitted) ? '#cbd5e1' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (status === 'loading' || !input.trim() || isCommitted) ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {/* Send Arrow SVG */}
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: '#94a3b8' }}>
                    AI responses may contain errors. Please verify information.
                </div>
            </div>
        </div>
    );
};

export default CopilotChat;