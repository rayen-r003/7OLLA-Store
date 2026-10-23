let product = null;

let cart = JSON.parse(localStorage.getItem("sova_cart")) || [];

async function loadProduct() {
  const container = document.getElementById("productDetails");

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    container.innerHTML = `
      <p>Produit introuvable.</p>
      <a href="index.html">← Retour aux produits</a>
    `;
    return;
  }

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("active", true)
    .single();

  if (error || !data) {
    console.error(error);

    container.innerHTML = `
      <p>Produit introuvable.</p>
      <a href="index.html">← Retour aux produits</a>
    `;

    return;
  }

  product = data;

  document.title = `${product.name} - SOVA Store`;

  container.innerHTML = `
    <div class="product-detail">

      <div class="product-gallery">

  <div class="product-detail-image">
    ${
      product.image_url
        ? `<img
            id="mainProductImage"
            src="${escapeHTML(product.image_url)}"
            alt="${escapeHTML(product.name)}"
          >`
        : `<div class="no-image">SOVA</div>`
    }
  </div>

  ${
    product.image_url &&
    product.images &&
    product.images.length > 0
      ? `
        <div class="product-thumbnails">

          <button
            type="button"
            class="product-thumbnail active"
            onclick="changeProductImage(
              '${escapeHTML(product.image_url)}',
              this
            )"
          >
            <img
              src="${escapeHTML(product.image_url)}"
              alt="${escapeHTML(product.name)}"
            >
          </button>

          ${product.images
            .map(
              (image) => `
                <button
                  type="button"
                  class="product-thumbnail"
                  onclick="changeProductImage(
                    '${escapeHTML(image)}',
                    this
                  )"
                >
                  <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(product.name)}"
                  >
                </button>
              `
            )
            .join("")}

        </div>
      `
      : ""
  }

</div>

      <div class="product-detail-content">

        <small>
          ${escapeHTML(product.category)}
        </small>

        <h1>
          ${escapeHTML(product.name)}
        </h1>

        <div class="product-detail-prices">

          <strong class="product-detail-price">
            ${money(product.price)}
          </strong>

        ${
          product.old_price &&
          Number(product.old_price) > Number(product.price)
            ? `
              <span class="old-price">
                ${money(product.old_price)}
              </span>
      
              <span class="promo-badge">
                PROMO
              </span>
            `
            : ""
        }
      
      </div>

        <p class="product-detail-description">
          ${escapeHTML(product.description || "")}
        </p>

        <button
          class="primary"
          onclick="addToCart()"
        >
          Ajouter au panier
        </button>

      </div>

    </div>
  `;
}

function changeProductImage(imageUrl, button) {
  const mainImage = document.getElementById("mainProductImage");

  if (!mainImage) return;

  mainImage.src = imageUrl;

  document
    .querySelectorAll(".product-thumbnail")
    .forEach((thumbnail) => {
      thumbnail.classList.remove("active");
    });

  button.classList.add("active");
}

function addToCart() {
  if (!product) return;

  const item = cart.find((item) => item.id === product.id);

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

  showToast("✓ Produit ajouté au panier");
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
                <button onclick="changeQty('${item.id}', -1)">
                  −
                </button>

                <span>
                  ${item.quantity}
                </span>

                <button onclick="changeQty('${item.id}', 1)">
                  +
                </button>
              </div>
            </div>

            <button
              class="delete"
              onclick="removeItem('${item.id}')"
            >
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

function changeQty(id, change) {
  const item = cart.find((item) => item.id === id);

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

function toggleCart() {
  document.getElementById("cart").classList.toggle("open");

  document.getElementById("overlay").classList.toggle("show");
}
function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.sovaToastTimer);

  window.sovaToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
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

renderCart();
loadProduct();
