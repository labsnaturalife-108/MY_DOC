"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Server, Key, Cpu, Sparkles, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshStatus?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRefreshStatus }) => {
  const [lmstudioUrl, setLmstudioUrl] = useState("http://localhost:1234/v1");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434/v1");
  
  const [keys, setKeys] = useState({
    api_key_openai: "",
    api_key_anthropic: "",
    api_key_gemini: "",
    api_key_deepseek: "",
    api_key_grok: "",
    api_key_qwen: "",
  });

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data.url_lmstudio) setLmstudioUrl(data.url_lmstudio);
      if (data.url_ollama) setOllamaUrl(data.url_ollama);
      setKeys((prev) => ({
        ...prev,
        api_key_openai: data.api_key_openai || "",
        api_key_anthropic: data.api_key_anthropic || "",
        api_key_gemini: data.api_key_gemini || "",
        api_key_deepseek: data.api_key_deepseek || "",
        api_key_grok: data.api_key_grok || "",
        api_key_qwen: data.api_key_qwen || "",
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestLocal = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.checkLocalServers();
      if (res.lmstudio?.online) {
        setTestResult(`✅ LM Studio обнаружен и работает! Найдено моделей: ${res.lmstudio.models?.length || 0}`);
      } else {
        setTestResult(`⚠️ LM Studio не отвечает по адресу ${lmstudioUrl}. Убедитесь, что сервер включен в LM Studio.`);
      }
      if (onRefreshStatus) onRefreshStatus();
    } catch (err: any) {
      setTestResult("❌ Ошибка проверки: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveSetting("url_lmstudio", lmstudioUrl);
      await api.saveSetting("url_ollama", ollamaUrl);

      for (const [key, val] of Object.entries(keys)) {
        if (val && !val.includes("...")) {
          await api.saveSetting(key, val);
        }
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);

      if (onRefreshStatus) onRefreshStatus();
    } catch (err: any) {
      alert("Ошибка сохранения: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Настройки нейросетей и подключений</h3>
              <p className="text-xs text-slate-400">Локальные серверы и облачные API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="space-y-5">
          {/* Section 1: Local LM Studio */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                Локальный LM Studio (Конфиденциально)
              </span>
              <button
                type="button"
                onClick={handleTestLocal}
                disabled={testing}
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg transition"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                Проверить связь
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">API Endpoint LM Studio</label>
              <input
                type="text"
                value={lmstudioUrl}
                onChange={(e) => setLmstudioUrl(e.target.value)}
                placeholder="http://localhost:1234/v1"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {testResult && (
              <p className="text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                {testResult}
              </p>
            )}
          </div>

          {/* Section 2: Cloud API Keys */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
            <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 mb-1 block">
              <Key className="w-4 h-4" />
              Облачные API Ключи (Шифруются и сохраняются локально)
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">OpenAI API Key (GPT-4o)</label>
                <input
                  type="password"
                  value={keys.api_key_openai}
                  onChange={(e) => setKeys({ ...keys, api_key_openai: e.target.value })}
                  placeholder="sk-proj-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Anthropic API Key (Claude 3.5 Sonnet)</label>
                <input
                  type="password"
                  value={keys.api_key_anthropic}
                  onChange={(e) => setKeys({ ...keys, api_key_anthropic: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Google Gemini API Key (Gemini 2.0 / 1.5)</label>
                <input
                  type="password"
                  value={keys.api_key_gemini}
                  onChange={(e) => setKeys({ ...keys, api_key_gemini: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">DeepSeek API Key (V3, R1)</label>
                <input
                  type="password"
                  value={keys.api_key_deepseek}
                  onChange={(e) => setKeys({ ...keys, api_key_deepseek: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">xAI Grok API Key</label>
                <input
                  type="password"
                  value={keys.api_key_grok}
                  onChange={(e) => setKeys({ ...keys, api_key_grok: e.target.value })}
                  placeholder="xai-..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700 transition"
            >
              Закрыть
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-teal-600/30 transition"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : null}
              {savedSuccess ? "Сохранено!" : "Сохранить настройки"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
