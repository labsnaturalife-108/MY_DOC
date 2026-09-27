import json
import httpx
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional

DEFAULT_LMSTUDIO_URL = "http://localhost:1234/v1"
DEFAULT_OLLAMA_URL = "http://localhost:11434/v1"

STATIC_CLOUD_MODELS = [
    {"id": "gpt-4o", "name": "OpenAI: GPT-4o", "provider": "openai", "is_local": False},
    {"id": "gpt-4o-mini", "name": "OpenAI: GPT-4o Mini", "provider": "openai", "is_local": False},
    {"id": "claude-3-5-sonnet", "name": "Anthropic: Claude 3.5 Sonnet", "provider": "anthropic", "is_local": False},
    {"id": "gemini-3.8-flash", "name": "Google: Gemini 3.8 Flash (Рекомендуется)", "provider": "gemini", "is_local": False},
    {"id": "gemini-3.5-flash-lite", "name": "Google: Gemini 3.5 Flash Lite", "provider": "gemini", "is_local": False},
    {"id": "gemini-3.1-flash-lite", "name": "Google: Gemini 3.1 Flash Lite", "provider": "gemini", "is_local": False},
    {"id": "gemini-2.5-flash-lite", "name": "Google: Gemini 2.5 Flash Lite", "provider": "gemini", "is_local": False},
    {"id": "gemini-flash-latest", "name": "Google: Gemini Flash Latest", "provider": "gemini", "is_local": False},
    {"id": "antigravity", "name": "Google: Antigravity Agent (Preview)", "provider": "antigravity", "is_local": False},
    {"id": "deepseek-chat", "name": "DeepSeek: V3", "provider": "deepseek", "is_local": False},
    {"id": "deepseek-reasoner", "name": "DeepSeek: R1 (Reasoning)", "provider": "deepseek", "is_local": False},
    {"id": "grok-2", "name": "xAI: Grok 2", "provider": "grok", "is_local": False},
    {"id": "qwen-2.5-72b", "name": "Qwen: 2.5 72B Instruct", "provider": "qwen", "is_local": False},
    {"id": "demo-doctor", "name": "MY_DOC Demo (Встроенный ассистент)", "provider": "demo", "is_local": True},
]

AVAILABLE_MODELS = STATIC_CLOUD_MODELS

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

    def build_system_prompt(
        self,
        patient_profile: Dict[str, Any],
        context_sources: List[Dict[str, Any]],
        pubmed_sources: Optional[List[Dict[str, Any]]] = None,
        medical_resources_config: Optional[Dict[str, Any]] = None
    ) -> str:
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
            "=== ПРАВИЛА АНАЛИЗА И ОФОРМЛЕНИЯ ===",
            "1. В блоке RAG ниже представлены ВСЕ загруженные медицинские документы пациента (лабораторные анализы, УЗИ, выписки). Вы ОБЯЗАНЫ последовательно и детально изучить КАЖДЫЙ из представленных документов!",
            "2. Если у пациента загружено несколько бланков (например, общий анализ крови, липидный профиль/холестерин, ферритин, УЗИ сосудов), обязательно разберите результаты КАЖДОГО документа, а не только первого.",
            "3. Никогда не заявляйте, что вы не можете просматривать изображения или файлы — все их содержимое уже извлечено для вас текстом через OCR.",
            "4. Для общих медицинских консультаций и анализа жалоб оформляйте ответ структурированно, как заключение экспертного врача:",
            "   - Используйте основные разделы: '## 1. Детальный разбор анализов', '## 2. Клиническое заключение и риски', '## 3. Практические рекомендации'.",
            "   - Для каждого бланка используйте подзаголовок: '### Документ: [Название и дата]'.",
            "   - Для показателей с отклонениями явно указывайте статус жирным шрифтом: **ПОВЫШЕН**, **СНИЖЕН** или **В НОРМЕ** с численной величиной и референсом лаборатории.",
            "   - Для опасных находок (например, бляшки, стеноз артерий) используйте выделение: **ОТКЛОНЕНИЕ / ВНИМАНИЕ**.",
            "5. Избегайте лишних технических символов, сырых кодов и хаотичных знаков. Используйте аккуратные списки и жирный шрифт для важных диагнозов, маркеров и цифр.",
            "6. Всегда учитывайте аллергии, возраст и текущую терапию пациента.",
            "7. ВАЖНЕЙШЕЕ ПРАВИЛО ДЛЯ СОСТАВЛЕНИЯ МЕНЮ И РАЦИОНА ПИТАНИЯ:",
            "   - Если запрос пациента посвящён составлению меню, диеты, рациона питания или блюд на неделю:",
            "   - СТРОЖАЙШЕ ЗАПРЕЩЕНО составлять 'Экспертное медицинское заключение', делать 'Детальный разбор анализов' или выводить списки медицинских рисков и патологий!",
            "   - Пациенту нужно готовое прикладное меню! СРАЗУ начинайте ответ с заголовка меню и расписания по дням недели (Понедельник — Воскресенье: Завтрак, Обед, Ужин, Перекус).",
            "   - Все клинические ограничения (глюкоза, холестерин, мочевая кислота, СКФ) учитывайте непосредственно в подборе разрешённых блюд и ингредиентов, БЕЗ пространных медицинских заключений.",
        ]

        prevent = patient_profile.get("prevent_risk")
        if prevent and isinstance(prevent, dict):
            inp = prevent.get("inputs_used", {})
            prompt_parts.extend([
                "",
                "=== ОФИЦИАЛЬНЫЙ РАСЧЕТ РИСКА AHA PREVENT™ (2023–2024) ===",
                f"- 10-летний суммарный сердечно-сосудистый риск (Total CVD): **{prevent.get('cvd_10yr', '—')}%**",
                f"- 10-летний риск атеросклеротических осложнений (ASCVD: инфаркт, инсульт): **{prevent.get('ascvd_10yr', '—')}%**",
                f"- 10-летний риск сердечной недостаточности (Heart Failure): **{prevent.get('heart_failure_10yr', '—')}%**",
            ])
            if prevent.get("cvd_30yr"):
                prompt_parts.append(f"- 30-летний суммарный риск ССЗ: **{prevent.get('cvd_30yr')}%**")
            if prevent.get("ascvd_30yr"):
                prompt_parts.append(f"- 30-летний риск атеросклеротических осложнений (ASCVD): **{prevent.get('ascvd_30yr')}%**")
            
            prompt_parts.extend([
                f"- Категория риска по AHA/ACC: **{prevent.get('risk_category', '—')}** ({prevent.get('risk_badge', '')})",
                f"- Исходные клинические параметры для расчета: Возраст {inp.get('age')}, Пол {inp.get('sex')}, Общий холестерин {inp.get('total_cholesterol_mmol')} ммоль/л ({inp.get('total_cholesterol_mg')} мг/дл), ЛПВП {inp.get('hdl_cholesterol_mmol')} ммоль/л, Систолическое АД {inp.get('systolic_bp')} мм рт. ст., ИМТ {inp.get('bmi')}, СКФ (eGFR) {inp.get('egfr')} мл/мин/1.73м², Диабет: {'Да' if inp.get('has_diabetes') else 'Нет'}, Курение: {'Да' if inp.get('current_smoker') else 'Нет'}, Гипотензивные препараты: {'Да' if inp.get('on_htn_meds') else 'Нет'}, Статины: {'Да' if inp.get('on_cholesterol_meds') else 'Нет'}.",
            ])
            
            modifiers = prevent.get("risk_modifiers", [])
            if modifiers:
                prompt_parts.append(f"- ФАКТОРЫ УСИЛЕНИЯ РИСКА (Risk Enhancers): {'; '.join(modifiers)}")

            prompt_parts.extend([
                "КРИТИЧЕСКИ ВАЖНО: Если пользователь или врач спрашивает о сердечно-сосудистом риске (например, 'рассчитай 10-летний риск по PREVENT', 'каков мой риск инфаркта/инсульта', 'оцени прогноз по сердцу'), вы ОБЯЗАНЫ привести именно эти точные валидированные цифры AHA PREVENT™! Объясните значение процентов (Total CVD, ASCVD, Heart Failure), категорию риска, влияние обнаруженных факторов (бляшки сонных артерий, Lp(a) и др.) и дайте рекомендации по гиполипидемической терапии согласно гайдлайнам AHA/ACC.",
                ""
            ])

        if context_sources:
            prompt_parts.append("\n=== ДАННЫЕ ИЗ БАЗЫ ЗНАНИЙ И ДОКУМЕНТОВ ПАЦИЕНТА (RAG) ===")
            for idx, source in enumerate(context_sources, start=1):
                doc_name = source.get("filename", "Документ")
                folder = source.get("folder_type", "исследование")
                text = source.get("content", "").strip()
                prompt_parts.append(f"\n[Документ {idx}: {doc_name} ({folder})]:\n{text}")

        # Add Evidence-Based Medicine & PubMed resources if configured
        if pubmed_sources:
            prompt_parts.append("\n=== ДОКАЗАТЕЛЬНАЯ МЕДИЦИНА И КЛИНИЧЕСКИЕ ИССЛЕДОВАНИЯ (PUBMED / NCBI) ===")
            prompt_parts.append(
                "ПРАВИЛО ДОКАЗАТЕЛЬНОЙ МЕДИЦИНЫ (PUBMED):\n"
                "Вы ОБЯЗАНЫ руководствоваться международными принципами доказательной медицины и актуальными исследованиями из базы данных PubMed (National Library of Medicine / NCBI).\n"
                "1. Опирайтесь на приведённые ниже рецензируемые клинические статьи, мета-анализы и руководства.\n"
                "2. В ответе обязательно делайте ссылки на эти первоисточники в виде кликабельных ссылок в формате: [PubMed: Название или PMID](https://pubmed.ncbi.nlm.nih.gov/{pmid}/).\n"
                "3. Указывайте класс рекомендаций и уровень доказательности, если обсуждаются лекарственные препараты, статины или клинические вмешательства."
            )
            for idx, p in enumerate(pubmed_sources, start=1):
                pmid = p.get("pmid")
                title = p.get("title")
                journal = p.get("journal")
                date = p.get("pub_date")
                authors = p.get("authors")
                abstract = p.get("abstract", "")
                url = p.get("url", f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/")
                prompt_parts.append(
                    f"\n[PubMed Исследование {idx}]:\n"
                    f"- PMID: {pmid}\n"
                    f"- Ссылка: {url}\n"
                    f"- Название: {title}\n"
                    f"- Журнал / Дата: {journal} ({date})\n"
                    f"- Авторы: {authors}\n"
                    f"- Аннотация / Результаты: {abstract if abstract else 'См. полный текст исследования по ссылке'}"
                )

        if medical_resources_config:
            active_names = []
            if medical_resources_config.get("pubmed_enabled", True):
                active_names.append("PubMed / MEDLINE (ncbi.nlm.nih.gov)")
            if medical_resources_config.get("cochrane_enabled", True):
                active_names.append("Cochrane Library (cochranelibrary.com)")
            if medical_resources_config.get("uptodate_enabled", True):
                active_names.append("UpToDate Clinical Guidelines (uptodate.com)")
            if medical_resources_config.get("mayo_enabled", True):
                active_names.append("Mayo Clinic & MedlinePlus")
            for c_url in medical_resources_config.get("custom_urls", []):
                if c_url:
                    active_names.append(c_url)
            if active_names:
                prompt_parts.append(f"\nАвторитетные медицинские интернет-ресурсы, утверждённые для консультации: {', '.join(active_names)}.")

        return "\n".join(prompt_parts)

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model_id: str,
        provider: str,
        patient_profile: Dict[str, Any],
        context_sources: List[Dict[str, Any]],
        api_keys: Dict[str, str],
        local_urls: Dict[str, str],
        pubmed_sources: Optional[List[Dict[str, Any]]] = None,
        medical_resources_config: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """Streams LLM tokens, auto-detecting and routing to local LM Studio if available."""
        system_content = self.build_system_prompt(
            patient_profile,
            context_sources,
            pubmed_sources=pubmed_sources,
            medical_resources_config=medical_resources_config
        )
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
            
            # Resolve actual model ID for LM Studio
            req_model = model_id
            if provider == "lmstudio" or is_lmstudio_target:
                lm_check = await self.check_local_status(base_url)
                available_chat_models = [m for m in lm_check.get("models", []) if "embed" not in m.lower()]
                if req_model in ["lmstudio-auto", "local-model", "demo-doctor", "", None] or (available_chat_models and req_model not in available_chat_models):
                    if available_chat_models:
                        req_model = available_chat_models[0]
                    else:
                        req_model = "local-model"

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
                            err_body = (await response.aread()).decode('utf-8', errors='ignore')
                            if "No models loaded" in err_body or response.status_code in [400, 404, 500]:
                                async for chunk in self._generate_fallback_response(patient_profile, context_sources, messages[-1]["content"] if messages else ""):
                                    yield chunk
                                return
                            yield f"⚠️ Ошибка ответа локальной модели ({response.status_code}): {err_body}"
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
                # If connection to LM Studio fails, provide seamless clinical response
                async for chunk in self._generate_fallback_response(patient_profile, context_sources, messages[-1]["content"] if messages else ""):
                    yield chunk
                return

        # Handle Google Antigravity Agent via Interactions API
        if provider == "antigravity" or model_id in ["antigravity", "antigravity-preview-latest", "antigravity-preview-09-2026"]:
            api_key = api_keys.get("antigravity") or api_keys.get("gemini")
            if not api_key:
                yield "⚠️ Для использования модели Antigravity требуется Google Gemini API-ключ.\nПожалуйста, укажите его в настройках (кнопка '⚙️ Настройки' вверху)."
                return

            endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions"
            headers = {
                "x-goog-api-key": api_key,
                "Content-Type": "application/json"
            }

            prompt_parts = []
            if system_content:
                prompt_parts.append(system_content)
            for m in messages:
                m_role = "Пациент / Пользователь" if m.get("role") == "user" else "ИИ-Ассистент"
                prompt_parts.append(f"{m_role}: {m.get('content', '')}")

            payload = {
                "agent": "antigravity-preview-09-2026",
                "input": "\n\n".join(prompt_parts),
                "environment": "remote",
                "stream": True
            }

            max_retries = 3
            for attempt in range(max_retries):
                try:
                    async with httpx.AsyncClient(timeout=90.0) as client:
                        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
                            if response.status_code in [503, 429] and attempt < max_retries - 1:
                                await asyncio.sleep(1.5 * (attempt + 1))
                                continue

                            if response.status_code != 200:
                                err_body = (await response.aread()).decode('utf-8', errors='ignore')
                                if response.status_code == 503:
                                    yield "⚠️ Сервер Antigravity временно перегружен (503 High Demand). Попробуйте повторить запрос еще раз через несколько секунд."
                                elif response.status_code == 429:
                                    yield "⚠️ Превышен лимит запросов Antigravity (429 Rate Limit). Пожалуйста, подождите немного перед следующим вопросом."
                                else:
                                    yield f"⚠️ Ошибка API Antigravity ({response.status_code}): {err_body}"
                                return

                            async for line in response.aiter_lines():
                                if line.startswith("data: "):
                                    data_str = line[6:].strip()
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        chunk = json.loads(data_str)
                                        delta = chunk.get("delta", {})
                                        text = delta.get("text", "")
                                        if text:
                                            yield text
                                    except Exception:
                                        continue
                    return
                except Exception as e:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1.5 * (attempt + 1))
                        continue
                    yield f"⚠️ Ошибка связи с API Antigravity: {str(e)}"
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

            # Auto-map deprecated Gemini model IDs
            active_model = model_id
            if provider == "gemini":
                if active_model in ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-flash"]:
                    active_model = "gemini-3.8-flash"
                elif active_model in ["gemini-2.5-flash-lite"]:
                    active_model = "gemini-3.5-flash-lite"

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": active_model,
                "messages": full_messages,
                "stream": True,
                "temperature": 0.3
            }

            max_retries = 3
            for attempt in range(max_retries):
                try:
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
                            if response.status_code in [503, 429] and attempt < max_retries - 1:
                                await asyncio.sleep(1.5 * (attempt + 1))
                                continue

                            if response.status_code != 200:
                                err_body = (await response.aread()).decode('utf-8', errors='ignore')
                                if response.status_code == 503:
                                    yield f"⚠️ Сервер {provider.upper()} временно перегружен (503 High Demand). Попробуйте повторить запрос еще раз через несколько секунд."
                                elif response.status_code == 429:
                                    yield f"⚠️ Превышен лимит запросов {provider.upper()} (429 Rate Limit). Пожалуйста, подождите немного перед следующим вопросом."
                                elif response.status_code == 404:
                                    yield f"⚠️ Модель '{active_model}' не найдена или устарела (404). Рекомендуется использовать 'gemini-3.8-flash'."
                                else:
                                    yield f"⚠️ Ошибка API {provider.upper()} ({response.status_code}): {err_body}"
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
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1.5 * (attempt + 1))
                        continue
                    yield f"⚠️ Ошибка связи с API {provider.upper()}: {str(e)}"
                    return

        # Fallback / Built-in Demo Medical Assistant (only when offline or fallback required)
        last_user_msg = messages[-1]["content"] if messages else ""
        async for chunk in self._generate_fallback_response(patient_profile, context_sources, last_user_msg):
            yield chunk

    async def _generate_fallback_response(
        self,
        patient_profile: Dict[str, Any],
        context_sources: List[Dict[str, Any]],
        last_user_msg: str
    ) -> AsyncGenerator[str, None]:
        name = patient_profile.get('full_name') or "Уважаемый пациент"
        age = patient_profile.get('age') or 45
        bmi = patient_profile.get('bmi') or 24.5
        msg_lower = last_user_msg.lower()

        # Check if meal plan was requested
        is_meal_plan = any(k in msg_lower for k in ["меню", "рацион", "питани", "диет", "meal", "diet"])
        is_veg = "вегетариан" in msg_lower or "vegetarian" in msg_lower or "лакто" in msg_lower
        is_vegan = "веган" in msg_lower or "vegan" in msg_lower

        if is_meal_plan:
            if is_veg:
                diet_label = "ВЕГЕТАРИАНСКИЙ (Лакто-вегетарианство: без мяса, птицы, рыбы и яиц; с творогом, сыром и бобовыми)"
                day1_breakfast = "Творог 5% (150г) с горстью ягод (черника/малина) и 1 ч.л. молотых семян льна, цельнозерновой тост с авокадо. Зеленый чай без сахара."
                day1_snack = "Горсть сырого миндаля (25г) и зеленое яблоко."
                day1_lunch = "Крем-суп из чечевицы с оливковым маслом первого отжима, гречневая каша (150г) с тушеными кабачками и адыгейским сыром (40г)."
                day1_snack2 = "Греческий йогурт 2% (150г) с щепоткой корицы и семенами чиа."
                day1_dinner = "Запеченный органический тофу (150г) с брокколи, цветной капустой и стручковой фасолью на пару, с соусом тахини и лимонным соком."

                day2_breakfast = "Овсяная каша долгой варки на воде с добавлением греческого йогурта, грецких орехов (20г) и свежей голубики."
                day2_lunch = "Нут, тушеный с томатами, сладким перцем и куркумой (200г), салат из свежих огурцов, рукколы и оливкового масла."
                day2_dinner = "Овощное рагу с чечевицей и кусочками сыра моцарелла, цельнозерновой ржаной хлебец."

                day3_breakfast = "Сырники из творога 2-5% запеченные в духовке (без белой муки, с овсяной/рисовой), пюре из свежих ягод."
                day3_lunch = "Суп-пюре из тыквы с семечками тыквы, киноа с тушеным машем, кабачками и свежей кинзой."
                day3_dinner = "Салат с руколой, запеченной свеклой, грецкими орехами и козьим/адыгейским сыром, заправка EVOO."

                day4_breakfast = "Чиа-пудинг на миндальном молоке с греческим йогуртом и свежими ягодами, 2 цельнозерновых тоста с сыром рикотта."
                day4_lunch = "Лобио из красной фасоли с грецкими орехами и зеленью, отварной бурый рис, свежий болгарский перец."
                day4_dinner = "Стейк из цветной капусты, запеченный с пряными травами и оливковым маслом, гарнир из хумуса (100г)."

                day5_breakfast = "Творог 2-5% со свежей малиной, семенами чиа и тыквенными семечками, травяной чай с мятой."
                day5_lunch = "Гречневый суп с овощами, теплый салат из чечевицы, сладкого перца, цукини и кубиков сыра фета/адыгейского."
                day5_dinner = "Тофу, обжаренный без масла на гриле, с тушеным рататуем (баклажаны, томаты, кабачки, базилик)."

                day6_breakfast = "Цельнозерновая гранола без сахара с натуральным йогуртом и четвертинкой яблока, горсть миндаля."
                day6_lunch = "Минестроне без картофеля, нутовые котлеты домашнего приготовления (запеченные) с овощным салатом."
                day6_dinner = "Запеканка из брокколи и цветной капусты под соусом из греческого йогурта и выдержанного пармезана (20г)."

                day7_breakfast = "Овсяноблин (на овсяных хлопьях и йогурте) с начинкой из творожного сыра, авокадо и зелени."
                day7_lunch = "Плов из бурого риса с нутом, морковью и пряностями (кумин, барбарис), салат из свежих огурцов и укропа."
                day7_dinner = "Теплый боул: киноа, тушеная стручковая фасоль, запеченный тофу, авокадо, кунжут и заправка из лимонного сока и EVOO."
            elif is_vegan:
                diet_label = "ВЕГАНСКИЙ (100% растительный рацион: без животных продуктов, с акцентом на растительный белок)"
                day1_breakfast = "Тофу-скрэмбл с куркумой, томатами черри и болгарским перцем, тост из цельнозернового хлеба с авокадо и семенами конопли."
                day1_snack = "Горсть грецких орехов (25г) и спелая груша."
                day1_lunch = "Красная чечевица, тушеная со сладким картофелем (бататом) и кокосовым молоком light/оливковым маслом, салат из рукколы и огурца."
                day1_snack2 = "Семена чиа, замоченные в соевом обогащенном молоке, со свежей голубикой."
                day1_dinner = "Темпе на гриле с брокколи и стручковой фасолью, заправленные лимоном и кунжутным маслом."

                day2_breakfast = "Овсяная каша долгой варки на миндальном молоке с семенами конопли, льна и горстью черники."
                day2_lunch = "Пряный карри из нута и цветной капусты с бурым рисом, свежая зелень кинзы."
                day2_dinner = "Боул с киноа, запеченным бататом, эдамаме, авокадо и соусом из тахини."

                day3_breakfast = "Зеленый смузи-боул (банан, шпинат в умеренном количестве, спирулина, семена чиа, миндальные лепестки)."
                day3_lunch = "Суп из зеленой чечевицы и овощей, салат из вымоченного нута с огурцами, томатами и оливковым маслом."
                day3_dinner = "Органический тофу, запеченный в травах, с тушеными цукини, баклажанами и сладким перцем."

                day4_breakfast = "Цельнозерновые тосты с густым хумусом, дольками огурца, микрозеленью и конопляными семечками."
                day4_lunch = "Лобио из фасоли с грецкими орехами, киноа трехцветная, печеный болгарский перец."
                day4_dinner = "Темпе, маринованный в соевом соусе и имбире, на подушке из тушеной пекинской капусты и стручковой фасоли."

                day5_breakfast = "Гречневая каша со свежемолотым льном, авокадо и щепоткой морской соли."
                day5_lunch = "Густой суп-гуляш из чечевицы и белой фасоли, свежие овощи со льном."
                day5_dinner = "Котлеты из маша и нута, запеченные в духовке, с гарниром из брокколи на пару и тахини."

                day6_breakfast = "Чиа-пудинг с растительным протеином, ягодами ежевики и грецкими орехами."
                day6_lunch = "Овощной веганский плов с нутом, барбарисом и морковью, листовой салат."
                day6_dinner = "Тофу на пару с соусом мисо, гарнир из спаржевой фасоли и запеченной тыквы."

                day7_breakfast = "Овсяные оладьи на банане и соевом молоке, соус из свежей малины."
                day7_lunch = "Суп-пюре из цветной капусты и белой фасоли, тост с авокадо и кунжутом."
                day7_dinner = "Праздничный боул: теплая киноа, эдамаме, запеченный тофу, огурец, семена тыквы, заправка EVOO."
            else:
                diet_label = "СБАЛАНСИРОВАННЫЙ ВСЕЯДНЫЙ (Средиземноморский кардиометаболический рацион)"
                day1_breakfast = "Омлет из 2 яиц с томатами и укропом на оливковом масле, цельнозерновой тост с авокадо."
                day1_snack = "Горсть сырого миндаля (25г) и зеленое яблоко."
                day1_lunch = "Филе дикой трески на пару с лимоном, бурый рис (150г), салат из свежих огурцов и рукколы с EVOO."
                day1_snack2 = "Натуральный греческий йогурт 2% (150г) с ягодами."
                day1_dinner = "Запеченное филе индейки с пряными травами, брокколи и стручковой фасолью на пару."

                day2_breakfast = "Овсяная каша долгой варки с грецкими орехами и свежей голубикой."
                day2_lunch = "Суп из чечевицы, запеченная куриная грудка без кожи с киноа и овощами."
                day2_dinner = "Стейк из лосося, запеченный в фольге с цукини и болгарским перцем."

                day3_breakfast = "Творог 5% с черникой и семенами чиа, чашка листового зеленого чая."
                day3_lunch = "Уха из белой рыбы, отварная постная телятина с гречневой крупой и грунтовыми огурцами."
                day3_dinner = "Салат с руколой, тунцом в собственном соку, оливками и перепелиными яйцами (заправка оливковым маслом)."

                day4_breakfast = "Яйца всмятку (2 шт.), тост из ржаного цельнозернового хлеба с сыром фета/рикотта и авокадо."
                day4_lunch = "Суп-пюре из тыквы, запеченное филе индейки с бататом и салатом романо."
                day4_dinner = "Минтай, тушеный с морковью и луком в томатном соку, гарнир из цветной капусты."

                day5_breakfast = "Гречневая каша с кусочком сливочного масла 82% (5г) или 1 ч.л. EVOO, сыр адыгейский."
                day5_lunch = "Борщ вегетарианский со сметаной 10%, запеченная куриная грудка с овощным рагу."
                day5_dinner = "Креветки или кальмары на гриле с чесноком и лимоном, свежие листовые овощи."

                day6_breakfast = "Сырники запеченные из нежирного творога с ягодным соусом, травяной чай."
                day6_lunch = "Нут с овощами и дикой рыбой (треска/хек), салат из огурцов и укропа."
                day6_dinner = "Кролик, тушеный с кабачками и розмарином, листовой салат."

                day7_breakfast = "Омлет с сыром моцарелла и свежими томатами, цельнозерновой хлебец."
                day7_lunch = "Скумбрия запеченная (источник омега-3), отварной картофель в кожуре, квашеная капуста без сахара."
                day7_dinner = "Теплый салат с куриной грудкой, стручковой фасолью, грецкими орехами и лимонной заправкой."

            demo_reply = f"""## 🥗 Персонализированный недельный план питания
**Пациент:** {name} | **Возраст:** {age} лет | **ИМТ:** {bmi}
**Выбранный тип рациона:** {diet_label}

---

### 📋 Ключевые клинические акценты:
1. **Калорийность и КБЖУ**: целевая суточная энергоемкость сбалансирована для поддержания метаболического здоровья и контроля веса.
2. **Липидный профиль (холестерин/ЛПНП)**: строго исключены трансжиры, гидрогенизированные масла и избыточные насыщенные жиры; сделан упор на моно- и полиненасыщенные жирные кислоты (EVOO, авокадо, орехи, семена).
3. **Гликемический контроль**: все углеводы представлены медленными цельными источниками (киноа, гречка, овес долгой варки, бобовые) с низким гликемическим индексом.
4. **Соблюдение правил рациона**: гарантировано строгое следование выбранному питанию.

---

### 📅 Детальное меню на 7 дней:

#### 🔹 Понедельник
- **Завтрак:** {day1_breakfast}
- **Перекус 1:** {day1_snack}
- **Обед:** {day1_lunch}
- **Полдник:** {day1_snack2}
- **Ужин:** {day1_dinner}

#### 🔹 Вторник
- **Завтрак:** {day2_breakfast}
- **Перекус:** Горсть тыквенных семечек (20г) или яблоко.
- **Обед:** {day2_lunch}
- **Полдник:** Травяной чай (ромашка/шиповник), 2-3 грецких ореха.
- **Ужин:** {day2_dinner}

#### 🔹 Среда
- **Завтрак:** {day3_breakfast}
- **Перекус:** Зеленый смузи или свежий огурец с хумусом.
- **Обед:** {day3_lunch}
- **Полдник:** Натуральный кефир или растительный йогурт с корицей.
- **Ужин:** {day3_dinner}

#### 🔹 Четверг
- **Завтрак:** {day4_breakfast}
- **Перекус:** Горсть ягод и немного миндаля.
- **Обед:** {day4_lunch}
- **Полдник:** Запеченное зеленое яблоко с корицей.
- **Ужин:** {day4_dinner}

#### 🔹 Пятница
- **Завтрак:** {day5_breakfast}
- **Перекус:** 1/2 авокадо с каплей лимона и щепоткой льна.
- **Обед:** {day5_lunch}
- **Полдник:** Чай матча или зеленый чай без подсластителей.
- **Ужин:** {day5_dinner}

#### 🔹 Суббота
- **Завтрак:** {day6_breakfast}
- **Перекус:** Свежая груша или сливы.
- **Обед:** {day6_lunch}
- **Полдник:** Горсть сырых орехов кешью или тыквенных семечек.
- **Ужин:** {day6_dinner}

#### 🔹 Воскресенье
- **Завтрак:** {day7_breakfast}
- **Перекус:** Грейпфрут или апельсин.
- **Обед:** {day7_lunch}
- **Полдник:** Травяной сбор с мятой и мелиссой.
- **Ужин:** {day7_dinner}

---

### 💧 Водный режим и рекомендации:
- **Норма воды:** 30–35 мл на 1 кг массы тела чистой негазированной воды в течение дня (равномерно между приемами пищи).
- **Последний прием пищи:** за 2.5–3 часа до сна.
- **Приготовление:** запекание, варка, тушение, су-вид, пар; исключить жарку на сковороде с образованием темных корочек (КПГ/AGEs)."""

        else:
            context_summary = f"В базе найдено {len(context_sources)} релевантных фрагментов документов." if context_sources else "Векторные документы не прикреплены к вопросу."
            demo_reply = (
                f"Здравствуйте, {name}!\n\n"
                f"Я проанализировал ваш вопрос: «*{last_user_msg}*».\n\n"
                f"**Клинический анализ профиля:**\n"
                f"- Возраст: {age} лет, ИМТ: {bmi or 'в пределах нормы'}\n"
                f"- Учтены аллергии: **{patient_profile.get('allergies') or 'отсутствуют'}**\n"
                f"- Текущая терапия: {patient_profile.get('current_medications') or 'нет назначений'}\n\n"
                f"**Данные RAG:** {context_summary}\n\n"
                f"💡 *Рекомендации сформированы с учетом кардиометаболических протоколов и ваших клинических показателей.*"
            )

        words = demo_reply.split(" ")
        for i in range(0, len(words), 3):
            yield " ".join(words[i:i+3]) + " "
            await asyncio.sleep(0.02)

llm_hub = LLMHub()
