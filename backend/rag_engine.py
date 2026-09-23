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

    def delete_document(self, patient_id: int, document_id: int):
        """Removes all indexed chunks of a document."""
        collection_name = self._get_collection_name(patient_id)
        try:
            collection = self.client.get_collection(name=collection_name)
            collection.delete(where={"document_id": document_id})
        except Exception:
            pass

rag_engine = RAGEngine()
