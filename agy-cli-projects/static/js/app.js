/**
 * Quote Explorer — Frontend Vanilla JS Controller
 */
(() => {
  const state = {
    totalQuotes: 100,
    currentSpotlightQuote: null,
    authorFilter: "",
    categoryFilter: "",
    useActiveFiltersForRandom: false,
  };

  // DOM References
  const totalQuotesBadge = document.getElementById("total-quotes-badge");
  const spotlightCard = document.getElementById("spotlight-card");
  const spotlightQuoteEl = document.getElementById("spotlight-quote");
  const spotlightAuthorBtn = document.getElementById("spotlight-author");
  const spotlightCategoriesEl = document.getElementById("spotlight-categories");
  const newRandomBtn = document.getElementById("new-random-btn");
  const copyQuoteBtn = document.getElementById("copy-quote-btn");
  const useActiveFiltersCheckbox = document.getElementById("use-active-filters-checkbox");

  const authorInput = document.getElementById("author-input");
  const authorsDatalist = document.getElementById("authors-datalist");
  const categorySelect = document.getElementById("category-select");
  const categoryPillsContainer = document.getElementById("category-pills");
  const clearFiltersBtn = document.getElementById("clear-filters-btn");
  const resultsSummaryEl = document.getElementById("results-summary");
  const quotesGrid = document.getElementById("quotes-grid");
  const emptyState = document.getElementById("empty-state");
  const emptyResetBtn = document.getElementById("empty-reset-btn");

  /**
   * Utility: Debounce function calls
   */
  function debounce(fn, delayMs = 200) {
    let timerId = null;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn(...args), delayMs);
    };
  }

  /**
   * Fetch metadata (/api/meta) to populate authors datalist and category filters
   */
  async function loadMetadata() {
    try {
      const response = await fetch("/api/meta");
      if (!response.ok) return;
      const meta = await response.json();

      state.totalQuotes = meta.total_quotes || 100;
      totalQuotesBadge.textContent = String(state.totalQuotes);

      // Populate author autocomplete <datalist>
      authorsDatalist.replaceChildren();
      meta.authors.forEach((author) => {
        const option = document.createElement("option");
        option.value = author;
        authorsDatalist.appendChild(option);
      });

      // Populate category <select> and interactive category pills
      meta.categories.forEach((category) => {
        const count = meta.category_counts?.[category] ?? "";
        const option = document.createElement("option");
        option.value = category;
        option.textContent = count ? `${category} (${count})` : category;
        categorySelect.appendChild(option);

        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "category-pill";
        pill.dataset.category = category;
        pill.textContent = count ? `${category} (${count})` : category;
        pill.addEventListener("click", () => setCategoryFilter(category));
        categoryPillsContainer.appendChild(pill);
      });
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  }

  /**
   * Fetch and render a random quote in the Spotlight card
   */
  async function fetchRandomQuote() {
    const params = new URLSearchParams();
    if (state.useActiveFiltersForRandom) {
      if (state.authorFilter) params.set("author", state.authorFilter);
      if (state.categoryFilter) params.set("category", state.categoryFilter);
    }
    if (state.currentSpotlightQuote?.id) {
      params.set("exclude_id", String(state.currentSpotlightQuote.id));
    }

    spotlightCard.classList.add("fade-out");
    try {
      const response = await fetch(`/api/quotes/random?${params.toString()}`);
      if (!response.ok) {
        spotlightQuoteEl.textContent =
          "No quotes match your active filters. Uncheck 'Draw from active search filters' or adjust your search.";
        spotlightAuthorBtn.textContent = "";
        spotlightCategoriesEl.replaceChildren();
        return;
      }
      const quoteObj = await response.json();
      state.currentSpotlightQuote = quoteObj;
      renderSpotlightQuote(quoteObj);
    } catch (err) {
      console.error("Failed to fetch random quote:", err);
    } finally {
      setTimeout(() => spotlightCard.classList.remove("fade-out"), 120);
    }
  }

  /**
   * Render the spotlight quote card safely using textContent
   */
  function renderSpotlightQuote(quoteObj) {
    spotlightQuoteEl.textContent = `“${quoteObj.quote}”`;
    spotlightAuthorBtn.textContent = `— ${quoteObj.author}`;
    spotlightAuthorBtn.onclick = () => setAuthorFilter(quoteObj.author);

    spotlightCategoriesEl.replaceChildren();
    quoteObj.categories.forEach((cat) => {
      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "tag-badge";
      badge.textContent = cat;
      badge.title = `Filter by category: ${cat}`;
      badge.addEventListener("click", () => setCategoryFilter(cat));
      spotlightCategoriesEl.appendChild(badge);
    });
  }

  /**
   * Fetch and render filtered quotes list
   */
  async function fetchQuotes() {
    const params = new URLSearchParams();
    if (state.authorFilter) params.set("author", state.authorFilter);
    if (state.categoryFilter) params.set("category", state.categoryFilter);

    try {
      const response = await fetch(`/api/quotes?${params.toString()}`);
      if (!response.ok) return;
      const data = await response.json();
      renderQuotesGrid(data.quotes, data.count);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    }
  }

  /**
   * Render the matching quotes grid and summary bar
   */
  function renderQuotesGrid(quotes, count) {
    const hasFilters = Boolean(state.authorFilter || state.categoryFilter);
    clearFiltersBtn.hidden = !hasFilters;

    const filterParts = [];
    if (state.authorFilter) filterParts.push(`author matching "${state.authorFilter}"`);
    if (state.categoryFilter) filterParts.push(`category "${state.categoryFilter}"`);

    if (!hasFilters) {
      resultsSummaryEl.textContent = `Showing all ${count} of ${state.totalQuotes} quotes`;
    } else {
      resultsSummaryEl.textContent = `Showing ${count} of ${state.totalQuotes} quotes for ${filterParts.join(" in ")}`;
    }

    quotesGrid.replaceChildren();

    if (quotes.length === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    const fragment = document.createDocumentFragment();

    quotes.forEach((item) => {
      const card = document.createElement("article");
      card.className = "quote-card";

      const quoteText = document.createElement("p");
      quoteText.className = "quote-card-text";
      quoteText.textContent = `“${item.quote}”`;

      const footer = document.createElement("div");
      footer.className = "quote-card-footer";

      const authorBtn = document.createElement("button");
      authorBtn.type = "button";
      authorBtn.className = "quote-card-author";
      authorBtn.textContent = `— ${item.author}`;
      authorBtn.title = `Search quotes by ${item.author}`;
      authorBtn.addEventListener("click", () => setAuthorFilter(item.author));

      const categoriesRow = document.createElement("div");
      categoriesRow.className = "card-categories";
      item.categories.forEach((cat) => {
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "tag-badge";
        badge.textContent = cat;
        badge.title = `Filter by category: ${cat}`;
        badge.addEventListener("click", () => setCategoryFilter(cat));
        categoriesRow.appendChild(badge);
      });

      footer.appendChild(authorBtn);
      footer.appendChild(categoriesRow);
      card.appendChild(quoteText);
      card.appendChild(footer);
      fragment.appendChild(card);
    });

    quotesGrid.appendChild(fragment);
  }

  /**
   * Synchronize Category state across pills and dropdown, then refresh results
   */
  function setCategoryFilter(category) {
    state.categoryFilter = category;
    categorySelect.value = category;

    const pills = categoryPillsContainer.querySelectorAll(".category-pill");
    pills.forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.category === category);
    });

    fetchQuotes();
    if (state.useActiveFiltersForRandom) {
      fetchRandomQuote();
    }
  }

  /**
   * Set Author filter in input and state, then refresh results
   */
  function setAuthorFilter(author) {
    state.authorFilter = author.trim();
    authorInput.value = state.authorFilter;
    fetchQuotes();
    if (state.useActiveFiltersForRandom) {
      fetchRandomQuote();
    }
  }

  /**
   * Reset all active filters
   */
  function resetFilters() {
    state.authorFilter = "";
    state.categoryFilter = "";
    authorInput.value = "";
    categorySelect.value = "";

    const pills = categoryPillsContainer.querySelectorAll(".category-pill");
    pills.forEach((pill) => {
      pill.classList.toggle("active", pill.dataset.category === "");
    });

    fetchQuotes();
    if (state.useActiveFiltersForRandom) {
      fetchRandomQuote();
    }
  }

  /**
   * Copy current spotlight quote to clipboard
   */
  async function copySpotlightQuote() {
    if (!state.currentSpotlightQuote) return;
    const formatted = `"${state.currentSpotlightQuote.quote}" — ${state.currentSpotlightQuote.author}`;
    try {
      await navigator.clipboard.writeText(formatted);
      const originalText = copyQuoteBtn.textContent;
      copyQuoteBtn.textContent = "Copied!";
      setTimeout(() => {
        copyQuoteBtn.textContent = originalText;
      }, 1500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  // Event Listeners
  newRandomBtn.addEventListener("click", fetchRandomQuote);
  copyQuoteBtn.addEventListener("click", copySpotlightQuote);

  useActiveFiltersCheckbox.addEventListener("change", (e) => {
    state.useActiveFiltersForRandom = e.target.checked;
    if (state.useActiveFiltersForRandom) {
      fetchRandomQuote();
    }
  });

  const handleAuthorInput = debounce((e) => {
    state.authorFilter = e.target.value.trim();
    fetchQuotes();
    if (state.useActiveFiltersForRandom) {
      fetchRandomQuote();
    }
  }, 200);

  authorInput.addEventListener("input", handleAuthorInput);

  categorySelect.addEventListener("change", (e) => {
    setCategoryFilter(e.target.value);
  });

  // Wire up the initial "All" pill
  const allPill = categoryPillsContainer.querySelector('[data-category=""]');
  if (allPill) {
    allPill.addEventListener("click", () => setCategoryFilter(""));
  }

  clearFiltersBtn.addEventListener("click", resetFilters);
  emptyResetBtn.addEventListener("click", resetFilters);

  // Initialize on page load
  document.addEventListener("DOMContentLoaded", async () => {
    await loadMetadata();
    await Promise.all([fetchRandomQuote(), fetchQuotes()]);
  });
})();
