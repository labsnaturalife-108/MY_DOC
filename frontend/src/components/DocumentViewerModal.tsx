"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  Activity, 
  Sparkles, 
  Loader2, 
  Download, 
  AlertCircle, 
  Eye, 
  CheckCircle2, 
  Calendar, 
  Layers 
} from "lucide-react";
import { DocumentItem, DocumentDetail, api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  document: DocumentItem | null;
  onNavigateToChat?: (prefillQuery?: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  patientId,
  document: docItem,
  onNavigateToChat
}) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"text" | "metrics" | "file">("text");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && docItem) {
      loadDetails(docItem.id);
    } else {
      setDetail(null);
      setError(null);
      setActiveTab("text");
    }
  }, [isOpen, docItem?.id]);

  const loadDetails = async (docId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDocumentDetails(patientId, docId);
      setDetail(data);
      if (!data.extracted_text && (data.file_type === "pdf" || ["png", "jpg", "jpeg", "webp"].includes(data.file_type))) {
        setActiveTab("file");
      } else {
        setActiveTab("text");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (language === "ru" ? "Не удалось загрузить содержимое документа" : "Failed to load document content"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !docItem) return null;

  const fileUrl = api.getDocumentFileUrl(patientId, docItem.id);
  const ext = (docItem.file_type || "").toLowerCase().replace(".", "");
  const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  const handleCopyText = () => {
    if (!detail?.extracted_text) return;
    navigator.clipboard.writeText(detail.extracted_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskDoctor = () => {
    if (!onNavigateToChat) return;
    const query = language === "ru"
      ? `Пожалуйста, сделай подробный профессиональный врачебный разбор документа "${docItem.filename}". Объясни все найденные показатели, отклонения от нормы и клиническое значение для моего состояния.`
      : `Please provide a thorough, professional physician analysis of the document "${docItem.filename}". Explain all detected biomarkers, deviations from reference norms, and clinical relevance for my overall health.`;
    onClose();
    onNavigateToChat(query);
  };

  const formatFileSize = (bytes: number) => {
    const bUnit = language === "ru" ? "Б" : "B";
    const kbUnit = language === "ru" ? "КБ" : "KB";
    const mbUnit = language === "ru" ? "МБ" : "MB";
    if (bytes < 1024) return `${bytes} ${bUnit}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${kbUnit}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${mbUnit}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/90 dark:bg-zinc-900/90 gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 shadow-sm">
              <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate" title={docItem.filename}>
                  {docItem.filename}
                </h3>
                <span className="text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-full shrink-0">
                  {ext || "file"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                <span>{formatFileSize(docItem.file_size)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  {new Date(docItem.created_at).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {language === "ru" ? "Проиндексирован в RAG" : "Indexed in RAG"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              title={language === "ru" ? "Открыть оригинал в новой вкладке" : "Open original in new tab"}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab("text")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "text"
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-200 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {language === "ru" ? "Распознанный текст (OCR / RAG)" : "Extracted Text (OCR / RAG)"}
            </button>

            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "metrics"
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-200 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {language === "ru" ? "Биомаркеры" : "Biomarkers"}
              {detail?.metrics && detail.metrics.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                  {detail.metrics.length}
                </span>
              )}
            </button>

            {(isPdf || isImage) && (
              <button
                onClick={() => setActiveTab("file")}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === "file"
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-200 dark:text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {language === "ru" ? "Оригинал бланка" : "Original File"}
              </button>
            )}
          </div>

          {activeTab === "text" && detail?.extracted_text && (
            <button
              onClick={handleCopyText}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
              title={language === "ru" ? "Скопировать распознанный текст" : "Copy extracted text"}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {language === "ru" ? "Скопировано" : "Copied"}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{language === "ru" ? "Копировать" : "Copy"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-zinc-50/50 dark:bg-zinc-950/20">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.common.loading}</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: EXTRACTED TEXT */}
              {activeTab === "text" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      {language === "ru" 
                        ? "Этот текст извлечён модулем OCR и проиндексирован в базе знаний (ChromaDB) для ИИ." 
                        : "This text was extracted by OCR and vectorized into the ChromaDB RAG knowledge base."}
                    </span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500">
                      {detail?.extracted_text?.length || 0} {language === "ru" ? "симв." : "chars"}
                    </span>
                  </div>

                  {detail?.extracted_text ? (
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 overflow-x-auto text-xs text-zinc-800 dark:text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap selection:bg-zinc-200 dark:selection:bg-zinc-800 shadow-sm">
                      {detail.extracted_text}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                      {language === "ru" 
                        ? "Текстовое содержимое не было распознано или файл пуст." 
                        : "No text content detected or file is empty."}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRACTED BIOMARKERS */}
              {activeTab === "metrics" && (
                <div className="space-y-4">
                  {detail?.metrics && detail.metrics.length > 0 ? (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/80 shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-100 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">{language === "ru" ? "Показатель" : "Biomarker"}</th>
                            <th className="py-2.5 px-4">{t.common.value}</th>
                            <th className="py-2.5 px-4">{t.common.unit}</th>
                            <th className="py-2.5 px-4">{t.common.reference}</th>
                            <th className="py-2.5 px-4">{language === "ru" ? "Статус" : "Status"}</th>
                            <th className="py-2.5 px-4">{t.common.date}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 font-mono">
                          {detail.metrics.map((m) => {
                            const isHigh = m.status === "high" || m.status?.includes("выш") || m.status?.includes("high");
                            const isLow = m.status === "low" || m.status?.includes("низ") || m.status?.includes("low");
                            const isNormal = !isHigh && !isLow;

                            return (
                              <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                                <td className="py-2.5 px-4 font-sans font-medium text-zinc-900 dark:text-zinc-200">
                                  {m.metric_name}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-zinc-950 dark:text-zinc-100">
                                  {m.value}
                                </td>
                                <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                                  {m.unit || "—"}
                                </td>
                                <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                                  {m.reference_min !== null && m.reference_max !== null
                                    ? `${m.reference_min} – ${m.reference_max}`
                                    : m.reference_min !== null
                                    ? `≥ ${m.reference_min}`
                                    : m.reference_max !== null
                                    ? `≤ ${m.reference_max}`
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-4">
                                  {isHigh && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                                      {t.common.high.toUpperCase()}
                                    </span>
                                  )}
                                  {isLow && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                                      {t.common.low.toUpperCase()}
                                    </span>
                                  )}
                                  {isNormal && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                                      {t.common.normal.toUpperCase()}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-zinc-500 text-[11px]">
                                  {m.record_date}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
                      <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {language === "ru" ? "Лабораторные нормы не выделены автоматически" : "No lab biomarkers auto-extracted"}
                      </p>
                      <p className="text-zinc-500">
                        {language === "ru" 
                          ? "Возможно, это инструментальное исследование (УЗИ, ЭКГ) или консультативное заключение. Полный текст доступен на вкладке «Распознанный текст»." 
                          : "This might be an imaging report (Ultrasound, ECG, CT) or medical summary. Raw text is available under 'Extracted Text'."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ORIGINAL FILE */}
              {activeTab === "file" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pb-1">
                    <span>{language === "ru" ? "Оригинал загруженного документа" : "Original uploaded report"}</span>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t.common.download}
                    </a>
                  </div>

                  {isImage && (
                    <div className="bg-zinc-100 dark:bg-zinc-950 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                      <img
                        src={fileUrl}
                        alt={docItem.filename}
                        className="max-h-[520px] w-auto object-contain rounded-xl shadow-sm"
                      />
                    </div>
                  )}

                  {isPdf && (
                    <div className="bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <iframe
                        src={fileUrl}
                        title={docItem.filename}
                        className="w-full h-[520px] border-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            {language === "ru" 
              ? "Данные используются ИИ-ассистентом для генерации персональных заключений." 
              : "Data is utilized by the Medical AI assistant for personalized clinical insights."}
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onNavigateToChat && (
              <button
                onClick={handleAskDoctor}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {language === "ru" ? "Спросить у ИИ об этом анализе" : "Ask AI Doctor about this report"}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white font-medium rounded-xl text-xs transition"
            >
              {t.common.close}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
