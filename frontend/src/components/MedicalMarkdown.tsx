"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Activity, AlertCircle, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";

interface MedicalMarkdownProps {
  content: string;
}

export const MedicalMarkdown: React.FC<MedicalMarkdownProps> = ({ content }) => {
  // Pre-clean content from any accidental double asterisks or weird artifact tokens
  const cleanContent = content || "";

  return (
    <div className="medical-prose text-zinc-200 text-xs sm:text-sm leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Main headings (H1, H2)
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-zinc-100 mt-4 mb-2 pb-1.5 border-b border-zinc-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{props.children}</span>
            </h1>
          ),
          h2: ({ node, ...props }) => {
            const text = String(props.children);
            const isConclusion = text.toLowerCase().includes("вывод") || text.toLowerCase().includes("заключение");
            const isRecs = text.toLowerCase().includes("рекомендац");

            return (
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 mt-5 mb-2.5 flex items-center gap-2 pb-1 border-b border-zinc-800/80">
                {isConclusion ? (
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                ) : isRecs ? (
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className={isConclusion ? "text-sky-300" : isRecs ? "text-amber-300" : "text-zinc-100"}>
                  {props.children}
                </span>
              </h2>
            );
          },
          // Subheadings (H3, H4) — typically document titles or section breakdowns
          h3: ({ node, ...props }) => {
            const text = String(props.children);
            const isDoc = text.toLowerCase().includes("документ") || text.toLowerCase().includes("анализ");

            return (
              <h3 className={`text-xs sm:text-sm font-bold mt-4 mb-2 flex items-center gap-2 ${
                isDoc ? "text-zinc-100 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-sm" : "text-zinc-200"
              }`}>
                {isDoc && <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                <span>{props.children}</span>
              </h3>
            );
          },
          h4: ({ node, ...props }) => {
            const text = String(props.children);
            const isDoc = text.toLowerCase().includes("документ") || text.toLowerCase().includes("анализ") || text.toLowerCase().includes("исследован");

            return (
              <h4 className={`text-xs sm:text-sm font-semibold mt-3 mb-1.5 flex items-center gap-2 ${
                isDoc
                  ? "text-zinc-100 bg-zinc-950/80 border border-zinc-800/90 px-3 py-1.5 rounded-xl shadow-sm"
                  : "text-zinc-200"
              }`}>
                {isDoc && <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span>{props.children}</span>
              </h4>
            );
          },
          // Paragraphs
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed text-zinc-200">{props.children}</p>
          ),
          // Unordered Lists
          ul: ({ node, ...props }) => (
            <ul className="my-2 space-y-1.5 pl-1">{props.children}</ul>
          ),
          // Ordered Lists
          ol: ({ node, ...props }) => (
            <ol className="my-2 space-y-1.5 list-decimal list-inside pl-1 text-zinc-200">{props.children}</ol>
          ),
          // List Items
          li: ({ node, ...props }) => (
            <li className="flex items-start gap-2 leading-relaxed text-zinc-200">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-2 shrink-0" />
              <div className="flex-1">{props.children}</div>
            </li>
          ),
          // Strong/Bold: Smart Medical Highlighting!
          strong: ({ node, ...props }) => {
            const rawText = String(props.children || "");
            const upper = rawText.toUpperCase();

            // Detect High / Elevated / Risk
            if (
              upper.includes("ПОВЫШЕН") ||
              upper.includes("ВЫСОКИЙ") ||
              upper.includes("ОТКЛОНЕНИЕ") ||
              upper.includes("БЛЯШК") ||
              upper.includes("СТЕНОЗ") ||
              upper.includes("ДИСЛИПИДЕМИ")
            ) {
              return (
                <span className="inline-flex items-center gap-1 font-bold text-rose-300 bg-rose-950/50 border border-rose-800/60 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs">
                  <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{props.children}</span>
                </span>
              );
            }

            // Detect Low / Reduced
            if (
              upper.includes("СНИЖЕН") ||
              upper.includes("НИЗКИЙ") ||
              upper.includes("ДЕФИЦИТ")
            ) {
              return (
                <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{props.children}</span>
                </span>
              );
            }

            // Detect Normal / Safe
            if (
              upper === "НОРМА" ||
              upper.includes("В НОРМЕ") ||
              upper.includes("ОТРИЦАТЕЛЬНО") ||
              upper.includes("БЕЗ ПАТОЛОГИ")
            ) {
              return (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{props.children}</span>
                </span>
              );
            }

            // Standard bold
            return <strong className="font-semibold text-zinc-100">{props.children}</strong>;
          },
          // Horizontal divider
          hr: () => <hr className="my-4 border-t border-zinc-800/90" />,
          // Blockquotes (e.g. key clinical notes)
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2.5 border-l-2 border-zinc-600 bg-zinc-950/60 p-3 rounded-r-xl text-zinc-300 italic text-xs">
              {props.children}
            </blockquote>
          ),
          // Tables if model formats tables
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
              <table className="w-full text-left border-collapse text-xs">
                {props.children}
              </table>
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-300 font-semibold">
              {props.children}
            </thead>
          ),
          th: ({ node, ...props }) => (
            <th className="p-2.5 text-zinc-200 border-r border-zinc-800/50 last:border-r-0">
              {props.children}
            </th>
          ),
          td: ({ node, ...props }) => (
            <td className="p-2.5 border-t border-zinc-800/60 border-r border-zinc-800/40 last:border-r-0 text-zinc-300">
              {props.children}
            </td>
          ),
          // Inline code
          code: ({ node, ...props }) => (
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[11px] text-zinc-200">
              {props.children}
            </code>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
};
