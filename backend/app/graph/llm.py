import json
import os

from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize Groq client
client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# Default model
MODEL_NAME = "openai/gpt-oss-120b"


def generate_response(
    prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> str:
    """
    Sends a prompt to the Groq LLM and returns the generated text response.
    """

    response = client.chat.completions.create(
        model=MODEL_NAME,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
    )

    return response.choices[0].message.content.strip()


def generate_json_response(prompt: str, temperature: float = 0.2, max_tokens: int = 1024) -> dict:
    response = generate_response(prompt, temperature, max_tokens)
    
    # Strip Markdown code blocks if the LLM includes them
    cleaned = response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON:\n\n{response}") from e