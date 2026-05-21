from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def build_ad_prompt(brand_name, tagline, industry, tone, colors, audience, ad_type, extra_notes):
    return f"""You are a world-class advertising creative director and copywriter.

Generate a detailed, vivid AD IMAGE DESCRIPTION and AD COPY for the following brand:

Brand Name: {brand_name}
Tagline: {tagline}
Industry: {industry}
Brand Tone: {tone}
Brand Colors: {colors}
Target Audience: {audience}
Ad Format: {ad_type}
Additional Notes: {extra_notes}

Your response MUST follow this exact JSON structure:
{{
  "headline": "Main ad headline (punchy, max 8 words)",
  "subheadline": "Supporting text (max 15 words)",
  "body_copy": "Short body copy for the ad (2-3 sentences)",
  "cta": "Call to action button text (max 4 words)",
  "image_prompt": "Hyper-detailed image generation prompt describing the visual scene, style, lighting, composition, colors matching the brand palette, mood, and all visual elements. Minimum 80 words.",
  "design_notes": "Specific design instructions: typography style, layout, color usage, visual hierarchy, spacing",
  "brand_style_guide": {{
    "primary_font": "Suggested font name and style",
    "accent_font": "Accent font suggestion",
    "color_palette": ["#hex1", "#hex2", "#hex3"],
    "mood": "Overall visual mood in 3 words"
  }}
}}

Return ONLY valid JSON, no extra text."""


@app.route("/api/generate", methods=["POST"])
def generate_ad():
    try:
        data = request.json
        brand_name = data.get("brand_name", "")
        tagline = data.get("tagline", "")
        industry = data.get("industry", "")
        tone = data.get("tone", "Professional")
        colors = data.get("colors", "")
        audience = data.get("audience", "")
        ad_type = data.get("ad_type", "Social Media Post")
        extra_notes = data.get("extra_notes", "")

        if not brand_name or not industry:
            return jsonify({"error": "Brand name and industry are required"}), 400

        prompt = build_ad_prompt(brand_name, tagline, industry, tone, colors, audience, ad_type, extra_notes)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a top-tier creative advertising director. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.85,
            max_tokens=1500,
        )

        response_text = completion.choices[0].message.content.strip()
        
        # Clean JSON if wrapped in markdown
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        import json
        ad_data = json.loads(response_text)
        
        return jsonify({
            "success": True,
            "ad": ad_data,
            "model_used": "llama-3.3-70b-versatile"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/refine", methods=["POST"])
def refine_ad():
    """Refine existing ad copy with specific feedback"""
    try:
        data = request.json
        existing_ad = data.get("existing_ad", {})
        feedback = data.get("feedback", "")
        brand_name = data.get("brand_name", "")

        prompt = f"""You are a creative advertising director. Refine this ad for {brand_name} based on the feedback.

Existing Ad:
{existing_ad}

Feedback/Changes requested:
{feedback}

Return the refined version in the exact same JSON structure. Return ONLY valid JSON."""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a creative advertising director. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1200,
        )

        response_text = completion.choices[0].message.content.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        import json
        refined_ad = json.loads(response_text)

        return jsonify({"success": True, "ad": refined_ad})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/variations", methods=["POST"])
def generate_variations():
    """Generate multiple copy variations"""
    try:
        data = request.json
        brand_name = data.get("brand_name", "")
        industry = data.get("industry", "")
        tone = data.get("tone", "Professional")
        count = data.get("count", 3)

        prompt = f"""Generate {count} different ad copy variations for:
Brand: {brand_name}
Industry: {industry}
Tone: {tone}

Return a JSON array of {count} objects, each with: headline, subheadline, body_copy, cta
Return ONLY valid JSON array."""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Creative ad copywriter. Return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.9,
            max_tokens=1000,
        )

        response_text = completion.choices[0].message.content.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        import json
        variations = json.loads(response_text)

        return jsonify({"success": True, "variations": variations})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Ad Image Generator API"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
