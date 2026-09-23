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
  Loader2
} from "lucide-react";
import { Patient, Folder, DocumentItem, api } from "@/lib/api";

interface DocumentFoldersProps {
  patient: Patient;
  onRefreshLabs?: () => void;
}

export const DocumentFolders: React.FC<DocumentFoldersProps> = ({ patient, onRefreshLabs }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

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
    const file = e.target.files?.[0];
    if (!file || !selectedFolderId) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const res = await api.uploadDocument(patient.id, file, selectedFolderId);
      setUploadResult(
        `✅ Файл "${res.filename}" успешно векторизован в ChromaDB` +
        (res.extracted_metrics_count > 0 ? ` • Извлечено биомаркеров: ${res.extracted_metrics_count}` : "")
      );
      // Reload docs
      const dList = await api.getDocuments(patient.id, selectedFolderId);
      setDocuments(dList);
      if (onRefreshLabs && res.extracted_metrics_count > 0) {
        onRefreshLabs();
      }
    } catch (err) {
      alert("Ошибка загрузки файла: " + err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Удалить этот документ и его векторные данные?")) return;
    try {
      await api.deleteDocument(patient.id, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      alert("Ошибка удаления: " + err);
    }
  };

  const getFolderIcon = (ftype: string) => {
    switch (ftype) {
      case "analyses":
        return <TestTube2 className="w-4 h-4 text-zinc-300" />;
      case "researches":
        return <Microscope className="w-4 h-4 text-zinc-300" />;
      case "notes":
        return <ClipboardList className="w-4 h-4 text-zinc-300" />;
      case "knowledge_base":
        return <BookOpen className="w-4 h-4 text-zinc-300" />;
      default:
        return <FolderOpen className="w-4 h-4 text-zinc-300" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
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
                  ? "bg-zinc-900 border-zinc-600 shadow-md"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-zinc-800' : 'bg-zinc-850'}`}>
                  {getFolderIcon(f.folder_type)}
                </div>
                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono">
                  {f.doc_count || 0}
                </span>
              </div>
              <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                {f.name}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {f.folder_type === "knowledge_base" ? "Статьи, книги, протоколы" : "Медицинские данные"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Upload Banner */}
      <div className="bg-zinc-900 border border-dashed border-zinc-750 hover:border-zinc-500 rounded-2xl p-6 text-center transition relative">
        <input
          type="file"
          id="file-upload-input"
          onChange={handleFileUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept=".pdf,.txt,.md,.csv,.doc,.docx"
        />
        <div className="flex flex-col items-center justify-center pointer-events-none">
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-zinc-300 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-100">Векторизация и извлечение данных...</p>
              <p className="text-xs text-zinc-400 mt-1">
                Генерируются эмбеддинги для RAG и распознаются лабораторные биомаркеры
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 mb-3 shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-200">
                Перетащите файл или нажмите для загрузки
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Поддерживаются PDF, TXT, MD. Файл автоматически попадет в векторную базу ChromaDB для ИИ
              </p>
            </>
          )}
        </div>
      </div>

      {uploadResult && (
        <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-300 shrink-0" />
          <span>{uploadResult}</span>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            Документы в текущей папке ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            В этой папке пока нет файлов. Загрузите PDF-анализ или статью выше.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex items-center justify-between hover:bg-zinc-800/40 transition group"
              >
                <div className="flex items-center space-x-3.5 truncate">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                    Векторизован в RAG
                  </span>

                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                    title="Удалить файл"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
