import os
from flask import Flask, request, jsonify, render_template
from groq import Groq

app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an expert at distilling long emails into a single punchy voice-friendly summary.

Rules:
- Output EXACTLY one sentence (max 20 words)
- Write it as if being read aloud — natural, spoken English
- No bullet points, no lists, no markdown
- Capture the most important action or key message
- Start with the most important person or action
- Avoid filler words like "basically", "essentially", "just"
- Never start with "This email..."

Output only the single summary sentence. Nothing else."""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json()
    email_text = data.get("email", "").strip()

    if not email_text:
        return jsonify({"error": "No email text provided"}), 400

    if len(email_text) < 20:
        return jsonify({"error": "Email is too short to summarize"}), 400

    if len(email_text) > 15000:
        return jsonify({"error": "Email is too long. Please limit to 15,000 characters"}), 400

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Summarize this email into one voice-friendly sentence:\n\n{email_text}"}
            ],
            max_tokens=60,
            temperature=0.3,
        )

        summary = completion.choices[0].message.content.strip()
        summary = summary.strip('"').strip("'")

        return jsonify({
            "summary": summary,
            "char_count": len(email_text),
            "model": completion.model
        })

    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
