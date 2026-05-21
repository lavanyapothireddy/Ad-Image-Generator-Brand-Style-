import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def clean_json(text):
    """Strip markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def build_ad_prompt(brand_name, tagline, industry, tone, colors, audience, ad_type, extra_notes):
    return f"""You are a world-class advertising creative director and copywriter.

Generate a detailed AD IMAGE DESCRIPTION and AD COPY for this brand:

Brand Name: {brand_name}
Tagline: {tagline}
Industry: {industry}
Brand Tone: {tone}
Brand Colors: {colors}
Target Audience: {audience}
Ad Format: {ad_type}
Additional Notes: {extra_notes}

Respond ONLY with this exact JSON structure, no extra text:
{{
  "headline": "Main ad headline, max 8 words",
  "subheadline": "Supporting text, max 15 words",
  "body_copy": "Short body copy, 2-3 sentences",
  "cta": "Call to action, max 4 words",
  "image_prompt": "Hyper-detailed image generation prompt, minimum 80 words, describing scene, style, lighting, composition, colors, mood",
  "design_notes": "Typography style, layout, color usage, visual hierarchy instructions",
  "brand_style_guide": {{
    "primary_font": "Suggested font name and style",
    "accent_font": "Accent font suggestion",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "mood": "Overall visual mood in 3 words"
  }}
}}"""


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Ad Image Generator API"})


@app.route("/api/generate", methods=["POST"])
def generate_ad():
    try:
        data = request.get_json(force=True)
        brand_name = data.get("brand_name", "").strip()
        industry = data.get("industry", "").strip()

        if not brand_name or not industry:
            return jsonify({"error": "Brand name and industry are required"}), 400

        prompt = build_ad_prompt(
            brand_name=brand_name,
            tagline=data.get("tagline", ""),
            industry=industry,
            tone=data.get("tone", "Professional"),
            colors=data.get("colors", ""),
            audience=data.get("audience", ""),
            ad_type=data.get("ad_type", "Social Media Post"),
            extra_notes=data.get("extra_notes", "")
        )

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a top-tier creative advertising director. Always respond with valid JSON only. No markdown, no extra text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.85,
            max_tokens=1500,
        )

        response_text = clean_json(completion.choices[0].message.content)
        ad_data = json.loads(response_text)

        return jsonify({"success": True, "ad": ad_data, "model_used": "llama-3.3-70b-versatile"})

    except json.JSONDecodeError as e:
        return jsonify({"error": f"AI returned invalid JSON: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/refine", methods=["POST"])
def refine_ad():
    try:
        data = request.get_json(force=True)
        existing_ad = data.get("existing_ad", {})
        feedback = data.get("feedback", "").strip()
        brand_name = data.get("brand_name", "")

        if not feedback:
            return jsonify({"error": "Feedback is required"}), 400

        prompt = f"""You are a creative advertising director. Refine this ad for {brand_name} based on the feedback.

Existing Ad:
{json.dumps(existing_ad, indent=2)}

Feedback: {feedback}

Return the refined version in the exact same JSON structure. Return ONLY valid JSON, no extra text."""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Creative advertising director. Return valid JSON only, no markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1200,
        )

        response_text = clean_json(completion.choices[0].message.content)
        refined_ad = json.loads(response_text)

        return jsonify({"success": True, "ad": refined_ad})

    except json.JSONDecodeError as e:
        return jsonify({"error": f"AI returned invalid JSON: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/variations", methods=["POST"])
def generate_variations():
    try:
        data = request.get_json(force=True)
        brand_name = data.get("brand_name", "")
        industry = data.get("industry", "")
        tone = data.get("tone", "Professional")
        count = min(int(data.get("count", 3)), 5)

        prompt = f"""Generate {count} different ad copy variations for:
Brand: {brand_name}
Industry: {industry}
Tone: {tone}

Return a JSON array of {count} objects. Each object must have exactly these keys:
headline, subheadline, body_copy, cta

Return ONLY the JSON array, no extra text."""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Creative ad copywriter. Return valid JSON array only, no markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.9,
            max_tokens=1000,
        )

        response_text = clean_json(completion.choices[0].message.content)
        variations = json.loads(response_text)

        return jsonify({"success": True, "variations": variations})

    except json.JSONDecodeError as e:
        return jsonify({"error": f"AI returned invalid JSON: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
