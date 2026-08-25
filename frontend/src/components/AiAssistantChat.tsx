import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api/client';
import type { ChatMessagePayload, ToolCallInfo } from '../api/client';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  X, 
  ArrowUp, 
  Loader2, 
  SquarePen, 
  Search, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Info,
  FileText,
  PanelLeftClose,
  PanelLeft,
  GripVertical,
  Copy,
  Check
} from 'lucide-react';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_called?: ToolCallInfo[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "📋 חובת נוכחות 61767", prompt: "האם יש חובת נוכחות בקורס 61767 לפי הסילבוס?" },
  { label: "📅 מתי מתחיל סמסטר ב'?", prompt: "מתי מתחיל סמסטר ב' לפי הלוח האקדמי בבראודה?" },
  { label: "🔍 חפש קורס אלגברה", prompt: "חפש קורסים בנושא אלגברה בבראודה" },
  { label: "⏱️ לוח זמנים קורס 61101", prompt: "מה הלוח זמנים והשעות של קורס 61101?" }
];

export interface AiAssistantChatProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({
  isOpen: externalIsOpen,
  onToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(prev => !prev);
    }
  };

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('ai_chat_sidebar_width');
    const parsed = saved ? parseInt(saved, 10) : 480;
    return Math.max(440, parsed);
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const minW = 440;
      const maxW = Math.min(900, window.innerWidth - 100);
      const newWidth = Math.max(minW, Math.min(moveEvent.clientX, maxW));
      setSidebarWidth(newWidth);
      localStorage.setItem('ai_chat_sidebar_width', newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: 'שלום! אני פרופסור אורקה 🐋 – העוזר האקדמי האישי שלך במכללת אורט בראודה.\n\nאני מחובר ישירות ל-MCP של מכללת בראודה ומסוגל לסרוק קובצי סילבוס (PDF), לבדוק חובת נוכחות בקורסים, להציג את הלוח האקדמי ולסייע בבחירת מערכת שעות.\n\nאיזה מידע, קורס או סילבוס תרצה לבדוק היום?',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);
    setErrorNotice(null);

    const apiPayload: ChatMessagePayload[] = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await sendChatMessage(apiPayload);
      const assistantMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        tools_called: response.tools_called,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorNotice(err.message || 'אירעה שגיאה בחיבור לשרת ה-AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'שיחה חדשה אותחלה. במה אוכל לעזור לך עכשיו בקשר ללימודים בבראודה?',
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorNotice(null);
  };

  const renderToolBadge = (tool: ToolCallInfo, index: number) => {
    let icon = <Search className="w-3 h-3 text-sky-400" />;
    let label = tool.name;

    if (tool.name === 'search_courses') {
      icon = <Search className="w-3 h-3 text-sky-400" />;
      label = `חיפוש קורסים: "${tool.args.query || ''}"`;
    } else if (tool.name === 'get_academic_calendar') {
      icon = <CalendarIcon className="w-3 h-3 text-emerald-400" />;
      label = `בדיקת לוח אקדמי`;
    } else if (tool.name === 'get_course_schedule') {
      icon = <BookOpen className="w-3 h-3 text-purple-400" />;
      label = `לוח זמנים קורס ${tool.args.courseCode || ''}`;
    } else if (tool.name === 'scan_syllabus_pdf') {
      icon = <FileText className="w-3 h-3 text-amber-400" />;
      label = `סריקת סילבוס (PDF) ${tool.args.courseCode || ''}`;
    }

    return (
      <div 
        key={index} 
        className="inline-flex items-center gap-1.5 text-xs bg-surfaceHighlight/90 border border-border/80 rounded-full px-2.5 py-1 text-textSecondary font-mono my-1"
      >
        {icon}
        <span>{label}</span>
      </div>
    );
  };

  const renderChatBody = (isDesktopSidebar: boolean = false) => (
    <>
      {/* Header */}
      <header className="bg-surfaceHighlight/60 border-b border-border/80 px-4 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center p-1.5 shadow-inner">
            <img src="/favicon.svg" alt="Orca Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-bold text-base bg-gradient-to-l from-primary via-blue-400 to-sky-300 bg-clip-text text-transparent m-0">
              פרופסור אורקה AI
            </h3>
            {isDesktopSidebar && (
              <span className="text-[11px] text-textSecondary font-medium block -mt-0.5">סרגל צד AI – עוזר אקדמי</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            title="שיחה חדשה"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-textPrimary bg-surfaceHighlight/80 hover:bg-primary/20 hover:text-primary border border-border/80 hover:border-primary/40 rounded-xl transition-all cursor-pointer shadow-xs group"
          >
            <SquarePen className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span>שיחה חדשה</span>
          </button>
          
          <button
            onClick={handleToggle}
            title="סגירה"
            className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-surfaceHighlight rounded-lg transition-colors cursor-pointer"
          >
            {isDesktopSidebar ? <PanelLeftClose className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 max-w-[92%] sm:max-w-[88%] text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tl-xs shadow-md'
                  : 'bg-surfaceHighlight/90 border border-border/80 text-textPrimary rounded-tr-xs shadow-md'
              }`}
            >
              {msg.tools_called && msg.tools_called.length > 0 && (
                <div className="mb-2.5 pb-2 border-b border-border/50 flex flex-wrap gap-1">
                  {msg.tools_called.map((tool, tIdx) => renderToolBadge(tool, tIdx))}
                </div>
              )}

              <div className="text-sm">
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
              </div>
              
              <div className={`flex items-center justify-between gap-3 text-[10px] mt-2 pt-1 border-t ${
                msg.role === 'user' 
                  ? 'border-white/10 text-blue-100' 
                  : 'border-border/40 text-textSecondary'
              }`}>
                <span>{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopyMessage(msg.content, msg.id)}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-surfaceHighlight"
                    title="העתק תשובה"
                  >
                    {copiedMsgId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">הועתק!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>העתק</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-surfaceHighlight/90 border border-border/80 rounded-2xl rounded-tr-xs px-4 py-3 text-textSecondary flex items-center gap-2.5 shadow-md text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>פרופסור אורקה מתייעץ עם MCP בראודה...</span>
            </div>
          </div>
        )}

        {errorNotice && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">שגיאת התקשרות:</span>
              <span>{errorNotice}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {messages.length <= 3 && !isLoading && (
        <div className="px-3 py-2 border-t border-border/40 bg-surface/40 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.prompt)}
              className="whitespace-nowrap text-xs bg-surfaceHighlight/70 hover:bg-primary/20 text-textSecondary hover:text-primary border border-border/60 hover:border-primary/40 rounded-full px-2.5 py-1 transition-all cursor-pointer shrink-0"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Footer */}
      <footer className="p-3 border-t border-border/80 bg-surfaceHighlight/40 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="שאל את פרופסור אורקה על הקורסים..."
            rows={1}
            className="flex-1 bg-surfaceHighlight border border-border/80 rounded-xl px-3.5 py-2.5 text-textPrimary text-sm placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none overflow-hidden hide-scrollbar max-h-24 min-h-[42px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-primary text-white hover:bg-primaryHover rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md shadow-primary/20"
            title="שלח הודעה"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          </button>
        </form>
        <div className="text-[11px] text-textSecondary/70 text-center mt-2 font-medium">
          בינה מלאכותית עלולה לטעות. יש לאמת מידע קריטי.
        </div>
      </footer>
    </>
  );

  return (
    <>
      {/* AI Assistant Button - Docked & Blended to the top-left edge of the screen */}
      <div className="fixed top-24 left-0 z-50 dir-rtl">
        <button
          onClick={handleToggle}
          className={`group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-r-2xl rounded-l-none border-t border-r border-b border-l-0 transition-all duration-300 cursor-pointer shadow-xl backdrop-blur-md ${
            isOpen 
              ? 'bg-surfaceHighlight border-border text-textPrimary pl-4 pr-3.5' 
              : 'bg-surface/95 border-primary/50 text-white hover:border-primary hover:pl-5 hover:pr-4 [box-shadow:4px_0_20px_rgba(59,130,246,0.3)] hover:[box-shadow:6px_0_25px_rgba(59,130,246,0.5)]'
          }`}
          aria-label="פרופסור אורקה AI"
          title={isOpen ? "סגור צ'אט AI" : "פתח צ'אט AI"}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center p-1 overflow-hidden">
              <img src="/favicon.svg" alt="Orca Icon" className="w-full h-full object-contain transform group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium text-xs sm:text-sm whitespace-nowrap">
            <span className="bg-gradient-to-l from-primary via-blue-400 to-sky-300 bg-clip-text text-transparent font-bold">
              פרופסור אורקה AI
            </span>
            <PanelLeft className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-textSecondary' : 'text-primary'}`} />
          </div>
        </button>
      </div>

      {/* Mobile Floating Modal (< md) */}
      {isOpen && (
        <div className="md:hidden fixed bottom-20 left-4 sm:left-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[620px] max-h-[82vh] bg-surface/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 transition-all duration-200 dir-rtl">
          {renderChatBody(false)}
        </div>
      )}

      {/* Desktop Sidebar Drawer (>= md) */}
      {isOpen && (
        <>
          <div 
            className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={handleToggle}
          />
          <aside 
            style={{ width: `${sidebarWidth}px` }}
            className={`hidden md:flex fixed top-0 left-0 bottom-0 h-full max-w-[85vw] z-50 bg-surface/95 backdrop-blur-2xl border-r border-border/80 shadow-2xl flex-col overflow-hidden dir-rtl ${
              isResizing ? 'select-none transition-none' : 'animate-in fade-in slide-in-from-left duration-300'
            }`}
          >
            {renderChatBody(true)}

            {/* Resize Handle on the right edge of left-docked sidebar */}
            <div
              onMouseDown={startResizing}
              onDoubleClick={() => {
                setSidebarWidth(420);
                localStorage.setItem('ai_chat_sidebar_width', '420');
              }}
              className="absolute top-0 right-0 bottom-0 w-2.5 hover:w-3.5 bg-transparent hover:bg-primary/20 active:bg-primary/40 cursor-col-resize z-50 transition-all flex items-center justify-center group"
              title="גרור לשניית רוחב סרגל ה-AI (לחיצה כפולה לאיפוס)"
            >
              <div className="w-1 h-12 rounded-full bg-border/60 group-hover:bg-primary group-active:bg-primary-light transition-colors flex items-center justify-center shadow-sm">
                <GripVertical className="w-3 h-3 text-textSecondary/50 group-hover:text-white transition-colors" />
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
};
