"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderOpen, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  BookOpen, 
  Microscope, 
  TestTube2, 
  ClipboardList,
  Sparkles,
  Loader2,
  Eye
} from "lucide-react";
import { Patient, Folder, DocumentItem, api } from "@/lib/api";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { useLanguage } from "@/context/LanguageContext";

interface DocumentFoldersProps {
  patient: Patient;
  onRefreshLabs?: () => void;
  onNavigateToChat?: (prefillQuery?: string) => void;
}

export const DocumentFolders: React.FC<DocumentFoldersProps> = ({ patient, onRefreshLabs, onNavigateToChat }) => {
  const { language, t } = useLanguage();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);

  const loadFoldersAndDocs = async () => {
    try {
      setLoading(true);
      const fList = await api.getFolders(patient.id);
      setFolders(fList);

      const activeFId = selectedFolderId || (fList.length > 0 ? fList[0].id : null);
      if (activeFId) {
        setSelectedFolderId(activeFId);
        const dList = await api.getDocuments(patient.id, activeFId);
        setDocuments(dList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoldersAndDocs();
  }, [patient.id]);

  const handleSelectFolder = async (fId: number) => {
    setSelectedFolderId(fId);
    try {
      const dList = await api.getDocuments(patient.id, fId);
      setDocuments(dList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const targetFolderId = selectedFolderId || (folders.length > 0 ? folders[0].id : null);
    if (!targetFolderId) {
      alert(language === "ru" ? "Пожалуйста, сначала выберите папку для документов" : "Please select a target folder first");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadResult(null);

    let successCount = 0;
    let totalExtractedMetrics = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({
          current: i + 1,
          total: files.length,
          filename: file.name
        });

        try {
          const res = await api.uploadDocument(patient.id, file, targetFolderId);
          successCount++;
          if (res.extracted_metrics_count) {
            totalExtractedMetrics += res.extracted_metrics_count;
          }
        } catch (err: any) {
          console.error(`Error uploading ${file.name}:`, err);
          errors.push(`${file.name}: ${err.message || String(err)}`);
        }
      }

      if (files.length === 1 && successCount === 1) {
        const successMsg = language === "ru"
          ? `✅ Файл "${files[0].name}" успешно векторизован в ChromaDB` +
            (totalExtractedMetrics > 0 ? ` • Извлечено биомаркеров: ${totalExtractedMetrics}` : "")
          : `✅ File "${files[0].name}" successfully vectorized in ChromaDB` +
            (totalExtractedMetrics > 0 ? ` • Extracted biomarkers: ${totalExtractedMetrics}` : "");
        setUploadResult(successMsg);
      } else if (successCount > 0) {
        const successMsg = language === "ru"
          ? `✅ Успешно загружено и векторизовано файлов: ${successCount} из ${files.length}` +
            (totalExtractedMetrics > 0 ? ` • Извлечено биомаркеров: ${totalExtractedMetrics}` : "") +
            (errors.length > 0 ? ` ⚠️ (Ошибок: ${errors.length})` : "")
          : `✅ Successfully uploaded & vectorized ${successCount} of ${files.length} files` +
            (totalExtractedMetrics > 0 ? ` • Extracted biomarkers: ${totalExtractedMetrics}` : "") +
            (errors.length > 0 ? ` ⚠️ (${errors.length} failed)` : "");
        setUploadResult(successMsg);
      }

      if (errors.length > 0 && successCount === 0) {
        alert(
          (language === "ru" ? "Ошибка загрузки файлов:\n" : "Files upload error:\n") +
          errors.join("\n")
        );
      }

      // Refresh documents and folder counters
      const [updatedDocs, updatedFolders] = await Promise.all([
        api.getDocuments(patient.id, targetFolderId),
        api.getFolders(patient.id)
      ]);
      setDocuments(updatedDocs);
      setFolders(updatedFolders);

      if (onRefreshLabs && totalExtractedMetrics > 0) {
        onRefreshLabs();
      }
    } catch (err: any) {
      alert((language === "ru" ? "Ошибка при обработке файлов: " : "Error processing files: ") + (err.message || err));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm(t.folders.deleteConfirm)) return;
    try {
      await api.deleteDocument(patient.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      const fList = await api.getFolders(patient.id);
      setFolders(fList);
    } catch (err: any) {
      alert((language === "ru" ? "Ошибка удаления: " : "Delete error: ") + (err.message || err));
    }
  };

  const getFolderIcon = (ftype: string) => {
    switch (ftype) {
      case "analyses":
        return <TestTube2 className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
      case "researches":
        return <Microscope className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
      case "notes":
        return <ClipboardList className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
      case "knowledge_base":
        return <BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
      default:
        return <FolderOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
    }
  };

  const getFolderDisplayName = (f: Folder) => {
    if (language === "ru") return f.name;
    switch (f.folder_type) {
      case "analyses":
        return "Lab Reports";
      case "researches":
        return "Diagnostic Imaging";
      case "notes":
        return "Clinical Notes";
      case "knowledge_base":
        return "Medical Knowledge";
      default:
        return f.name;
    }
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Folder selector cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => handleSelectFolder(f.id)}
              className={`p-4 rounded-2xl text-left border transition relative overflow-hidden ${
                isSelected
                  ? "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 shadow-sm"
                  : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-200/60 dark:bg-zinc-800'}`}>
                  {getFolderIcon(f.folder_type)}
                </div>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-zinc-700">
                  {f.doc_count || 0}
                </span>
              </div>
              <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {getFolderDisplayName(f)}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {f.folder_type === "knowledge_base" 
                  ? (language === "ru" ? "Статьи, книги, протоколы" : "Articles, guidelines, books") 
                  : (language === "ru" ? "Медицинские данные" : "Clinical health data")}
              </p>
            </button>
          );
        })}
      </div>

      {/* Upload Banner */}
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => setIsDragOver(false)}
        className={`bg-white dark:bg-zinc-900 border-2 border-dashed rounded-2xl p-6 text-center transition-all relative shadow-sm ${
          isDragOver 
            ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 scale-[1.005]" 
            : "border-zinc-300 dark:border-zinc-750 hover:border-zinc-400 dark:hover:border-zinc-500"
        }`}
      >
        <input
          type="file"
          id="file-upload-input"
          multiple
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp,.txt,.md,.csv,.doc,.docx,image/*,application/pdf"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {uploadProgress && uploadProgress.total > 1
                  ? (language === "ru"
                      ? `Загрузка и обработка: ${uploadProgress.current} из ${uploadProgress.total}`
                      : `Uploading and processing: ${uploadProgress.current} of ${uploadProgress.total}`)
                  : t.folders.uploading}
              </p>
              {uploadProgress && (
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1 max-w-md truncate">
                  {uploadProgress.filename}
                </p>
              )}
              {uploadProgress && uploadProgress.total > 1 && (
                <div className="w-56 bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                {language === "ru" 
                  ? "Генерируются эмбеддинги для RAG и распознаются лабораторные биомаркеры" 
                  : "Generating RAG vector embeddings & extracting lab biomarkers"}
              </p>
            </>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-sm transition-all duration-200 ${
                isDragOver 
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 scale-110" 
                  : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300"
              }`}>
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {t.folders.dropzoneTitle}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {t.folders.dropzoneHint}
              </p>
            </>
          )}
        </div>
      </div>

      {uploadResult && (
        <div className="p-3 bg-emerald-50 dark:bg-zinc-900 border border-emerald-200 dark:border-zinc-700 rounded-xl text-xs text-emerald-800 dark:text-zinc-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-zinc-300 shrink-0" />
          <span>{uploadResult}</span>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            {t.folders.fileList} ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs">
            {t.folders.noFiles}
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group"
              >
                <div className="flex items-center space-x-3.5 truncate">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-950 dark:group-hover:text-white transition">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US")}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 shrink-0">
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white text-xs font-medium border border-zinc-200 dark:border-zinc-700/80 transition shadow-sm"
                    title={t.folders.viewContent}
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300" />
                    <span>{t.folders.viewContent}</span>
                  </button>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-zinc-400" />
                    {language === "ru" ? "Векторизован в RAG" : "Vectorized in RAG"}
                  </span>

                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-2 text-zinc-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-lg transition"
                    title={t.folders.deleteFile}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Content & File Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        patientId={patient.id}
        document={viewingDoc}
        onNavigateToChat={onNavigateToChat}
      />
    </div>
  );
};
