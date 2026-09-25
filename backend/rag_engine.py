import os
import chromadb
from typing import List, Dict, Any, Optional

CHROMA_DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "chroma")
os.makedirs(CHROMA_DATA_DIR, exist_ok=True)

class RAGEngine:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)

    def _get_collection_name(self, patient_id: int) -> str:
        return f"patient_{patient_id}"

    def index_document(self, patient_id: int, document_id: int, filename: str, folder_type: str, text: str):
        """Splits document text into overlapping chunks and stores in ChromaDB."""
        if not text or len(text.strip()) == 0:
            return

        collection_name = self._get_collection_name(patient_id)
        collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": f"Medical and research documents for patient {patient_id}"}
        )

        # Chunking: ~600 chars with 100 overlap
        chunk_size = 600
        overlap = 100
        chunks = []
        metadatas = []
        ids = []

        start = 0
        chunk_idx = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(chunk_text)
                metadatas.append({
                    "patient_id": patient_id,
                    "document_id": document_id,
                    "filename": filename,
                    "folder_type": folder_type,
                    "chunk_index": chunk_idx
                })
                ids.append(f"doc_{document_id}_chunk_{chunk_idx}")
                chunk_idx += 1
            start += chunk_size - overlap

        if chunks:
            # First remove existing chunks for this document if any
            try:
                collection.delete(where={"document_id": document_id})
            except Exception:
                pass
            collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )

    def search_context(self, patient_id: int, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Retrieves relevant chunks for a patient query."""
        collection_name = self._get_collection_name(patient_id)
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception:
            return []

        count = collection.count()
        if count == 0:
            return []

        limit = min(n_results, count)
        results = collection.query(
            query_texts=[query],
            n_results=limit
        )

        formatted = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results and results["distances"] else [0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                formatted.append({
                    "content": doc,
                    "filename": meta.get("filename", "Неизвестный документ"),
                    "folder_type": meta.get("folder_type", "general"),
                    "document_id": meta.get("document_id"),
                    "distance": dist
                })
        return formatted

    def get_patient_context(
        self,
        patient_id: int,
        query: str,
        db_documents: List[Any],
        folders_map: Optional[Dict[int, str]] = None,
        max_total_chars: int = 40000
    ) -> List[Dict[str, Any]]:
        """
        Smart medical context retriever.
        Guarantees all patient analyses and medical reports are included.
        If total text <= max_total_chars, includes full text of all documents with relevant ones prioritized.
        If total text > max_total_chars, performs balanced cross-document retrieval.
        """
        if not db_documents:
            return []

        folders_map = folders_map or {}
        q_lower = (query or "").lower()

        is_analyses_intent = any(w in q_lower for w in [
            "анализ", "лаборатор", "кров", "моч", "холестерин", "липид", "ферритин",
            "биомаркер", "показател", "отклонен", "норма", "результат", "глюкоз", "ттг"
        ])
        is_researches_intent = any(w in q_lower for w in [
            "узи", "исследован", "сосуд", "артери", "эхо", "мрт", "кт", "рентген", "блях"
        ])

        relevant_docs = []
        other_docs = []

        for doc in db_documents:
            text = (doc.extracted_text or "").strip()
            if not text:
                continue

            folder_name = folders_map.get(doc.folder_id, "Документы")
            folder_type = getattr(doc, "folder_type", None)
            if not folder_type and hasattr(doc, "folder") and doc.folder:
                folder_type = doc.folder.folder_type

            if not folder_type:
                f_name_lower = folder_name.lower()
                if "анализ" in f_name_lower:
                    folder_type = "analyses"
                elif "исследован" in f_name_lower:
                    folder_type = "researches"
                elif "выписк" in f_name_lower:
                    folder_type = "extracts"
                else:
                    folder_type = "knowledge_base"

            doc_info = {
                "document_id": doc.id,
                "filename": doc.filename,
                "folder_type": folder_type,
                "folder_name": folder_name,
                "content": text,
                "char_count": len(text)
            }

            if is_analyses_intent and folder_type == "analyses":
                relevant_docs.append(doc_info)
            elif is_researches_intent and folder_type == "researches":
                relevant_docs.append(doc_info)
            else:
                other_docs.append(doc_info)

        all_ordered = relevant_docs + other_docs
        total_chars = sum(d["char_count"] for d in all_ordered)

        # Strategy 1: All documents fit comfortably in context
        if total_chars <= max_total_chars:
            sources = []
            for d in all_ordered:
                sources.append({
                    "filename": d["filename"],
                    "folder_type": d["folder_type"],
                    "document_id": d["document_id"],
                    "content": d["content"],
                    "distance": 0.0
                })
            return sources

        # Strategy 2: Very large document collection -> Balanced Cross-Document Retrieval
        collection_name = self._get_collection_name(patient_id)
        chroma_chunks = []
        try:
            collection = self.client.get_collection(name=collection_name)
            count = collection.count()
            if count > 0:
                res = collection.query(query_texts=[query], n_results=min(25, count))
                if res and res.get("documents"):
                    docs = res["documents"][0]
                    metas = res.get("metadatas", [[]])[0]
                    dists = res.get("distances", [[]])[0]
                    for doc_chunk, meta, dist in zip(docs, metas, dists):
                        chroma_chunks.append({
                            "document_id": meta.get("document_id"),
                            "filename": meta.get("filename"),
                            "folder_type": meta.get("folder_type", "analyses"),
                            "content": doc_chunk,
                            "distance": dist
                        })
        except Exception:
            pass

        doc_chunks_map = {}
        for ch in chroma_chunks:
            did = ch.get("document_id")
            if did not in doc_chunks_map:
                doc_chunks_map[did] = []
            doc_chunks_map[did].append(ch)

        assembled_sources = []
        current_len = 0
        for d in all_ordered:
            did = d["document_id"]
            if did in doc_chunks_map:
                for ch in doc_chunks_map[did][:2]:
                    if current_len + len(ch["content"]) <= max_total_chars:
                        assembled_sources.append(ch)
                        current_len += len(ch["content"])
            else:
                snippet = d["content"][:1000]
                if current_len + len(snippet) <= max_total_chars:
                    assembled_sources.append({
                        "document_id": did,
                        "filename": d["filename"],
                        "folder_type": d["folder_type"],
                        "content": snippet,
                        "distance": 0.5
                    })
                    current_len += len(snippet)

        return assembled_sources if assembled_sources else self.search_context(patient_id, query, n_results=10)

    def delete_document(self, patient_id: int, document_id: int):
        """Removes all indexed chunks of a document."""
        collection_name = self._get_collection_name(patient_id)
        try:
            collection = self.client.get_collection(name=collection_name)
            collection.delete(where={"document_id": document_id})
        except Exception:
            pass

rag_engine = RAGEngine()
