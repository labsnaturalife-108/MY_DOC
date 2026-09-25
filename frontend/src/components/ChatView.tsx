"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  FileText, 
  Cpu, 
  Loader2,
  X,
  PanelRightClose,
  PanelRightOpen,
  BookOpen,
  CheckCircle,
  FolderOpen
} from "lucide-react";
import { Patient, ChatSession, ChatMessage, AIModel, api } from "@/lib/api";
import { MedicalMarkdown } from "./MedicalMarkdown";

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
  
  // Right sidebar drawer state for RAG sources
  const [isSourcesDrawerOpen, setIsSourcesDrawerOpen] = useState(false);
  const [drawerSources, setDrawerSources] = useState<any[]>([]);
  const [activeSourcesTitle, setActiveSourcesTitle] = useState("Использованные источники");

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
      // Auto-select online local model if on demo
      const onlineLM = data.find((m: any) => m.provider === "lmstudio" && m.id !== "demo-doctor" && m.id !== "lmstudio-auto");
      const autoOption = data.find((m: any) => m.id === "lmstudio-auto" && m.is_online);
      const targetLocal = onlineLM || autoOption;
      
      if ((session.model_id === "demo-doctor" || currentModelId === "demo-doctor") && targetLocal) {
        setCurrentModelId(targetLocal.id);
        api.updateChatSession(session.id, { model_id: targetLocal.id, provider: targetLocal.provider }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await api.getChatMessages(session.id);
      setMessages(msgs);
      
      // Auto-set drawer sources from latest message with sources if available
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].sources_json) {
          try {
            const parsed = JSON.parse(msgs[i].sources_json!);
            if (parsed && parsed.length > 0) {
              setDrawerSources(parsed);
              break;
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleModelChange = async (newId: string) => {
    setCurrentModelId(newId);
    const mObj = models.find((m) => m.id === newId);
    if (mObj) {
      try {
        await api.updateChatSession(session.id, { model_id: newId, provider: mObj.provider });
      } catch (err) {
        console.error("Failed to update session model:", err);
      }
    }
  };

  const currentModel = models.find((m) => m.id === currentModelId) || {
    id: currentModelId,
    name: currentModelId,
    provider: session.provider,
    is_local: false,
  };

  const openSourcesForMessage = (sources: any[], label: string) => {
    setDrawerSources(sources);
    setActiveSourcesTitle(label);
    setIsSourcesDrawerOpen(true);
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
                setDrawerSources(parsedSources);
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
    "Что в результатах УЗИ сосудов шеи?",
    "Совместимы ли назначенные препараты с моими диагнозами?",
  ];

  const getFolderLabel = (fType: string) => {
    switch (fType) {
      case "analyses":
        return "Лабораторные анализы";
      case "researches":
        return "Исследования / УЗИ";
      case "notes":
        return "Консультации и выписки";
      case "knowledge_base":
        return "База знаний";
      default:
        return "Документ";
    }
  };

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-zinc-950">
      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full p-4 sm:p-6 transition-all">
        {/* Top Model Selector & Actions Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">Модель ИИ-доктора:</span>
              <div className="flex items-center gap-2">
                <select
                  value={currentModelId}
                  onChange={(e) => handleModelChange(e.target.value)}
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

          {/* Right Action buttons: Sources Drawer Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSourcesDrawerOpen(!isSourcesDrawerOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${
                isSourcesDrawerOpen
                  ? "bg-zinc-800 text-zinc-100 border-zinc-600 shadow-sm"
                  : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700"
              }`}
              title="Открыть/закрыть боковую панель источников RAG"
            >
              {isSourcesDrawerOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 text-zinc-300" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>Источники RAG</span>
              {drawerSources.length > 0 && (
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded-full text-[10px] font-mono text-zinc-300">
                  {drawerSources.length}
                </span>
              )}
            </button>
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
                      ? "bg-zinc-800 border border-zinc-750 text-zinc-100 rounded-tr-none font-medium whitespace-pre-wrap"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none"
                  }`}
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <MedicalMarkdown content={m.content} />
                  )}

                  {/* Clean, compact Sources Trigger Button (does not clutter chat!) */}
                  {!isUser && parsedSources && parsedSources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <button
                        onClick={() => openSourcesForMessage(parsedSources, `Источники ответа #${m.id}`)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Использованные источники ({parsedSources.length})</span>
                      </button>
                      <span className="text-[10px] text-zinc-500">RAG Context</span>
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

              <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-none p-4 text-xs sm:text-sm leading-relaxed shadow-lg">
                {streamingText ? (
                  <MedicalMarkdown content={streamingText} />
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <span>Изучение результатов анализов и генерация ответа...</span>
                  </div>
                )}

                {/* Compact sources trigger for live streaming */}
                {currentSources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => openSourcesForMessage(currentSources, "Источники текущего ответа")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 transition"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Найдено в базе ({currentSources.length})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="mt-4 pt-2 shrink-0">
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

      {/* Right Slide-out Sidebar for Sources (Правый боковой слайдбар) */}
      <div
        className={`w-96 border-l border-zinc-800 bg-zinc-900/98 flex flex-col h-full shadow-2xl z-30 transition-all duration-300 ease-in-out shrink-0 ${
          isSourcesDrawerOpen ? "translate-x-0 mr-0" : "translate-x-full absolute right-0 top-0 bottom-0 pointer-events-none opacity-0"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Источники RAG
              </h3>
              <p className="text-[11px] text-zinc-400">
                {drawerSources.length} {drawerSources.length === 1 ? "документ" : "документа(ов)"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSourcesDrawerOpen(false)}
            className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition"
            title="Закрыть панель"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drawerSources.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              Нет прикрепленных фрагментов документов
            </div>
          ) : (
            drawerSources.map((s: any, idx: number) => (
              <div
                key={idx}
                className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/90 shadow-sm space-y-2 hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-850 text-zinc-300 border border-zinc-750 font-medium truncate">
                    {getFolderLabel(s.folder)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    #{idx + 1}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-zinc-200 text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{s.filename}</span>
                </div>

                <div className="p-2.5 bg-zinc-900/90 rounded-lg border border-zinc-800 text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {s.snippet}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px]">Векторная база ChromaDB</span>
          <button
            onClick={() => setIsSourcesDrawerOpen(false)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-lg text-xs transition"
          >
            Скрыть
          </button>
        </div>
      </div>
    </div>
  );
};
