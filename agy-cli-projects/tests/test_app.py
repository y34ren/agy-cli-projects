import unittest
from app import app, QUOTES


class QuoteAppTestCase(unittest.TestCase):
    def setUp(self):
        app.config["TESTING"] = True
        self.client = app.test_client()

    def test_dataset_has_100_valid_quotes(self):
        self.assertEqual(len(QUOTES), 100)
        ids = [q["id"] for q in QUOTES]
        self.assertEqual(ids, list(range(1, 101)))
        for q in QUOTES:
            self.assertTrue(isinstance(q.get("quote"), str) and q["quote"].strip())
            self.assertTrue(isinstance(q.get("author"), str) and q["author"].strip())
            self.assertTrue(isinstance(q.get("categories"), list) and len(q["categories"]) > 0)

    def test_index_route(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("Quote Explorer", html)

    def test_meta_endpoint(self):
        response = self.client.get("/api/meta")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["total_quotes"], 100)
        self.assertIn("Alan Turing", data["authors"])
        self.assertIn("AI & Technology", data["categories"])

    def test_random_quote_endpoint(self):
        response = self.client.get("/api/quotes/random")
        self.assertEqual(response.status_code, 200)
        quote = response.get_json()
        self.assertIn("id", quote)
        self.assertIn("quote", quote)
        self.assertIn("author", quote)
        self.assertIn("categories", quote)

    def test_random_quote_not_found_for_invalid_filter(self):
        response = self.client.get("/api/quotes/random?author=NonExistentAuthor12345")
        self.assertEqual(response.status_code, 404)

    def test_search_by_author_case_insensitive_partial(self):
        response = self.client.get("/api/quotes?author=turing")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertGreaterEqual(data["count"], 2)
        for q in data["quotes"]:
            self.assertEqual(q["author"], "Alan Turing")

    def test_filter_by_category(self):
        response = self.client.get("/api/quotes?category=AI%20%26%20Technology")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertGreater(data["count"], 0)
        for q in data["quotes"]:
            self.assertIn("AI & Technology", q["categories"])

    def test_combined_author_and_category_filter(self):
        response = self.client.get("/api/quotes?author=Einstein&category=Science")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertGreater(data["count"], 0)
        for q in data["quotes"]:
            self.assertEqual(q["author"], "Albert Einstein")
            self.assertIn("Science", q["categories"])


if __name__ == "__main__":
    unittest.main()
