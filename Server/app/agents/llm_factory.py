import os
from typing import Optional, Any
from app.config.config import settings

def get_chat_model() -> Optional[Any]:
    """
    Returns an initialized LangChain Chat model based on configuration.
    Prioritizes ChatHuggingFace when configured or requested, with OpenAI fallback.
    Returns None if no API keys are provided to use smart offline heuristics.
    """
    hf_token = settings.HUGGINGFACEHUB_API_TOKEN or os.getenv("HUGGINGFACEHUB_API_TOKEN") or os.getenv("HF_TOKEN")
    openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    provider = (settings.LLM_PROVIDER or "huggingface").lower()

    # Priority 1: ChatHuggingFace
    if provider == "huggingface" and hf_token:
        try:
            from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
            endpoint = HuggingFaceEndpoint(
                repo_id=settings.HUGGINGFACE_REPO_ID or "meta-llama/Meta-Llama-3-8B-Instruct",
                task="text-generation",
                max_new_tokens=512,
                do_sample=False,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            chat_model = ChatHuggingFace(llm=endpoint)
            return chat_model
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to initialize ChatHuggingFace ({e}). Falling back.")

    # Priority 2: OpenAI
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=settings.OPENAI_MODEL_NAME or "gpt-4o-mini",
                api_key=openai_key,
                temperature=0.1
            )
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to initialize ChatOpenAI ({e}).")

    # If ChatHuggingFace token is available even if provider wasn't explicitly 'huggingface'
    if hf_token:
        try:
            from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
            endpoint = HuggingFaceEndpoint(
                repo_id=settings.HUGGINGFACE_REPO_ID or "meta-llama/Meta-Llama-3-8B-Instruct",
                task="text-generation",
                max_new_tokens=512,
                do_sample=False,
                temperature=0.1,
                huggingfacehub_api_token=hf_token
            )
            return ChatHuggingFace(llm=endpoint)
        except Exception as e:
            print(f"[LLM-FACTORY] Warning: Failed to fallback to ChatHuggingFace ({e}).")

    # Offline / Heuristic execution
    return None
