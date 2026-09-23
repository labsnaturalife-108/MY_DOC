"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  ChevronDown, 
  Sparkles, 
  FileText, 
  AlertTriangle, 
  Cpu, 
  Globe,
  Loader2,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { Patient, ChatSession, ChatMessage, AIModel, api } from "@/lib/api";

interface ChatViewProps {
  patient: Patient;
  session: ChatSession;
  onUpdateSessionTitle?: (title: string) => void;
  onOpenSettings: () => void;
  isLocalOnline: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  patient,
  session,
  onOpenSettings,
  isLocalOnline,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [models, setModels] = useState<AIModel[]>([]);
  const [currentModelId, setCurrentModelId] = useState(session.model_id);
  const [streaming, setStreaming] = useState(false);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadModels();
    loadMessages();
    setCurrentModelId(session.model_id);
  }, [session.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const loadModels = async () => {
    try {
      const data = await api.getModels();
      setModels(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await api.getChatMessages(session.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const currentModel = models.find((m) => m.id === currentModelId) || {
    id: currentModelId,
    name: currentModelId,
    provider: session.provider,
    is_local: false,
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || streaming) return;

    setInput("");
    setStreaming(true);
    setStreamingText("");
    setCurrentSources([]);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: session.id,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch(`http://localhost:8000/api/chat/sessions/${session.id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: query,
          model_id: currentModelId,
          provider: currentModel.provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const block of lines) {
            if (!block.trim()) continue;
            const eventMatch = block.match(/event:\s*(\w+)/);
            const dataMatch = block.match(/data:\s*([\s\S]*)/);

            const eventType = eventMatch ? eventMatch[1] : "token";
            const dataStr = dataMatch ? dataMatch[1].trim() : "";

            if (eventType === "sources") {
              try {
                const parsedSources = JSON.parse(dataStr);
                setCurrentSources(parsedSources);
              } catch (e) {}
            } else if (eventType === "token") {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.delta) {
                  accumulated += parsed.delta;
                  setStreamingText(accumulated);
                }
              } catch (e) {}
            } else if (eventType === "done") {
              break;
            }
          }
        }
      }

      // Refresh final messages from DB
      await loadMessages();
    } catch (err: any) {
      alert("Ошибка отправки сообщения: " + err.message);
    } finally {
      setStreaming(false);
      setStreamingText("");
      setCurrentSources([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Проанализируй мои последние анализы и выдели отклонения",
    "Совместимы ли назначенные препараты с моими диагнозами?",
    "Что советует загруженная литература по моему вопросу?",
  ];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Top Model Selector Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Модель ИИ-доктора:</span>
            <div className="flex items-center gap-2">
              <select
                value={currentModelId}
                onChange={(e) => setCurrentModelId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-zinc-500 cursor-pointer"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.is_local ? "🏠 (Локально)" : "☁️ (Облако)"}
                  </option>
                ))}
              </select>

              {currentModel.is_local && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                    isLocalOnline
                      ? "bg-zinc-800 text-emerald-400 border border-zinc-700"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  {isLocalOnline ? "LM Studio Online" : "Офлайн (Демо)"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Patient contextual chip */}
        <div className="text-right hidden sm:block">
          <span className="text-[11px] text-zinc-400 block">Контекст консультации:</span>
          <span className="text-xs font-medium text-zinc-200">
            {patient.full_name} • RAG активен
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && !streaming && (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Медицинский ассистент MY_DOC готов к диалогу
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Задайте любой вопрос по здоровью, анализам или методикам лечения. Все аллергии и
                загруженные исследования пациента учитываются автоматически.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-xl mx-auto">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3.5 py-2 rounded-xl transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          let parsedSources = [];
          if (m.sources_json) {
            try {
              parsedSources = JSON.parse(m.sources_json);
            } catch (e) {}
          }

          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                  isUser
                    ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    : "bg-zinc-850 border border-zinc-700/80 text-zinc-200 shadow-md"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                  isUser
                    ? "bg-zinc-800 border border-zinc-750 text-zinc-100 rounded-tr-none font-medium"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none whitespace-pre-wrap"
                }`}
              >
                {m.content}

                {/* Sources / Citations */}
                {!isUser && parsedSources && parsedSources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Использованные источники (RAG):
                    </p>
                    <div className="space-y-1">
                      {parsedSources.map((s: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-300"
                        >
                          <span className="font-semibold text-zinc-200">
                            [{s.folder || "документ"}]: {s.filename}
                          </span>
                          <p className="text-zinc-400 mt-0.5 line-clamp-2">{s.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming message bubble */}
        {streaming && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-850 border border-zinc-700/80 shadow-md shrink-0 flex items-center justify-center text-zinc-200">
              <Bot className="w-4 h-4" />
            </div>

            <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-none p-4 text-xs sm:text-sm leading-relaxed shadow-lg whitespace-pre-wrap">
              {streamingText ? (
                streamingText
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  <span>Поиск по анализам и генерация ответа...</span>
                </div>
              )}

              {currentSources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <p className="text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Найдено в базе знаний ({currentSources.length}):
                  </p>
                  <div className="space-y-1">
                    {currentSources.map((s: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[11px] text-zinc-300"
                      >
                        <span className="font-semibold text-zinc-200">{s.filename}</span>
                        <p className="text-zinc-400 mt-0.5 line-clamp-2">{s.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="mt-4 pt-2">
        <div className="relative bg-zinc-900 border border-zinc-800 focus-within:border-zinc-600 rounded-2xl p-2 shadow-2xl transition">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Спросите доктора о здоровье ${patient.full_name.split(" ")[0]}...`}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm outline-none resize-none px-2 py-1"
          />

          <div className="flex items-center justify-between pt-1 px-1">
            <span className="text-[10px] text-zinc-500">
              Enter — отправить, Shift+Enter — новая строка
            </span>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              className="p-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 text-zinc-950 rounded-xl shadow transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
