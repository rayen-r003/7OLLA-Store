const cart = JSON.parse(localStorage.getItem("sova_cart")) || [];

const DELIVERY_FEE = 8;

const itemsContainer = document.getElementById("checkoutItems");

const totalElement = document.getElementById("checkoutTotal");

const checkoutForm = document.getElementById("checkoutForm");

// ===============================
// AFFICHER LE PANIER
// ===============================

function renderCheckout() {
  if (cart.length === 0) {
    itemsContainer.innerHTML = `
            <p>Votre panier est vide.</p>

            <a href="index.html" class="primary">
                Retour à la boutique
            </a>
        `;

    totalElement.textContent = "0 DT";

    document.getElementById("confirmOrder").disabled = true;

    return;
  }

  itemsContainer.innerHTML = cart
    .map(
      (item) => `

            <div class="checkout-item">

                <div>
                    <strong>
                        ${escapeHTML(item.name)}
                    </strong>

                    <p>
                        Quantité : ${item.quantity}
                    </p>
                </div>

                <strong>
                    ${money(Number(item.price) * item.quantity)}
                </strong>

            </div>

        `
    )
    .join("");

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const total = subtotal + DELIVERY_FEE;

  const existingDelivery = document.getElementById("deliveryFee");

  if (!existingDelivery) {
    totalElement.insertAdjacentHTML(
      "beforebegin",
      `
            <div id="deliveryFee" class="checkout-delivery">
              <span>Livraison</span>
              <strong>${money(DELIVERY_FEE)}</strong>
            </div>
          `
    );
  }

  totalElement.textContent = money(total);
}

// ===============================
// CONFIRMER COMMANDE
// ===============================

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (cart.length === 0) {
    return;
  }

  const button = document.getElementById("confirmOrder");

  const errorElement = document.getElementById("orderError");

  button.disabled = true;

  button.textContent = "Confirmation...";

  errorElement.textContent = "";

  try {
    const items = cart.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    }));

    const { data, error } = await db.rpc("create_order", {
      p_customer_name: document.getElementById("customerName").value.trim(),

      p_phone: document.getElementById("customerPhone").value.trim(),

      p_governorate: document.getElementById("customerGovernorate").value,

      p_address: document.getElementById("customerAddress").value.trim(),

      p_note: document.getElementById("customerNote").value.trim(),

      p_items: items,
    });

    if (error) {
      throw error;
    }

    // Vider le panier
    localStorage.removeItem("sova_cart");

    // Cacher formulaire + résumé
    document.querySelector(".checkout-form").style.display = "none";

    document.querySelector(".checkout-summary").style.display = "none";

    // Afficher succès
    document.getElementById("orderSuccess").style.display = "block";

    document.getElementById("orderNumber").textContent = "#" + data;
  } catch (error) {
    console.error(error);

    errorElement.textContent =
      "Impossible de confirmer la commande. Veuillez réessayer.";

    button.disabled = false;

    button.textContent = "Confirmer ma commande";
  }
});

// ===============================
// OUTILS
// ===============================

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

renderCheckout();
