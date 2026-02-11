document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("cards-grid");
  const filterSelect = document.getElementById("cuisine-filter");
  const priceCheckboxes = document.querySelectorAll("fieldset input[type=checkbox]");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-filters");

  const inset = document.getElementById("restaurant-inset");
  const insetInfo = inset.querySelector(".inset-info");
  const insetMapDiv = document.getElementById("inset-map");
  const insetClose = document.getElementById("inset-close");

  let restaurants = [];
  let currentMap = null;

  fetch("/restaurants")
    .then(res => res.json())
    .then(data => {
      restaurants = data;
      renderCards(restaurants);
      populateFilterOptions(restaurants);
    });

  function populateFilterOptions(restaurants) {
    const cuisinesSet = new Set();
    restaurants.forEach(r => {
      if (Array.isArray(r.cuisine_type)) {
        r.cuisine_type.forEach(c => cuisinesSet.add(c.trim()));
      }
    });
    const cuisinesArray = Array.from(cuisinesSet).sort((a, b) => a.localeCompare(b));
    filterSelect.innerHTML = `<option value="">All</option>`;
    cuisinesArray.forEach(cuisine => {
      const option = document.createElement("option");
      option.value = cuisine;
      option.textContent = cuisine;
      filterSelect.appendChild(option);
    });
  }

  function renderCards(list) {
    grid.innerHTML = "";
    list.forEach(r => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.restaurant = JSON.stringify(r); // attach restaurant data

      const stars = "★".repeat(Math.round(r.rating)) + "☆".repeat(5 - Math.round(r.rating));

      let cuisineButtons = "";
      if (Array.isArray(r.cuisine_type)) {
        cuisineButtons = r.cuisine_type.map(type => `<span class="cuisine-btn">${type}</span>`).join("");
      }

      card.innerHTML = `
          <div class="card-thumb">
            <img src="${r.image_src}" alt="${r.name}">
          </div>
          <div class="card-body">
            <h3 class="title"><a href="${r.reviews_url}" target="_blank">${r.name}</a></h3>
            <p class="meta">${r.location} <br>${r.price_range} • ${stars} ${r.rating}</p>
            <div class="cuisine-list">${cuisineButtons}</div>
            <p class="excerpt">${r.preview_description}</p>
          </div>
      `;
      grid.appendChild(card);
    });
  }

  function applyFilters() {
    const selectedCuisine = filterSelect.value;
    const selectedPrices = Array.from(priceCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = restaurants.filter(r => {
      const matchesCuisine = !selectedCuisine || (Array.isArray(r.cuisine_type) && r.cuisine_type.includes(selectedCuisine));
      const matchesPrice = selectedPrices.length === 0 || selectedPrices.includes(r.price_range);
      const matchesKeyword =
        !keyword ||
        r.name.toLowerCase().includes(keyword) ||
        r.location.toLowerCase().includes(keyword);

      return matchesCuisine && matchesPrice && matchesKeyword;
    });

    renderCards(filtered);
  }

  // Auto-apply filters
  filterSelect.addEventListener("change", applyFilters);
  priceCheckboxes.forEach(cb => cb.addEventListener("change", applyFilters));

  // Keyword search on submit
  searchForm.addEventListener("submit", e => {
    e.preventDefault();
    applyFilters();
  });

  // Clear filters
  clearBtn.addEventListener("click", () => {
    filterSelect.value = "";
    priceCheckboxes.forEach(cb => (cb.checked = false));
    searchInput.value = "";
    renderCards(restaurants);
  });

  // Card click handler
  grid.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (!card) return;

    // Skip if clicking the restaurant name link
    if (e.target.tagName.toLowerCase() === "a") return;

    const restaurant = JSON.parse(card.dataset.restaurant);

    // Fill inset info
    insetInfo.innerHTML = `
      <h2>${restaurant.name}</h2>
      <p><strong>Location:</strong> ${restaurant.location}</p>
      <p><strong>Price Range:</strong> ${restaurant.price_range}</p>
      <p><strong>Rating:</strong> ${restaurant.rating}</p>
      <p>${restaurant.preview_description}</p>
    `;

    // Show inset
    inset.classList.add("open");

    // Initialize map
    // Clear previous map instance if it exists
    if (currentMap) {
      currentMap.remove();
      currentMap = null;
    }

    // Initialize new map
    currentMap = L.map("inset-map").setView([restaurant.coordinates.lat, restaurant.coordinates.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(currentMap);
    L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(currentMap);
  });

  // Close button
  insetClose.addEventListener("click", () => {
    inset.classList.remove("open");
  });

  const backdrop = document.getElementById("inset-backdrop");
  grid.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (!card) return;
    if (e.target.tagName.toLowerCase() === "a") return;

    const restaurant = JSON.parse(card.dataset.restaurant);

    insetInfo.innerHTML = `
      <h2>${restaurant.name}</h2>
      <p><strong>Location:</strong> ${restaurant.location}</p>
      <p><strong>Price Range:</strong> ${restaurant.price_range}</p>
      <p><strong>Rating:</strong> ${restaurant.rating}</p>
      <p>${restaurant.preview_description}</p>
    `;

    inset.classList.add("open");
    backdrop.style.display = "block";

    // Reset map
    if (currentMap) {
      currentMap.remove();
      currentMap = null;
    }
    currentMap = L.map("inset-map").setView([restaurant.coordinates.lat, restaurant.coordinates.lng], 20);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(currentMap);
    L.marker([restaurant.coordinates.lat, restaurant.coordinates.lng]).addTo(currentMap);
  });

  // Close inset
  insetClose.addEventListener("click", () => {
    inset.classList.remove("open");
    backdrop.style.display = "none";
  });

  // Close inset by clicking backdrop
  backdrop.addEventListener("click", () => {
    inset.classList.remove("open");
    backdrop.style.display = "none";
  });
});

