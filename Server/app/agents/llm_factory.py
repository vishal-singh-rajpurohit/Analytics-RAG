import os
from typing import Optional, Any
from app.config.config import settings

def get_chat_model() -> Optional[Any]:
    """
    Returns an initialized LangChain Chat model based on configuration.
    Prioritizes ChatGoogleGenerativeAI (Google Gemini) when configured or available,
    with OpenAI fallback.
    Returns None if no API keys are provided to use smart offline heuristics.
    """
    google_key = (
        getattr(settings, "GOOGLE_API_KEY", None)
        or getattr(settings, "GEMINI_API_KEY", None)
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )
    openai_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
    provider = (getattr(settings, "LLM_PROVIDER", None) or "google").lower()
    gemini_model = getattr(settings, "GEMINI_MODEL", None) or os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"

    # Priority 1: Google Gemini (ChatGoogleGenerativeAI via langchain-google-genai)
    if provider in ("google", "gemini", "langchain-google-genai") and google_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=gemini_model,
                google_api_key=google_key,
                temperature=0.1
            )
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to initialize ChatGoogleGenerativeAI ({e}). Falling back.")

    # Priority 2: OpenAI
    if openai_key and (provider == "openai" or not google_key):
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=getattr(settings, "OPENAI_MODEL_NAME", None) or "gpt-4o-mini",
                api_key=openai_key,
                temperature=0.1
            )
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to initialize ChatOpenAI ({e}).")

    # Priority 3: Fallback to Google Gemini if google_key is present even if provider wasn't explicitly 'google'
    if google_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=gemini_model,
                google_api_key=google_key,
                temperature=0.1
            )
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to fallback to ChatGoogleGenerativeAI ({e}).")

    # Offline / Heuristic execution
    return None
