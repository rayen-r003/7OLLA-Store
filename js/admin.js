const loginSection = document.getElementById("loginSection");

const dashboard = document.getElementById("dashboard");

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return (
    Number(value)
      .toFixed(3)
      .replace(/\.?0+$/, "") + " DT"
  );
}

/* ================= LOGIN ================= */

document
  .getElementById("loginForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value;

    const password = document.getElementById("adminPassword").value;

    const { error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      document.getElementById("loginError").textContent =
        "Email ou mot de passe incorrect.";

      return;
    }

    await checkAdmin();
  });

async function checkAdmin() {
  const { data: authData } = await db.auth.getUser();

  const user = authData.user;

  if (!user) {
    loginSection.style.display = "flex";
    dashboard.style.display = "none";

    return;
  }

  const { data, error } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    await db.auth.signOut();

    loginSection.style.display = "flex";
    dashboard.style.display = "none";

    document.getElementById("loginError").textContent =
      "Ce compte n'est pas administrateur.";

    return;
  }

  loginSection.style.display = "none";
  dashboard.style.display = "block";

  await Promise.all([loadOrders(), loadAdminProducts()]);
}

async function logout() {
  await db.auth.signOut();

  location.reload();
}

/* ================= ORDERS ================= */

async function loadOrders() {
  const { data, error } = await db
    .from("orders")
    .select(
      `
            *,
            order_items (*)
        `
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);

    document.getElementById("ordersList").textContent = "Erreur de chargement.";

    return;
  }

  renderStats(data);

  const container = document.getElementById("ordersList");

  if (!data.length) {
    container.innerHTML = "<p>Aucune commande.</p>";

    return;
  }

  container.innerHTML = data
    .map(
      (order) => `

        <article class="order-card">

            <div class="order-header">

                <div>
                    <strong>
                        Commande #${order.order_number}
                    </strong>

                    <small>
                        ${new Date(order.created_at).toLocaleString("fr-TN")}
                    </small>
                </div>

                <span class="status">
                    ${statusName(order.status)}
                </span>

            </div>


            <div class="customer">

                <strong>
                    ${escapeHTML(order.customer_name)}
                </strong>

                <p>
                    📞 ${escapeHTML(order.phone)}
                </p>

                <p>
                    📍 ${escapeHTML(order.governorate)}
                    —
                    ${escapeHTML(order.address)}
                </p>

                ${
                  order.note
                    ? `<p>Note :
                        ${escapeHTML(order.note)}
                       </p>`
                    : ""
                }

            </div>


            <div class="order-products">

                ${order.order_items
                  .map(
                    (item) => `

                    <div>
                        <span>
                            ${escapeHTML(item.product_name)}
                            × ${item.quantity}
                        </span>

                        <strong>
                            ${money(item.unit_price * item.quantity)}
                        </strong>
                    </div>

                `
                  )
                  .join("")}

            </div>


            <div class="total">

                <span>Total</span>

                <strong>
                    ${money(order.total)}
                </strong>

            </div>


            <div class="order-actions">

    <select
        onchange="
        updateStatus(
            '${order.id}',
            this.value
        )"
    >
        ${statusOptions(order.status)}
    </select>

    <button
        type="button"
        class="delete-order"
        onclick="deleteOrder('${order.id}')"
    >
        🗑 Supprimer
    </button>

</div>

        </article>

    `
    )
    .join("");
}

function statusOptions(current) {
  const statuses = {
    pending: "En attente",
    confirmed: "Confirmée",
    shipped: "Expédiée",
    delivered: "Livrée",
    cancelled: "Annulée",
  };

  return Object.entries(statuses)
    .map(
      ([value, label]) => `

            <option
                value="${value}"
                ${current === value ? "selected" : ""}
            >
                ${label}
            </option>

        `
    )
    .join("");
}

function statusName(status) {
  const names = {
    pending: "🟠 En attente",
    confirmed: "🔵 Confirmée",
    shipped: "🚚 Expédiée",
    delivered: "🟢 Livrée",
    cancelled: "🔴 Annulée",
  };

  return names[status] || status;
}

async function updateStatus(id, status) {
  const { error } = await db.from("orders").update({ status }).eq("id", id);

  if (error) {
    alert("Erreur.");

    console.error(error);

    return;
  }

  await loadOrders();
}

async function deleteOrder(id) {
  const confirmed = confirm(
    "Voulez-vous vraiment supprimer cette commande ?\nCette action est irréversible."
  );

  if (!confirmed) return;

  const { error } = await db.rpc("delete_order", {
    p_order_id: id,
  });

  if (error) {
    console.error(error);
    alert("Erreur lors de la suppression de la commande.");
    return;
  }

  alert("Commande supprimée avec succès ✓");

  await loadOrders();
}

function renderStats(orders) {
  const pending = orders.filter((o) => o.status === "pending").length;

  const delivered = orders.filter((o) => o.status === "delivered");

  const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);

  document.getElementById("statOrders").textContent = orders.length;

  document.getElementById("statPending").textContent = pending;

  document.getElementById("statDelivered").textContent = delivered.length;

  document.getElementById("statRevenue").textContent = money(revenue);
}

/* ================= PRODUCTS ================= */

async function loadAdminProducts() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("adminProducts").innerHTML = data
    .map(
      (product) => `

        <div class="admin-product">

            <div>

                <strong>
                    ${escapeHTML(product.name)}
                </strong>

                <p>
                    ${money(product.price)}
                </p>

                <small>
                    ${product.active ? "Actif" : "Désactivé"}
                </small>

            </div>


            <button
                onclick='editProduct(
                    ${JSON.stringify(product).replaceAll("'", "&#39;")}
                )'
            >
                Modifier
            </button>

        </div>

    `
    )
    .join("");
}

document
  .getElementById("productForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = event.target.querySelector('button[type="submit"]');

    const id = document.getElementById("productId").value;

    const imageFile = document.getElementById("productImageFile").files[0];

    const extraImageFiles = Array.from(
  document.getElementById("productExtraImages").files
);

    button.disabled = true;
    button.textContent = "Enregistrement...";

    try {
      // ====================================
      // 1. RÉCUPÉRER L'ANCIENNE IMAGE
      // ====================================

      let imageUrl = event.target.dataset.currentImage || null;

      // ====================================
      // 2. UPLOAD NOUVELLE IMAGE
      // ====================================

      if (imageFile) {
        // Vérification du type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(imageFile.type)) {
          throw new Error(
            "Format image non accepté. Utilisez JPG, PNG ou WEBP."
          );
        }

        // Maximum 5 MB
        if (imageFile.size > 5 * 1024 * 1024) {
          throw new Error("L'image ne doit pas dépasser 5 MB.");
        }

        const extension = imageFile.name.split(".").pop().toLowerCase();

        const fileName = `products/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await db.storage
          .from("product-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // ====================================
        // 3. OBTENIR URL PUBLIQUE
        // ====================================

        const { data: publicData } = db.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;
      }

      // ====================================
      // 4. PRÉPARER PRODUIT
      // ====================================
      const oldPriceValue =
      document.getElementById("productOldPrice").value;
      const product = {
        name: document.getElementById("productName").value.trim(),

        category: document.getElementById("productCategory").value.trim(),

        price: Number(document.getElementById("productPrice").value),

        old_price: oldPriceValue ? Number(oldPriceValue) : null,

        stock: 0,

        image_url: imageUrl,

        description: document.getElementById("productDescription").value.trim(),

        active: document.getElementById("productActive").checked,
      };

      // ====================================
      // 5. UPDATE OU INSERT
      // ====================================

      let result;

      if (id) {
        result = await db.from("products").update(product).eq("id", id);
      } else {
        result = await db.from("products").insert(product);
      }

      if (result.error) {
        throw result.error;
      }

      // ====================================
      // 6. RESET FORMULAIRE
      // ====================================

      event.target.reset();

      delete event.target.dataset.currentImage;

      document.getElementById("productId").value = "";

      document.getElementById("productActive").checked = true;

      document.getElementById("currentImage").innerHTML = "";

      await loadAdminProducts();

      alert(
        id ? "Produit modifié avec succès ✓" : "Produit ajouté avec succès ✓"
      );
    } catch (error) {
      console.error(error);

      alert(
        "Erreur : " + (error.message || "Impossible d'enregistrer le produit.")
      );
    } finally {
      button.disabled = false;
      button.textContent = "Enregistrer";
    }
  });

function editProduct(product) {
  document.getElementById("productId").value = product.id;

  document.getElementById("productName").value = product.name;

  document.getElementById("productCategory").value = product.category;

  document.getElementById("productPrice").value = product.price;

  document.getElementById("productOldPrice").value =
  product.old_price ?? "";

  document.getElementById("productDescription").value =
    product.description || "";

  document.getElementById("productActive").checked = product.active;

  // Conserver l'image actuelle
  document.getElementById("productForm").dataset.currentImage =
    product.image_url || "";

  // Afficher l'image actuelle
  const preview = document.getElementById("currentImage");

  if (product.image_url) {
    preview.innerHTML = `
            <p>Image actuelle :</p>

            <img
                src="${escapeHTML(product.image_url)}"
                alt="Image produit"
                style="
                    width:120px;
                    height:120px;
                    object-fit:cover;
                    border-radius:12px;
                    margin-top:8px;
                "
            >
        `;
  } else {
    preview.innerHTML = "<p>Aucune image actuelle.</p>";
  }

  // Vider le sélecteur
  document.getElementById("productImageFile").value = "";

  document.getElementById("productForm").scrollIntoView({
    behavior: "smooth",
  });
}
function showOrders() {
  document.getElementById("ordersSection").style.display = "block";
  document.getElementById("productsSection").style.display = "none";
}

function showProducts() {
  document.getElementById("ordersSection").style.display = "none";
  document.getElementById("productsSection").style.display = "block";
}
function showTab(tab) {
  const ordersTab = document.getElementById("ordersTab");

  const productsTab = document.getElementById("productsTab");

  if (tab === "orders") {
    ordersTab.style.display = "block";
    productsTab.style.display = "none";
  }

  if (tab === "products") {
    ordersTab.style.display = "none";
    productsTab.style.display = "block";
  }
}

function showProductForm() {
  const form = document.getElementById("productForm");

  form.style.display = "grid";

  form.reset();

  document.getElementById("productId").value = "";

  document.getElementById("productActive").checked = true;

  document.getElementById("currentImage").innerHTML = "";

  delete form.dataset.currentImage;

  form.scrollIntoView({
    behavior: "smooth",
  });
}
checkAdmin();
