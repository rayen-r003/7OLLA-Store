let products = [];
let cart = JSON.parse(localStorage.getItem("sova_cart")) || [];

async function loadProducts() {
  const grid = document.getElementById("productGrid");

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    grid.innerHTML = "<p>Impossible de charger les produits.</p>";

    console.error(error);
    return;
  }

  products = data;

  createCategories();
  renderProducts();
}

function createCategories() {
  const select = document.getElementById("category");

  const categories = [...new Set(products.map((p) => p.category))];

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    select.appendChild(option);
  });
}

function renderProducts() {
  const grid = document.getElementById("productGrid");

  const search = document.getElementById("search").value.toLowerCase();

  const category = document.getElementById("category").value;

  const filtered = products.filter((product) => {
    const searchOK =
      product.name.toLowerCase().includes(search) ||
      (product.description || "").toLowerCase().includes(search) ||
      (product.category || "").toLowerCase().includes(search);

    const categoryOK = !category || product.category === category;

    return searchOK && categoryOK;
  });

  if (!filtered.length) {
    grid.innerHTML = "<p>Aucun produit disponible.</p>";

    return;
  }

  grid.innerHTML = filtered
    .map(
      (product) => `

      <article
      class="product"
      onclick="openProduct('${product.id}')">

            <div class="image">

                ${
                  product.image_url
                    ? `<img
                        src="${escapeHTML(product.image_url)}"
                        alt="${escapeHTML(product.name)}"
                        loading="lazy"
                       >`
                    : `<div class="no-image">SOVA</div>`
                }

            </div>

            <div class="product-content">

                <small>
                    ${escapeHTML(product.category)}
                </small>

                <h3>
                    ${escapeHTML(product.name)}
                </h3>

                <p>
                    ${escapeHTML(product.description || "")}
                </p>

                <div class="product-footer">

                    <strong>
                        ${money(product.price)}
                    </strong>

                    <button onclick="event.stopPropagation(); addToCart('${
                      product.id
                    }')">
                      Ajouter
                    </button>

                </div>

            </div>

        </article>

    `
    )
    .join("");
}

function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

function addToCart(id) {
  const product = products.find((p) => p.id === id);

  if (!product) return;

  const item = cart.find((p) => p.id === id);

  if (item) {
    item.quantity++;
  } else {
    cart.push({
      id: product.id,

      name: product.name,

      price: Number(product.price),

      image_url: product.image_url,

      quantity: 1,
    });
  }

  saveCart();
}

function changeQty(id, change) {
  const item = cart.find((i) => i.id === id);

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    removeItem(id);

    return;
  }

  saveCart();
}

function removeItem(id) {
  cart = cart.filter((item) => item.id !== id);

  saveCart();
}

function saveCart() {
  localStorage.setItem("sova_cart", JSON.stringify(cart));

  renderCart();
}

function renderCart() {
  const container = document.getElementById("cartItems");

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  document.getElementById("cartCount").textContent = count;

  if (!cart.length) {
    container.innerHTML = `
            <div class="empty">
                Votre panier est vide.
            </div>
        `;
  } else {
    container.innerHTML = cart
      .map(
        (item) => `

            <div class="cart-item">

                <div>

                    <strong>
                        ${escapeHTML(item.name)}
                    </strong>

                    <p>
                        ${money(item.price)}
                    </p>

                    <div class="qty">

                        <button
                        onclick="changeQty('${item.id}',-1)">
                            −
                        </button>

                        <span>
                            ${item.quantity}
                        </span>

                        <button
                        onclick="changeQty('${item.id}',1)">
                            +
                        </button>

                    </div>

                </div>

                <button
                    class="delete"
                    onclick="removeItem('${item.id}')">
                    Supprimer
                </button>

            </div>

        `
      )
      .join("");
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById("cartTotal").textContent = money(total);
}

function toggleCart() {
  document.getElementById("cart").classList.toggle("open");

  document.getElementById("overlay").classList.toggle("show");
}

function money(value) {
  return (
    Number(value)
      .toFixed(3)
      .replace(/\.?0+$/, "") + " DT"
  );
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("search").addEventListener("input", renderProducts);

document.getElementById("category").addEventListener("change", renderProducts);

renderCart();
loadProducts();
