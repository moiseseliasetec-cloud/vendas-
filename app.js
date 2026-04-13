import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  runTransaction,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   FIREBASE CONFIG
   COLE A SUA CONFIG AQUI
========================= */
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   CONFIG DO ADMIN
========================= */
const ADMIN_EMAIL = "SEU_EMAIL_ADMIN_AQUI";
const ADMIN_NAME = "Moises Elias";

/* =========================
   ELEMENTOS
========================= */
const authSection = document.getElementById("authSection");
const storeSection = document.getElementById("storeSection");
const ordersSection = document.getElementById("ordersSection");
const adminSection = document.getElementById("adminSection");
const topbar = document.getElementById("topbar");

const welcomeText = document.getElementById("welcomeText");
const productsGrid = document.getElementById("productsGrid");
const myOrdersList = document.getElementById("myOrdersList");
const adminOrdersList = document.getElementById("adminOrdersList");
const adminProductsList = document.getElementById("adminProductsList");

const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const toastContainer = document.getElementById("toastContainer");

const btnCart = document.getElementById("btnCart");
const btnCloseCart = document.getElementById("btnCloseCart");
const btnCheckout = document.getElementById("btnCheckout");
const btnLogout = document.getElementById("btnLogout");
const btnOpenOrders = document.getElementById("btnOpenOrders");
const btnSeedProducts = document.getElementById("btnSeedProducts");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const productForm = document.getElementById("productForm");

/* =========================
   ESTADO
========================= */
let currentUser = null;
let productsCache = [];
let cart = [];
let myOrdersUnsub = null;
let allOrdersUnsub = null;
let productsUnsub = null;
let orderStatusMemory = {};

/* =========================
   PRODUTOS INICIAIS
========================= */
const defaultProducts = [
  {
    name: "Mapa mental personalizado",
    description: "Mapa mental de qualquer matéria. Digite a matéria/tema ao adicionar.",
    price: 15,
    stock: -1,
    needsSubject: true,
    images: ["img/mapa-mental-1.jpg", "img/mapa-mental-2.jpg"]
  },
  {
    name: "Cópia de matéria no caderno",
    description: "Cópia organizada no caderno. Digite a matéria no pedido.",
    price: 12,
    stock: -1,
    needsSubject: true,
    images: ["img/caderno-1.jpg", "img/caderno-2.jpg"]
  },
  {
    name: "Caneta Verde",
    description: "Caneta verde para escrita e marcação.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-verde-1.jpg"]
  },
  {
    name: "Caneta Rosa",
    description: "Caneta rosa com escrita suave.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-rosa-1.jpg"]
  },
  {
    name: "Caneta Roxa",
    description: "Caneta roxa para anotações bonitas.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-roxa-1.jpg"]
  },
  {
    name: "Caneta Azul",
    description: "Caneta azul clássica.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-azul-1.jpg"]
  },
  {
    name: "Caneta Azul Clara",
    description: "Caneta azul clara para destaque leve.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-azul-clara-1.jpg"]
  },
  {
    name: "Caneta Vermelha",
    description: "Caneta vermelha para correções.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-vermelha-1.jpg"]
  },
  {
    name: "Caneta Preta",
    description: "Caneta preta para uso geral.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-preta-1.jpg"]
  },
  {
    name: "Marca-texto",
    description: "Marca-texto. Depois você pode trocar a foto e o nome da cor.",
    price: 6.5,
    stock: 15,
    needsSubject: false,
    images: ["img/marca-texto-amarelo-1.jpg"]
  }
];

/* =========================
   HELPERS
========================= */
function isAdmin() {
  return currentUser?.email === ADMIN_EMAIL;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = value.toDate ? value.toDate() : new Date(value);
  return date.toLocaleString("pt-BR");
}

function stockText(stock) {
  return stock === -1 ? "♾️ sem limite" : `${stock} em estoque`;
}

function statusClass(status) {
  return `status status-${status}`;
}

function statusLabel(status) {
  const map = {
    pendente: "Pendente",
    aceito: "Aceito",
    enviado: "Enviado",
    entregue: "Entregue"
  };
  return map[status] || status;
}

function showToast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.remove("hidden");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  overlay.classList.add("hidden");
}

function getProductImage(product) {
  return product.images?.[0] || "https://via.placeholder.com/500x350?text=Produto";
}

function cartTotalValue() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function totalCartItems() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/* =========================
   RENDER PRODUTOS
========================= */
function renderProducts() {
  if (!productsCache.length) {
    productsGrid.innerHTML = `
      <div class="empty-box">
        Ainda não existem produtos cadastrados.<br>
        Se você estiver no admin, clique em <strong>Criar produtos iniciais</strong>.
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = productsCache
    .map((p) => {
      const thumbs = (p.images || [])
        .slice(0, 4)
        .map((img) => `<img src="${img}" alt="${p.name}">`)
        .join("");

      return `
        <div class="product-card">
          <div class="product-image-wrap">
            <img class="product-image" src="${getProductImage(p)}" alt="${p.name}">
            <span class="stock-badge">${stockText(p.stock)}</span>
          </div>

          <div class="product-body">
            <h3>${p.name}</h3>
            <p class="price">${money(p.price)}</p>
            <p class="desc">${p.description || ""}</p>

            ${thumbs ? `<div class="thumb-row">${thumbs}</div>` : ""}

            ${
              p.needsSubject
                ? `<input id="subject-${p.id}" type="text" placeholder="Digite a matéria / tema">`
                : ""
            }

            <div class="buy-row">
              <input id="qty-${p.id}" class="qty-input" type="number" min="1" value="1">
              <button class="btn btn-primary" data-add="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
                ${p.stock === 0 ? "Sem estoque" : "Adicionar ao carrinho"}
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

/* =========================
   RENDER CARRINHO
========================= */
function renderCart() {
  cartCount.textContent = totalCartItems();
  cartTotal.textContent = money(cartTotalValue());

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="empty-box">
        Seu carrinho está vazio.
      </div>
    `;
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item, index) => `
      <div class="cart-item">
        <div class="cart-item-top">
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-meta">
            <h3>${item.name}</h3>
            <div class="item-line">Quantidade: ${item.quantity}</div>
            ${
              item.subject
                ? `<div class="item-line">Matéria/Tema: <strong>${item.subject}</strong></div>`
                : ""
            }
            <div class="item-line"><strong>${money(item.price * item.quantity)}</strong></div>
          </div>
        </div>
        <div class="order-actions">
          <button class="btn btn-light" data-remove="${index}">Remover</button>
        </div>
      </div>
    `
    )
    .join("");

  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart.splice(Number(btn.dataset.remove), 1);
      renderCart();
      showToast("Item removido do carrinho", "info");
    });
  });
}

/* =========================
   ADICIONAR AO CARRINHO
========================= */
function addToCart(productId) {
  const product = productsCache.find((p) => p.id === productId);
  if (!product) return;

  const qtyInput = document.getElementById(`qty-${product.id}`);
  const subjectInput = document.getElementById(`subject-${product.id}`);

  const quantity = Math.max(1, Number(qtyInput?.value || 1));
  const subject = subjectInput?.value?.trim() || "";

  if (product.needsSubject && !subject) {
    showToast("Digite a matéria/tema antes de adicionar.", "warning");
    return;
  }

  if (product.stock !== -1) {
    const alreadyInCart = cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (alreadyInCart + quantity > product.stock) {
      showToast("Quantidade maior do que o estoque disponível.", "error");
      return;
    }
  }

  const existing = cart.find(
    (item) => item.productId === product.id && item.subject === subject
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      subject,
      image: getProductImage(product)
    });
  }

  renderCart();
  showToast("Produto adicionado ao carrinho");
}

/* =========================
   FINALIZAR PEDIDO
========================= */
async function checkoutCart() {
  if (!currentUser) {
    showToast("Faça login primeiro.", "warning");
    return;
  }

  if (!cart.length) {
    showToast("Seu carrinho está vazio.", "warning");
    return;
  }

  try {
    const orderItems = cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subject: item.subject || "",
      image: item.image
    }));

    await runTransaction(db, async (transaction) => {
      for (const item of cart) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error(`O produto ${item.name} não existe mais.`);
        }

        const productData = productSnap.data();

        if (productData.stock !== -1) {
          const currentStock = Number(productData.stock || 0);

          if (currentStock < item.quantity) {
            throw new Error(`Estoque insuficiente para ${item.name}.`);
          }

          transaction.update(productRef, {
            stock: currentStock - item.quantity
          });
        }
      }

      const orderRef = doc(collection(db, "orders"));

      transaction.set(orderRef, {
        userId: currentUser.uid,
        customerName: currentUser.displayName || "Cliente",
        customerEmail: currentUser.email,
        items: orderItems,
        total: cartTotalValue(),
        status: "pendente",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    cart = [];
    renderCart();
    closeCart();
    showToast("Pedido enviado com sucesso!");
  } catch (error) {
    showToast(error.message || "Erro ao finalizar pedido.", "error");
  }
}

/* =========================
   PEDIDOS DO CLIENTE
========================= */
function renderMyOrders(orders) {
  if (!orders.length) {
    myOrdersList.innerHTML = `
      <div class="empty-box">
        Você ainda não fez nenhum pedido.
      </div>
    `;
    return;
  }

  myOrdersList.innerHTML = orders
    .map((order) => {
      const itemsHtml = order.items
        .map(
          (item) => `
            <div class="item-line">
              • ${item.name} — ${item.quantity}x
              ${item.subject ? `| Matéria: <strong>${item.subject}</strong>` : ""}
            </div>
          `
        )
        .join("");

      return `
        <div class="order-card">
          <h3>Pedido #${order.id.slice(0, 8)}</h3>
          <div class="${statusClass(order.status)}">${statusLabel(order.status)}</div>
          <div class="item-line"><strong>Data:</strong> ${formatDate(order.createdAt)}</div>
          <div class="item-line"><strong>Total:</strong> ${money(order.total)}</div>
          <div class="item-line"><strong>Itens:</strong></div>
          ${itemsHtml}
        </div>
      `;
    })
    .join("");
}

function listenMyOrders() {
  if (myOrdersUnsub) myOrdersUnsub();

  if (!currentUser || isAdmin()) return;

  const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));

  myOrdersUnsub = onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    orders.forEach((order) => {
      if (orderStatusMemory[order.id] && orderStatusMemory[order.id] !== order.status) {
        showToast(`Seu pedido foi atualizado para: ${statusLabel(order.status)}`, "info");
      }
      orderStatusMemory[order.id] = order.status;
    });

    renderMyOrders(orders);
  });
}

/* =========================
   PEDIDOS DO ADMIN
========================= */
function renderAdminOrders(orders) {
  if (!orders.length) {
    adminOrdersList.innerHTML = `
      <div class="empty-box">
        Nenhum pedido recebido ainda.
      </div>
    `;
    return;
  }

  adminOrdersList.innerHTML = orders
    .map((order) => {
      const itemsHtml = order.items
        .map(
          (item) => `
            <div class="item-line">
              • ${item.name} — ${item.quantity}x
              ${item.subject ? `| Matéria: <strong>${item.subject}</strong>` : ""}
            </div>
          `
        )
        .join("");

      return `
        <div class="order-card">
          <h3>Pedido #${order.id.slice(0, 8)}</h3>

          <div class="item-line"><strong>Cliente:</strong> ${order.customerName}</div>
          <div class="item-line"><strong>E-mail:</strong> ${order.customerEmail}</div>
          <div class="item-line"><strong>Data:</strong> ${formatDate(order.createdAt)}</div>
          <div class="item-line"><strong>Total:</strong> ${money(order.total)}</div>

          <div class="${statusClass(order.status)}">${statusLabel(order.status)}</div>

          <div class="item-line" style="margin-top:10px;"><strong>Itens:</strong></div>
          ${itemsHtml}

          <div class="order-actions">
            <button class="btn btn-secondary" data-status="${order.id}|aceito">Aceitar</button>
            <button class="btn btn-light" data-status="${order.id}|enviado">Enviado</button>
            <button class="btn btn-primary" data-status="${order.id}|entregue">Entregue</button>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll("[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [orderId, newStatus] = btn.dataset.status.split("|");
      await updateOrderStatus(orderId, newStatus);
    });
  });
}

function listenAllOrders() {
  if (allOrdersUnsub) allOrdersUnsub();

  if (!currentUser || !isAdmin()) return;

  allOrdersUnsub = onSnapshot(collection(db, "orders"), (snapshot) => {
    const orders = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

    renderAdminOrders(orders);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: newStatus,
      updatedAt: new Date()
    });
    showToast(`Pedido atualizado para ${statusLabel(newStatus)}`);
  } catch (error) {
    showToast("Erro ao atualizar pedido.", "error");
  }
}

/* =========================
   PRODUTOS ADMIN
========================= */
function renderAdminProducts() {
  if (!productsCache.length) {
    adminProductsList.innerHTML = `
      <div class="empty-box">
        Nenhum produto cadastrado.
      </div>
    `;
    return;
  }

  adminProductsList.innerHTML = productsCache
    .map((p) => `
      <div class="admin-product-card">
        <h3>${p.name}</h3>
        <div class="item-line"><strong>Preço:</strong> ${money(p.price)}</div>
        <div class="item-line"><strong>Estoque:</strong> ${stockText(p.stock)}</div>
        <div class="item-line muted">${p.description || ""}</div>

        <div class="stock-actions">
          ${
            p.stock !== -1
              ? `
                <button class="btn btn-light" data-stock-minus="${p.id}">-1 estoque</button>
                <button class="btn btn-secondary" data-stock-plus="${p.id}">+1 estoque</button>
              `
              : ""
          }
          <button class="btn btn-dark" data-delete-product="${p.id}">Excluir</button>
        </div>
      </div>
    `)
    .join("");

  document.querySelectorAll("[data-stock-plus]").forEach((btn) => {
    btn.addEventListener("click", () => changeStock(btn.dataset.stockPlus, 1));
  });

  document.querySelectorAll("[data-stock-minus]").forEach((btn) => {
    btn.addEventListener("click", () => changeStock(btn.dataset.stockMinus, -1));
  });

  document.querySelectorAll("[data-delete-product]").forEach((btn) => {
    btn.addEventListener("click", () => removeProduct(btn.dataset.deleteProduct));
  });
}

async function changeStock(productId, delta) {
  try {
    const product = productsCache.find((p) => p.id === productId);
    if (!product || product.stock === -1) return;

    const newStock = Math.max(0, Number(product.stock) + delta);
    await updateDoc(doc(db, "products", productId), { stock: newStock });
    showToast("Estoque atualizado");
  } catch (error) {
    showToast("Erro ao atualizar estoque
