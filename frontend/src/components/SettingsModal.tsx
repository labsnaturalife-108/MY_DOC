"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Check, 
  Server, 
  Key, 
  Cpu, 
  RefreshCw, 
  Sun, 
  Moon, 
  Monitor, 
  Languages, 
  BookOpen, 
  Globe, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ShieldCheck 
} from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshStatus?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onRefreshStatus }) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

  const [medResources, setMedResources] = useState({
    pubmed_enabled: true,
    pubmed_priority: true,
    cochrane_enabled: true,
    uptodate_enabled: true,
    mayo_enabled: true,
    custom_urls: ["https://pubmed.ncbi.nlm.nih.gov/"],
    filter_level: "guidelines_trials",
  });
  const [newUrlInput, setNewUrlInput] = useState("");

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
      if (data.medical_resources_config) {
        try {
          const parsed = JSON.parse(data.medical_resources_config);
          setMedResources((prev) => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
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

  const handleAddCustomUrl = () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;
    if (!medResources.custom_urls.includes(formatted)) {
      setMedResources((prev) => ({
        ...prev,
        custom_urls: [...prev.custom_urls, formatted],
      }));
    }
    setNewUrlInput("");
  };

  const handleRemoveCustomUrl = (urlToRemove: string) => {
    setMedResources((prev) => ({
      ...prev,
      custom_urls: prev.custom_urls.filter((u) => u !== urlToRemove),
    }));
  };

  const handleTestLocal = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.checkLocalServers();
      if (res.lmstudio?.online) {
        setTestResult(
          language === "ru"
            ? `✅ LM Studio обнаружен и работает! Найдено моделей: ${res.lmstudio.models?.length || 0}`
            : `✅ LM Studio detected and running! Models available: ${res.lmstudio.models?.length || 0}`
        );
      } else {
        setTestResult(
          language === "ru"
            ? `⚠️ LM Studio не отвечает по адресу ${lmstudioUrl}. Убедитесь, что сервер включен в LM Studio.`
            : `⚠️ LM Studio is not responding at ${lmstudioUrl}. Ensure server is running in LM Studio.`
        );
      }
      if (onRefreshStatus) onRefreshStatus();
    } catch (err: any) {
      setTestResult((language === "ru" ? "❌ Ошибка проверки: " : "❌ Check failed: ") + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveSetting("url_lmstudio", lmstudioUrl);
      await api.saveSetting("url_ollama", ollamaUrl);
      await api.saveSetting("medical_resources_config", JSON.stringify(medResources));

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
      alert((language === "ru" ? "Ошибка сохранения: " : "Save error: ") + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {language === "ru" ? "Настройки системы" : "System Settings"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {language === "ru" ? "Язык, тема оформления, локальные серверы и API" : "Language, theme, local servers & API keys"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAll} className="space-y-5">
          {/* Section: Language Switcher */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5 mb-1 block">
              <Languages className="w-4 h-4 text-emerald-500" />
              {language === "ru" ? "Язык интерфейса / Interface Language" : "Interface Language / Язык интерфейса"}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage("ru")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  language === "ru"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 shadow-sm font-bold"
                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <span>🇷🇺 Русский (RU)</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  language === "en"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 shadow-sm font-bold"
                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <span>🇬🇧 English (EN)</span>
              </button>
            </div>
          </div>

          {/* Section: Theme Switcher */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5 mb-1 block">
              <Sun className="w-4 h-4 text-amber-500" />
              {language === "ru" ? "Тема интерфейса" : "Color Theme"}
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  theme === "light"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 shadow-sm"
                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                {language === "ru" ? "Светлая" : "Light"}
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  theme === "dark"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 shadow-sm"
                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                {language === "ru" ? "Темная" : "Dark"}
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  theme === "system"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 shadow-sm"
                    : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                {language === "ru" ? "Системная" : "System"}
              </button>
            </div>
          </div>

          {/* Section: Medical Internet Resources & Evidence Base (PubMed) */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t.settings.medicalResources.title}
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t.settings.medicalResources.subtitle}
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 font-semibold">
                NCBI • E-Utilities
              </span>
            </div>

            {/* 1. Primary Evidence Source: PubMed */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              medResources.pubmed_enabled 
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20" 
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-60"
            }`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {t.settings.medicalResources.pubmedTitle}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wider">
                    {t.settings.medicalResources.pubmedBadge}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={medResources.pubmed_enabled}
                    onChange={(e) => setMedResources({ ...medResources, pubmed_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.settings.medicalResources.pubmedDesc}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-emerald-200/50 dark:border-emerald-900/40 pt-2 text-[10px]">
                <a 
                  href="https://pubmed.ncbi.nlm.nih.gov/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                >
                  <span>https://pubmed.ncbi.nlm.nih.gov/</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {language === "ru" ? "Прямой API поиск и ссылки" : "Direct API search & citations"}
                </span>
              </div>
            </div>

            {/* Other Recognized Evidence Resources */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block">
                {language === "ru" ? "Дополнительные медицинские библиотеки:" : "Additional Evidence Resources:"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Cochrane */}
                <div 
                  onClick={() => setMedResources({ ...medResources, cochrane_enabled: !medResources.cochrane_enabled })}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                    medResources.cochrane_enabled
                      ? "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                      : "bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-50"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate text-zinc-900 dark:text-zinc-100">
                      Cochrane Library
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                      {language === "ru" ? "Мета-анализы" : "Meta-analyses"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={medResources.cochrane_enabled}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                {/* UpToDate */}
                <div 
                  onClick={() => setMedResources({ ...medResources, uptodate_enabled: !medResources.uptodate_enabled })}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                    medResources.uptodate_enabled
                      ? "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                      : "bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-50"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate text-zinc-900 dark:text-zinc-100">
                      UpToDate
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                      {language === "ru" ? "Гайдлайны" : "Clinical guidelines"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={medResources.uptodate_enabled}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                {/* Mayo Clinic */}
                <div 
                  onClick={() => setMedResources({ ...medResources, mayo_enabled: !medResources.mayo_enabled })}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                    medResources.mayo_enabled
                      ? "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                      : "bg-zinc-100/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-50"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold block truncate text-zinc-900 dark:text-zinc-100">
                      Mayo Clinic
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                      MedlinePlus
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={medResources.mayo_enabled}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom URLs Input & Tags */}
            <div>
              <label className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium mb-1.5 block">
                {t.settings.medicalResources.customUrlsTitle}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomUrl();
                    }
                  }}
                  placeholder={t.settings.medicalResources.customUrlsPlaceholder}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomUrl}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.settings.medicalResources.addUrlBtn}</span>
                </button>
              </div>

              {medResources.custom_urls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {medResources.custom_urls.map((url) => (
                    <span
                      key={url}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{url}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomUrl(url)}
                        className="text-zinc-400 hover:text-rose-500 transition ml-1"
                        title={language === "ru" ? "Удалить" : "Remove"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Local LM Studio */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                {language === "ru" ? "Локальный LM Studio (Конфиденциально)" : "Local LM Studio (Private & Offline)"}
              </span>
              <button
                type="button"
                onClick={handleTestLocal}
                disabled={testing}
                className="text-[11px] text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 bg-zinc-200/80 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 transition"
              >
                <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                {language === "ru" ? "Проверить связь" : "Test Connection"}
              </button>
            </div>

            <div>
              <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">API Endpoint LM Studio</label>
              <input
                type="text"
                value={lmstudioUrl}
                onChange={(e) => setLmstudioUrl(e.target.value)}
                placeholder="http://localhost:1234/v1"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            {testResult && (
              <p className="text-xs p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                {testResult}
              </p>
            )}
          </div>

          {/* Section: Cloud API Keys */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5 mb-1 block">
              <Key className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              {language === "ru" ? "Облачные API Ключи (Шифруются и сохраняются локально)" : "Cloud API Keys (Encrypted & stored locally)"}
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">OpenAI API Key (GPT-4o)</label>
                <input
                  type="password"
                  value={keys.api_key_openai}
                  onChange={(e) => setKeys({ ...keys, api_key_openai: e.target.value })}
                  placeholder="sk-proj-..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">Anthropic API Key (Claude 3.5 Sonnet)</label>
                <input
                  type="password"
                  value={keys.api_key_anthropic}
                  onChange={(e) => setKeys({ ...keys, api_key_anthropic: e.target.value })}
                  placeholder="sk-ant-..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">Google Gemini & Antigravity API Key</label>
                <input
                  type="password"
                  value={keys.api_key_gemini}
                  onChange={(e) => setKeys({ ...keys, api_key_gemini: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">DeepSeek API Key (V3, R1)</label>
                <input
                  type="password"
                  value={keys.api_key_deepseek}
                  onChange={(e) => setKeys({ ...keys, api_key_deepseek: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 block">xAI Grok API Key</label>
                <input
                  type="password"
                  value={keys.api_key_grok}
                  onChange={(e) => setKeys({ ...keys, api_key_grok: e.target.value })}
                  placeholder="xai-..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs transition"
            >
              {t.common.close}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : null}
              {savedSuccess ? (language === "ru" ? "Сохранено!" : "Saved!") : t.settings.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
