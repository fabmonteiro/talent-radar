import google.genai as genai
from google.genai import types

from core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_embedding(text: str) -> list[float]:
    result = client.models.embed_content(
        model="models/gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return result.embeddings[0].values
