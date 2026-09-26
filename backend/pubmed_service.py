import os
import re
import json
import asyncio
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MyDocClinical/1.0"
}

# Medical terms translator dictionary for high-precision PubMed querying
TERM_MAP = {
    "холестерин": "cholesterol",
    "холестерол": "cholesterol",
    "лпнп": "LDL cholesterol",
    "лпвп": "HDL cholesterol",
    "триглицериды": "triglycerides",
    "статины": "statins lipid lowering",
    "аторвастатин": "atorvastatin",
    "розувастатин": "rosuvastatin",
    "эзетимиб": "ezetimibe",
    "бляшка": "atherosclerotic plaque",
    "бляшки": "carotid plaque atherosclerosis",
    "сонные артерии": "carotid arteries atherosclerosis",
    "стеноз": "arterial stenosis",
    "давление": "blood pressure hypertension",
    "гипертония": "hypertension guidelines",
    "давления": "hypertension",
    "мочевая кислота": "uric acid hyperuricemia gout",
    "подагра": "gout hyperuricemia",
    "креатинин": "creatinine kidney disease",
    "скф": "eGFR chronic kidney disease",
    "egfr": "eGFR kidney function",
    "мочевина": "blood urea nitrogen BUN",
    "белок в моче": "proteinuria kidney",
    "гемоглобин": "hemoglobin anemia",
    "анемия": "anemia iron deficiency",
    "ферритин": "ferritin iron deficiency",
    "железо": "iron deficiency therapy",
    "сахар": "blood glucose diabetes",
    "глюкоза": "fasting glucose diabetes",
    "гликированный": "glycated hemoglobin HbA1c diabetes",
    "диабет": "type 2 diabetes guidelines",
    "метформин": "metformin",
    "инсулин": "insulin resistance",
    "ттг": "TSH thyroid hypothyroidism",
    "тиреотропный": "thyrotropin TSH",
    "щитовидная": "thyroid disease",
    "пса": "prostate specific antigen PSA",
    "простата": "prostate health",
    "витамин d": "vitamin D deficiency supplementation",
    "печень": "liver function steatosis NAFLD",
    "алт": "ALT liver transaminase",
    "аст": "AST liver enzyme",
    "билирубин": "bilirubin jaundice",
    "срб": "C-reactive protein CRP inflammation",
    "соэ": "erythrocyte sedimentation rate ESR",
    "тромбоциты": "platelets thrombocytopenia thrombocytosis",
    "лейкоциты": "white blood cells leukocytosis",
    "узи": "ultrasound imaging findings",
    "питание": "clinical nutrition dietary guidelines",
    "диета": "dietary intervention lifestyle",
    "омега-3": "omega 3 fatty acids cardiovascular",
    "инфаркт": "myocardial infarction prevention",
    "инсульт": "stroke prevention ASCVD",
    "атеросклероз": "atherosclerosis cardiovascular prevention",
    "риск": "cardiovascular risk prevention guidelines",
    "prevent": "AHA PREVENT cardiovascular risk equation",
}

class PubMedService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 3600  # 1 hour

    def extract_search_terms(self, user_query: str, patient_profile: Optional[Dict[str, Any]] = None) -> str:
        """
        Translates and combines user query and clinical context into focused PubMed MeSH keywords.
        """
        q_lower = user_query.lower()
        extracted_terms = []

        # 1. Match from dictionary
        for ru_term, en_term in TERM_MAP.items():
            if ru_term in q_lower:
                extracted_terms.append(en_term)

        # 2. Add existing English words/biomarkers if found in query
        latin_words = re.findall(r"\b[A-Za-z]{3,}\b", user_query)
        for lw in latin_words:
            lw_lower = lw.lower()
            if lw_lower not in ["the", "and", "for", "with", "from", "what", "how", "are"]:
                extracted_terms.append(lw)

        # 3. If query is very specific and matched terms, combine them
        if extracted_terms:
            # Dedup and pick top 3 most relevant terms
            unique_terms = list(dict.fromkeys(extracted_terms))[:3]
            search_query = " AND ".join(unique_terms)
        else:
            # Fallback to general terms from patient profile if available
            chronic = (patient_profile.get("chronic_diseases") or "").lower() if patient_profile else ""
            if "атеросклероз" in chronic or "стеноз" in chronic or "гипертон" in chronic:
                search_query = "atherosclerosis cardiovascular risk prevention statins"
            elif "диабет" in chronic:
                search_query = "type 2 diabetes clinical management guidelines"
            else:
                search_query = "cardiovascular prevention clinical guidelines"

        return search_query

    def search_pubmed_sync(self, search_query: str, max_results: int = 4) -> List[Dict[str, Any]]:
        """
        Executes synchronous NCBI PubMed E-Utilities search and returns rich article metadata.
        """
        if not search_query.strip():
            return []

        # Check cache
        cache_key = f"{search_query}_{max_results}"
        if cache_key in self._cache:
            return self._cache[cache_key]["results"]

        try:
            # 1. Search for PMIDs with preference for guidelines/reviews/clinical trials
            term_encoded = urllib.parse.quote_plus(
                f"({search_query}) AND (guideline[pt] OR review[pt] OR clinical trial[pt] OR meta-analysis[pt] OR 2021:2026[dp])"
            )
            esearch_url = (
                f"{NCBI_BASE}/esearch.fcgi?db=pubmed&term={term_encoded}"
                f"&retmode=json&retmax={max_results}&sort=pub_date&tool=mydoc_ai&email=support@mydoc.local"
            )

            req = urllib.request.Request(esearch_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=6) as response:
                search_data = json.loads(response.read().decode("utf-8"))

            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            if not id_list:
                # Retry without restrictive publication type filters
                term_fallback = urllib.parse.quote_plus(search_query)
                esearch_url_fallback = (
                    f"{NCBI_BASE}/esearch.fcgi?db=pubmed&term={term_fallback}"
                    f"&retmode=json&retmax={max_results}&sort=pub_date&tool=mydoc_ai&email=support@mydoc.local"
                )
                req_fallback = urllib.request.Request(esearch_url_fallback, headers=HEADERS)
                with urllib.request.urlopen(req_fallback, timeout=6) as resp_fallback:
                    search_data_fb = json.loads(resp_fallback.read().decode("utf-8"))
                id_list = search_data_fb.get("esearchresult", {}).get("idlist", [])

            if not id_list:
                return []

            # 2. Fetch Summaries via esummary.fcgi
            pmids_str = ",".join(id_list)
            esummary_url = (
                f"{NCBI_BASE}/esummary.fcgi?db=pubmed&id={pmids_str}&retmode=json&tool=mydoc_ai&email=support@mydoc.local"
            )

            req_sum = urllib.request.Request(esummary_url, headers=HEADERS)
            with urllib.request.urlopen(req_sum, timeout=6) as resp_sum:
                sum_data = json.loads(resp_sum.read().decode("utf-8"))

            articles = []
            results_dict = sum_data.get("result", {})
            for pmid in id_list:
                item = results_dict.get(pmid)
                if not item or not isinstance(item, dict):
                    continue

                title = item.get("title", "").strip().rstrip(".")
                source = item.get("source", "NCBI PubMed")
                pubdate = item.get("pubdate", "")
                authors_list = [a.get("name", "") for a in item.get("authors", []) if a.get("name")]
                authors_str = ", ".join(authors_list[:3]) + (" et al." if len(authors_list) > 3 else "")

                articles.append({
                    "pmid": pmid,
                    "title": title,
                    "journal": source,
                    "pub_date": pubdate,
                    "authors": authors_str,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "abstract": ""
                })

            # 3. Fetch abstracts via efetch.fcgi for top 2 articles
            if articles:
                try:
                    top_pmids = ",".join([a["pmid"] for a in articles[:2]])
                    efetch_url = f"{NCBI_BASE}/efetch.fcgi?db=pubmed&id={top_pmids}&retmode=xml&tool=mydoc_ai&email=support@mydoc.local"
                    req_fetch = urllib.request.Request(efetch_url, headers=HEADERS)
                    with urllib.request.urlopen(req_fetch, timeout=6) as resp_fetch:
                        xml_content = resp_fetch.read()
                        root = ET.fromstring(xml_content)
                        for article_elem in root.findall(".//PubmedArticle"):
                            pmid_elem = article_elem.find(".//PMID")
                            if pmid_elem is not None and pmid_elem.text:
                                cur_pmid = pmid_elem.text
                                abstract_texts = [
                                    elem.text for elem in article_elem.findall(".//AbstractText") if elem.text
                                ]
                                if abstract_texts:
                                    full_abs = " ".join(abstract_texts).strip()
                                    for a in articles:
                                        if a["pmid"] == cur_pmid:
                                            a["abstract"] = full_abs[:500] + ("..." if len(full_abs) > 500 else "")
                except Exception as ex:
                    # Abstract fetching is best-effort; title & metadata are still valid
                    print(f"[PubMed efetch warning]: {ex}")

            self._cache[cache_key] = {"results": articles}
            return articles

        except Exception as e:
            print(f"[PubMed Search Error]: {e}")
            return []

    async def search_pubmed(self, user_query: str, patient_profile: Optional[Dict[str, Any]] = None, max_results: int = 3) -> List[Dict[str, Any]]:
        """
        Async wrapper around search_pubmed_sync.
        """
        search_terms = self.extract_search_terms(user_query, patient_profile)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.search_pubmed_sync, search_terms, max_results)

pubmed_service = PubMedService()
