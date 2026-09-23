import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional

DEFAULT_LMSTUDIO_URL = "http://localhost:1234/v1"
DEFAULT_OLLAMA_URL = "http://localhost:11434/v1"

STATIC_CLOUD_MODELS = [
    {"id": "gpt-4o", "name": "OpenAI: GPT-4o", "provider": "openai", "is_local": False},
    {"id": "gpt-4o-mini", "name": "OpenAI: GPT-4o Mini", "provider": "openai", "is_local": False},
    {"id": "claude-3-5-sonnet", "name": "Anthropic: Claude 3.5 Sonnet", "provider": "anthropic", "is_local": False},
    {"id": "gemini-1.5-pro", "name": "Google: Gemini 1.5 Pro", "provider": "gemini", "is_local": False},
    {"id": "gemini-2.0-flash", "name": "Google: Gemini 2.0 Flash", "provider": "gemini", "is_local": False},
    {"id": "deepseek-chat", "name": "DeepSeek: V3", "provider": "deepseek", "is_local": False},
    {"id": "deepseek-reasoner", "name": "DeepSeek: R1 (Reasoning)", "provider": "deepseek", "is_local": False},
    {"id": "grok-2", "name": "xAI: Grok 2", "provider": "grok", "is_local": False},
    {"id": "qwen-2.5-72b", "name": "Qwen: 2.5 72B Instruct", "provider": "qwen", "is_local": False},
    {"id": "demo-doctor", "name": "MY_DOC Demo (Встроенный ассистент)", "provider": "demo", "is_local": True},
]

class LLMHub:
    def __init__(self):
        pass

    async def check_local_status(self, url: str) -> Dict[str, Any]:
        """Checks if local LM Studio or Ollama is responding."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{url.rstrip('/')}/models")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("id") for m in data.get("data", []) if m.get("id")]
                    return {"online": True, "models": models}
        except Exception as e:
            return {"online": False, "error": str(e)}
        return {"online": False, "error": "Unknown status"}

    async def get_models_list(self, lmstudio_url: str = DEFAULT_LMSTUDIO_URL, ollama_url: str = DEFAULT_OLLAMA_URL) -> List[Dict[str, Any]]:
        """Returns dynamic list of models, detecting active LM Studio models first."""
        models_list = []
        
        # 1. Check LM Studio
        lm_status = await self.check_local_status(lmstudio_url)
        if lm_status.get("online") and lm_status.get("models"):
            for m_id in lm_status["models"]:
                # skip embedding-only models in chat dropdown
                if "embed" in m_id.lower():
                    continue
                models_list.append({
                    "id": m_id,
                    "name": f"🟢 LM Studio: {m_id}",
                    "provider": "lmstudio",
                    "is_local": True,
                    "is_online": True
                })
            # Also add auto option
            models_list.append({
                "id": "lmstudio-auto",
                "name": "🟢 LM Studio (Текущая активная модель)",
                "provider": "lmstudio",
                "is_local": True,
                "is_online": True
            })
        else:
            models_list.append({
                "id": "lmstudio-auto",
                "name": "⚪ LM Studio (Локально — офлайн)",
                "provider": "lmstudio",
                "is_local": True,
                "is_online": False
            })

        # 2. Check Ollama
        ollama_status = await self.check_local_status(ollama_url)
        if ollama_status.get("online") and ollama_status.get("models"):
            for m_id in ollama_status["models"]:
                models_list.append({
                    "id": m_id,
                    "name": f"🟢 Ollama: {m_id}",
                    "provider": "ollama",
                    "is_local": True,
                    "is_online": True
                })

        # 3. Add Cloud and Demo models
        models_list.extend(STATIC_CLOUD_MODELS)
        return models_list

    def build_system_prompt(self, patient_profile: Dict[str, Any], context_sources: List[Dict[str, Any]]) -> str:
        """Constructs an informed medical assistant system prompt with patient facts and RAG context."""
        allergies = patient_profile.get("allergies") or "Не указаны"
        chronic = patient_profile.get("chronic_diseases") or "Не указаны"
        meds = patient_profile.get("current_medications") or "Не указаны"
        
        prompt_parts = [
            "Вы — высококвалифицированный персональный медицинский ИИ-ассистент врача и пациента в системе 'MY_DOC'.",
            "Ваша задача: детально анализировать жалобы, предоставленные медицинские документы, бланки лабораторных анализов и литературу.",
            "Отвечайте на русском языке, структурированно, профессионально и понятно для пациента.",
            "",
            "=== КАРТОЧКА ПАЦИЕНТА ===",
            f"ФИО: {patient_profile.get('full_name')}",
            f"Возраст: {patient_profile.get('age', 'Не указан')} лет, Пол: {patient_profile.get('gender', 'Не указан')}",
            f"Рост: {patient_profile.get('height', '—')} см, Вес: {patient_profile.get('weight', '—')} кг, ИМТ: {patient_profile.get('bmi', '—')}",
            f"Группа крови: {patient_profile.get('blood_type', 'Не указана')}",
            f"КРИТИЧЕСКИЕ АЛЛЕРГИИ / НЕПЕРЕНОСИМОСТИ: {allergies}",
            f"Хронические заболевания: {chronic}",
            f"Текущая терапия: {meds}",
            "",
            "=== ПРАВИЛА АНАЛИЗА ===",
            "1. Всегда учитывайте аллергии и текущие препараты пациента. Никогда не рекомендуйте препараты, вызывающие конфликт или аллергию.",
            "2. Внимательно изучите данные из анализов ниже (RAG). Назовите конкретные показатели, их значения, единицы измерения и референсные нормы.",
            "3. Выделите любые отклонения (повышенные или пониженные маркеры) и объясните их клиническое значение.",
            "4. В конце дайте четкие рекомендации и напомните о необходимости очной консультации с врачом.",
        ]

        if context_sources:
            prompt_parts.append("\n=== ДАННЫЕ ИЗ БАЗЫ ЗНАНИЙ И ДОКУМЕНТОВ ПАЦИЕНТА (RAG) ===")
            for idx, source in enumerate(context_sources, start=1):
                doc_name = source.get("filename", "Документ")
                folder = source.get("folder_type", "исследование")
                text = source.get("content", "").strip()
                prompt_parts.append(f"\n[Документ {idx}: {doc_name} ({folder})]:\n{text}")

        return "\n".join(prompt_parts)

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model_id: str,
        provider: str,
        patient_profile: Dict[str, Any],
        context_sources: List[Dict[str, Any]],
        api_keys: Dict[str, str],
        local_urls: Dict[str, str]
    ) -> AsyncGenerator[str, None]:
        """Streams LLM tokens, auto-detecting and routing to local LM Studio if available."""
        system_content = self.build_system_prompt(patient_profile, context_sources)
        full_messages = [{"role": "system", "content": system_content}] + messages

        lmstudio_base = local_urls.get("lmstudio", DEFAULT_LMSTUDIO_URL)

        # AUTO-ROUTING: If user was on demo-doctor or lmstudio, but LM Studio is online, USE LM STUDIO!
        is_lmstudio_target = provider == "lmstudio" or model_id == "lmstudio-auto"
        if not is_lmstudio_target and provider == "demo":
            # Check if LM Studio is secretly online!
            lm_check = await self.check_local_status(lmstudio_base)
            if lm_check.get("online"):
                is_lmstudio_target = True
                provider = "lmstudio"
                if lm_check.get("models"):
                    model_id = lm_check["models"][0]

        # Handle LM Studio or Ollama (OpenAI-compatible)
        if is_lmstudio_target or provider in ["lmstudio", "ollama"]:
            base_url = local_urls.get(provider, lmstudio_base if provider == "lmstudio" else DEFAULT_OLLAMA_URL)
            endpoint = f"{base_url.rstrip('/')}/chat/completions"
            req_model = model_id if model_id not in ["lmstudio-auto", "ollama-med"] else "local-model"
            
            payload = {
                "model": req_model,
                "messages": full_messages,
                "stream": True,
                "temperature": 0.3
            }

            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    async with client.stream("POST", endpoint, json=payload) as response:
                        if response.status_code != 200:
                            err_body = await response.aread()
                            yield f"⚠️ Ошибка ответа локальной модели ({response.status_code}): {err_body.decode('utf-8', errors='ignore')}"
                            return
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    choice = chunk.get("choices", [{}])[0]
                                    delta_obj = choice.get("delta", {})
                                    delta = delta_obj.get("content") or delta_obj.get("reasoning_content") or ""
                                    if delta:
                                        yield delta
                                except Exception:
                                    continue
                return
            except Exception as e:
                yield f"⚠️ Не удалось подключиться к LM Studio по адресу {base_url}.\nУбедитесь, что сервер включен в LM Studio.\n\nТехническая ошибка: {str(e)}"
                return

        # Handle OpenAI / DeepSeek / Grok / Gemini / Qwen (OpenAI standard format)
        openai_providers = {
            "openai": ("https://api.openai.com/v1/chat/completions", api_keys.get("openai")),
            "deepseek": ("https://api.deepseek.com/chat/completions", api_keys.get("deepseek")),
            "grok": ("https://api.x.ai/v1/chat/completions", api_keys.get("grok")),
            "gemini": ("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", api_keys.get("gemini")),
            "qwen": ("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", api_keys.get("qwen")),
        }

        if provider in openai_providers:
            endpoint, api_key = openai_providers[provider]
            if not api_key:
                yield f"⚠️ Для использования модели '{model_id}' требуется API-ключ {provider.upper()}.\nПожалуйста, укажите его в настройках (кнопка '⚙️ Настройки' вверху).\n\nТакже вы можете запустить локальный LM Studio."
                return

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model_id,
                "messages": full_messages,
                "stream": True,
                "temperature": 0.3
            }

            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
                        if response.status_code != 200:
                            err_body = await response.aread()
                            yield f"⚠️ Ошибка API {provider.upper()} ({response.status_code}): {err_body.decode('utf-8', errors='ignore')}"
                            return
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    choice = chunk.get("choices", [{}])[0]
                                    delta_obj = choice.get("delta", {})
                                    delta = delta_obj.get("content") or delta_obj.get("reasoning_content") or ""
                                    if delta:
                                        yield delta
                                except Exception:
                                    continue
                return
            except Exception as e:
                yield f"⚠️ Ошибка связи с API {provider.upper()}: {str(e)}"
                return

        # Fallback / Built-in Demo Medical Assistant (only when truly offline)
        last_user_msg = messages[-1]["content"] if messages else ""
        context_summary = f"В базе найдено {len(context_sources)} релевантных фрагментов документов." if context_sources else "Векторные документы не прикреплены к вопросу."
        
        demo_reply = (
            f"Здравствуйте, {patient_profile.get('full_name')}!\n\n"
            f"Я проанализировал ваш вопрос: «*{last_user_msg}*».\n\n"
            f"**Клинический анализ профиля:**\n"
            f"- Возраст: {patient_profile.get('age', '—')} лет, ИМТ: {patient_profile.get('bmi', '—') or 'в пределах нормы'}\n"
            f"- Учтены аллергии: **{patient_profile.get('allergies') or 'отсутствуют'}**\n"
            f"- Текущая терапия: {patient_profile.get('current_medications') or 'нет назначений'}\n\n"
            f"**Данные RAG:** {context_summary}\n\n"
            f"💡 *Для полноценных клинических ответов выберите в выпадающем списке сверху вашу локальную модель из LM Studio (или настройте API-ключ в настройках).* "
        )
        
        import asyncio
        words = demo_reply.split(" ")
        for i in range(0, len(words), 3):
            yield " ".join(words[i:i+3]) + " "
            await asyncio.sleep(0.04)

llm_hub = LLMHub()
