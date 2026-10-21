import os
import pytest
from app.config.config import settings
from app.agents.llm_factory import get_chat_model


def test_offline_mode_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    model = get_chat_model()
    assert model is None


def test_google_genai_model_instantiation(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "google")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test_google_key_unit_test")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    model = get_chat_model()
    assert model is not None
    assert type(model).__name__ == "ChatGoogleGenerativeAI"
    assert model.model == "gemini-1.5-flash"


def test_custom_gemini_model_configuration(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "google")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "test_google_key_unit_test")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-1.5-pro")

    model = get_chat_model()
    assert model is not None
    assert type(model).__name__ == "ChatGoogleGenerativeAI"
    assert model.model == "gemini-1.5-pro"


def test_gemini_api_key_fallback(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "google")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test_gemini_key_direct")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")

    model = get_chat_model()
    assert model is not None
    assert type(model).__name__ == "ChatGoogleGenerativeAI"
    assert model.model == "gemini-2.0-flash"


def test_openai_fallback_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-fake-key")
    monkeypatch.setattr(settings, "OPENAI_MODEL_NAME", "gpt-4o-mini")

    model = get_chat_model()
    assert model is not None
    assert type(model).__name__ == "ChatOpenAI"
    assert model.model_name == "gpt-4o-mini"
