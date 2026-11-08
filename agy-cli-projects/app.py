from pathlib import Path
import json
import random
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

DATA_PATH = Path(__file__).parent / "data" / "quotes.json"


def load_quotes() -> list[dict]:
    """Load the 100 well-known quotes from data/quotes.json."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


QUOTES: list[dict] = load_quotes()


def filter_quotes(author: str = "", category: str = "", q: str = "") -> list[dict]:
    """Filter quotes by author substring, exact category name, and optional text query."""
    results = QUOTES
    if author:
        author_lower = author.strip().lower()
        results = [
            item for item in results
            if author_lower in item["author"].lower()
        ]
    if category:
        cat_lower = category.strip().lower()
        results = [
            item for item in results
            if any(c.lower() == cat_lower for c in item["categories"])
        ]
    if q:
        q_lower = q.strip().lower()
        results = [
            item for item in results
            if q_lower in item["quote"].lower() or q_lower in item["author"].lower()
        ]
    return results


@app.route("/")
def index():
    """Serve the single-page quote explorer frontend."""
    return render_template("index.html")


@app.route("/api/meta")
def get_meta():
    """Return distinct authors, categories, and total quote count."""
    authors = sorted({item["author"] for item in QUOTES})
    categories = sorted({cat for item in QUOTES for cat in item["categories"]})
    category_counts = {
        cat: sum(1 for item in QUOTES if cat in item["categories"])
        for cat in categories
    }
    return jsonify({
        "total_quotes": len(QUOTES),
        "authors": authors,
        "categories": categories,
        "category_counts": category_counts,
    })


@app.route("/api/quotes/random")
def get_random_quote():
    """Return a single random quote, optionally constrained by author/category filters."""
    author = request.args.get("author", "")
    category = request.args.get("category", "")
    exclude_id = request.args.get("exclude_id", type=int)

    pool = filter_quotes(author=author, category=category)
    if not pool:
        return jsonify({"error": "No quotes found matching the given filters."}), 404

    if exclude_id is not None and len(pool) > 1:
        pool = [item for item in pool if item["id"] != exclude_id]

    return jsonify(random.choice(pool))


@app.route("/api/quotes")
def get_quotes():
    """Return all quotes matching the author, category, and optional text search filters."""
    author = request.args.get("author", "")
    category = request.args.get("category", "")
    q = request.args.get("q", "")

    results = filter_quotes(author=author, category=category, q=q)
    return jsonify({
        "count": len(results),
        "quotes": results,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
