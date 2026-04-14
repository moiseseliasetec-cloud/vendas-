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
  deleteDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   FIREBASE CONFIG
   QUANDO VOCÊ CONECTAR, COLE AQUI
========================= */
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

/* =========================
   CONFIG ADMIN
========================= */
const ADMIN_EMAIL = "admin@marketstudy.com";
const ADMIN_DEMO_PASSWORD = "thomasshelby15";

/* =========================
   DETECTA SE O FIREBASE ESTÁ PRONTO
========================= */
const FIREBASE_READY = Object.values(firebaseConfig).every((value) => {
  const text = String(value || "");
  return text && !text.includes("SUA_") && !text.includes("SEU_");
});

let app = null;
let auth = null;
let db = null;

if (FIREBASE_READY) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

/* =========================
   PRODUTOS INICIAIS
========================= */
const defaultProducts = [
  {
    id: "demo-1",
    name: "Mapa mental personalizado",
    description: "Mapa mental de qualquer matéria. Digite a matéria/tema ao adicionar.",
    price: 15,
    stock: -1,
    needsSubject: true,
    images: ["img/mapa-mental-1.jpg", "img/mapa-mental-2.jpg"]
  },
  {
    id: "demo-2",
    name: "Cópia de matéria no caderno",
    description: "Cópia organizada no caderno. Digite a matéria no pedido.",
    price: 12,
    stock: -1,
    needsSubject: true,
    images: ["img/caderno-1.jpg", "img/caderno-2.jpg"]
  },
  {
    id: "demo-3",
    name: "Caneta Verde",
    description: "Caneta verde para escrita e marcação.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-verde-1.jpg"]
  },
  {
    id: "demo-4",
    name: "Caneta Rosa",
    description: "Caneta rosa com escrita suave.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-rosa-1.jpg"]
  },
  {
    id: "demo-5",
    name: "Caneta Roxa",
    description: "Caneta roxa para anotações bonitas.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-roxa-1.jpg"]
  },
  {
    id: "demo-6",
    name: "Caneta Azul",
    description: "Caneta azul clássica.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-azul-1.jpg"]
  },
  {
    id: "demo-7",
    name: "Caneta Azul Clara",
    description: "Caneta azul clara para destaque leve.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-azul-clara-1.jpg"]
  },
  {
    id: "demo-8",
    name: "Caneta Vermelha",
    description: "Caneta vermelha para correções.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-vermelha-1.jpg"]
  },
  {
    id: "demo-9",
    name: "Caneta Preta",
    description: "Caneta preta para uso geral.",
    price: 4.5,
    stock: 20,
    needsSubject: false,
    images: ["img/caneta-preta-1.jpg"]
  },
  {
    id: "demo-10",
    name: "Marca-texto",
    description: "Marca-texto. Depois você pode trocar a foto, a cor e adicionar mais imagens.",
    price: 6.5,
    stock: 15,
    needsSubject: false,
    images: ["img/marca-texto-amarelo-1.jpg"]
  }
];

/* =========================
   ELEMENTOS
========================= */
const splashScreen = document.getElementById("splashScreen");

const authSection = document.getElementById("authSection");
const storeSection = document.getElementById("storeSection");
const ordersSection = document.getElementById("ordersSection");
const adminSection = document.getElementById("adminSection");
const topbar = document.getElementById("topbar");

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const showRegisterBtn = document.getElementById("showRegisterBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const welcomeText = document.getElementById("welcomeText");
const btnOpenOrders = document.getElementById("btnOpenOrders");
const btnCart = document.getElementById("btnCart");
const btnCloseCart = document.getElementById("btnCloseCart");
const btnCheckout = document.getElementById("btnCheckout");
const btnLogout = document.getElementById("btnLogout");
const btnSeedProducts = document.getElementById("btnSeedProducts");

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

const productForm = document.getElementById("productForm");

/* =========================
   ESTADO
========================= */
let currentUser = null;
let productsCache = [];
let cart = [];
let splashFinished = false;

let myOrdersUnsub = null;
let allOrdersUnsub = null;
let productsUnsub = null;
let orderStatusMemory = {};

/* =========================
   LOCAL STORAGE - MODO DEMO
========================= */
const LS_USERS = "marketStudyUsers";
const LS_PRODUCTS = "marketStudyProducts";
const LS_ORDERS = "marketStudyOrders";
const LS_CURRENT_USER = "marketStudyCurrentUser";

function getLS(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function setLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensureDemoData() {
  const products = getLS(LS_PRODUCTS, null);
  if (!products || !products.length) {
    setLS(LS_PRODUCTS, defaultProducts);
  }

  const users = getLS(LS_USERS, null);
  if (!users) {
    setLS(LS_USERS, []);
  }

  const orders = getLS(LS_ORDERS, null);
  if (!orders) {
    setLS(LS_ORDERS, []);
  }
}

function getDemoProducts() {
  return getLS(LS_PRODUCTS, []);
}

function setDemoProducts(products) {
  setLS(LS_PRODUCTS, products);
}

function getDemoUsers() {
  return getLS(LS_USERS, []);
}

function setDemoUsers(users) {
  setLS(LS_USERS, users);
}

function getDemoOrders() {
  return getLS(LS_ORDERS, []);
}

function setDemoOrders(orders) {
  setLS(LS_ORDERS, orders);
}

function saveDemoCurrentUser(user) {
  if (user) {
    setLS(LS_CURRENT_USER, user);
  } else {
    localStorage.removeItem(LS_CURRENT_USER);
  }
}

function loadDemoCurrentUser() {
  return getLS(LS_CURRENT_USER, null);
}

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

function stockText(stock) {
  return stock === -1 ? "♾️ sem limite" : `${stock} em estoque`;
}

function getProductImage(product) {
  return product.images?.[0] || "https://via.placeholder.com/500x350?text=Produto";
}

function totalCartItems() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotalValue() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function formatDate(dateValue) {
  if (!dateValue) return "-";

  if (typeof dateValue === "string") {
    return new Date(dateValue).toLocaleString("pt-BR");
  }

  if (dateValue.toDate) {
    return dateValue.toDate().toLocaleString("pt-BR");
  }

  return new Date(dateValue).toLocaleString("pt-BR");
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

function statusClass(status) {
  return `status status-${status}`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
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

function cleanupListeners() {
  if (myOrdersUnsub) {
    myOrdersUnsub();
    myOrdersUnsub = null;
  }

  if (allOrdersUnsub) {
    allOrdersUnsub();
    allOrdersUnsub = null;
  }

  if (productsUnsub) {
    productsUnsub();
    productsUnsub = null;
  }
}

function authErrorMessage(error) {
  const code = error?.code || "";

  const map = {
    "auth/email-already-in-use": "Esse e-mail já está em uso.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/too-many-requests": "Muitas tentativas. Tente de novo mais tarde."
  };

  return map[code] || error?.message || "Ocorreu um erro.";
}

/* =========================
   UI AUTH
========================= */
function showLoginForm() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  authTitle.textContent = "Entrar";
  authSubtitle.textContent = "Acesse sua conta para continuar";
}

function showRegisterForm() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  authTitle.textContent = "Criar conta";
  authSubtitle.textContent = "Cadastre-se para começar a comprar";
}

/* =========================
   RENDER GERAL
========================= */
function renderAuthState() {
  authSection.classList.add("hidden");
  storeSection.classList.add("hidden");
  ordersSection.classList.add("hidden");
  adminSection.classList.add("hidden");
  topbar.classList.add("hidden");

  if (!splashFinished) return;

  if (currentUser) {
    topbar.classList.remove("hidden");
    welcomeText.textContent = `Olá, ${currentUser.displayName || "Cliente"}`;

    if (isAdmin()) {
      btnCart.classList.add("hidden");
      btnOpenOrders.classList.add("hidden");
      adminSection.classList.remove("hidden");
      listenProducts();
      listenAllOrders();
    } else {
      btnCart.classList.remove("hidden");
      btnOpenOrders.classList.remove("hidden");
      storeSection.classList.remove("hidden");
      ordersSection.classList.remove("hidden");
      listenProducts();
      listenMyOrders();
      renderCart();
    }
  } else {
    cart = [];
    renderCart();
    authSection.classList.remove("hidden");
    showLoginForm();
  }
}

/* =========================
   PRODUTOS
========================= */
function renderProducts() {
  if (!productsCache.length) {
    productsGrid.innerHTML = `
      <div class="empty-box">
        Ainda não existem produtos cadastrados.
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = productsCache
    .map((p) => {
      const thumbs = (p.images || [])
        .slice(0, 5)
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

function renderAdminProducts() {
  if (!adminProductsList) return;

  if (!productsCache.length) {
    adminProductsList.innerHTML = `
      <div class="empty-box">Nenhum produto cadastrado.</div>
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

function listenProducts() {
  if (FIREBASE_READY) {
    if (productsUnsub) productsUnsub();

    productsUnsub = onSnapshot(collection(db, "products"), (snapshot) => {
      productsCache = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      renderProducts();
      renderAdminProducts();
    });
    return;
  }

  productsCache = getDemoProducts().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  renderProducts();
  renderAdminProducts();
}

async function seedInitialProducts() {
  if (!isAdmin()) return;

  if (FIREBASE_READY) {
    try {
      const snap = await getDocs(collection(db, "products"));

      if (!snap.empty) {
        showToast("Já existem produtos cadastrados.", "warning");
        return;
      }

      for (const product of defaultProducts) {
        const { id, ...data } = product;
        await addDoc(collection(db, "products"), data);
      }

      showToast("Produtos iniciais criados com sucesso.");
    } catch {
      showToast("Erro ao criar produtos iniciais.", "error");
    }
    return;
  }

  const currentProducts = getDemoProducts();
  if (currentProducts.length) {
    showToast("Já existem produtos cadastrados.", "warning");
    return;
  }

  setDemoProducts(defaultProducts);
  listenProducts();
  showToast("Produtos iniciais criados com sucesso.");
}

async function addProduct(event) {
  event.preventDefault();
  if (!isAdmin()) return;

  const name = document.getElementById("prodName").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const stock = Number(document.getElementById("prodStock").value);
  const description = document.getElementById("prodDescription").value.trim();
  const images = document
    .getElementById("prodImages")
    .value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const needsSubject = document.getElementById("prodNeedsSubject").checked;

  if (!name || !images.length || Number.isNaN(price) || Number.isNaN(stock)) {
    showToast("Preencha os campos corretamente.", "warning");
    return;
  }

  const payload = {
    name,
    price,
    stock,
    description,
    images,
    needsSubject
  };

  if (FIREBASE_READY) {
    try {
      await addDoc(collection(db, "products"), payload);
      productForm.reset();
      showToast("Produto salvo com sucesso.");
    } catch {
      showToast("Erro ao salvar produto.", "error");
    }
    return;
  }

  const products = getDemoProducts();
  products.push({
    id: generateId("prod"),
    ...payload
  });
  setDemoProducts(products);
  productForm.reset();
  listenProducts();
  showToast("Produto salvo com sucesso.");
}

async function changeStock(productId, delta) {
  const product = productsCache.find((p) => p.id === productId);
  if (!product || product.stock === -1) return;

  if (FIREBASE_READY) {
    try {
      const newStock = Math.max(0, Number(product.stock) + delta);
      await updateDoc(doc(db, "products", productId), { stock: newStock });
      showToast("Estoque atualizado.");
    } catch {
      showToast("Erro ao atualizar estoque.", "error");
    }
    return;
  }

  const products = getDemoProducts().map((item) => {
    if (item.id === productId) {
      return { ...item, stock: Math.max(0, Number(item.stock) + delta) };
    }
    return item;
  });

  setDemoProducts(products);
  listenProducts();
  showToast("Estoque atualizado.");
}

async function removeProduct(productId) {
  if (!isAdmin()) return;

  const ok = confirm("Tem certeza que deseja excluir esse produto?");
  if (!ok) return;

  if (FIREBASE_READY) {
    try {
      await deleteDoc(doc(db, "products", productId));
      showToast("Produto excluído.");
    } catch {
      showToast("Erro ao excluir produto.", "error");
    }
    return;
  }

  const products = getDemoProducts().filter((item) => item.id !== productId);
  setDemoProducts(products);
  listenProducts();
  showToast("Produto excluído.");
}

/* =========================
   CARRINHO
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
      showToast("Item removido do carrinho.", "info");
    });
  });
}

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
  showToast("Produto adicionado ao carrinho.");
}

async function checkoutCart() {
  if (!currentUser) {
    showToast("Faça login primeiro.", "warning");
    return;
  }

  if (!cart.length) {
    showToast("Seu carrinho está vazio.", "warning");
    return;
  }

  const orderItems = cart.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subject: item.subject || "",
    image: item.image
  }));

  if (FIREBASE_READY) {
    try {
      const now = new Date();
      const orderRef = doc(collection(db, "orders"));

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

        transaction.set(orderRef, {
          userId: currentUser.uid,
          customerName: currentUser.displayName || "Cliente",
          customerEmail: currentUser.email,
          items: orderItems,
          total: cartTotalValue(),
          status: "pendente",
          createdAt: now,
          createdAtMs: Date.now(),
          updatedAt: now,
          updatedAtMs: Date.now()
        });
      });

      cart = [];
      renderCart();
      closeCart();
      showToast("Pedido enviado com sucesso!");
    } catch (error) {
      showToast(error.message || "Erro ao finalizar pedido.", "error");
    }
    return;
  }

  const products = getDemoProducts();

  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      showToast(`O produto ${item.name} não existe mais.`, "error");
      return;
    }

    if (product.stock !== -1 && product.stock < item.quantity) {
      showToast(`Estoque insuficiente para ${item.name}.`, "error");
      return;
    }
  }

  const updatedProducts = products.map((product) => {
    const cartItem = cart.find((item) => item.productId === product.id);

    if (!cartItem) return product;
    if (product.stock === -1) return product;

    return {
      ...product,
      stock: product.stock - cartItem.quantity
    };
  });

  const orders = getDemoOrders();
  const nowIso = new Date().toISOString();

  orders.push({
    id: generateId("order"),
    userId: currentUser.uid,
    customerName: currentUser.displayName || "Cliente",
    customerEmail: currentUser.email,
    items: orderItems,
    total: cartTotalValue(),
    status: "pendente",
    createdAt: nowIso,
    createdAtMs: Date.now(),
    updatedAt: nowIso,
    updatedAtMs: Date.now()
  });

  setDemoProducts(updatedProducts);
  setDemoOrders(orders);

  cart = [];
  renderCart();
  closeCart();
  listenProducts();
  listenMyOrders();
  showToast("Pedido enviado com sucesso!");
}

/* =========================
   PEDIDOS CLIENTE
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
  if (!currentUser || isAdmin()) return;

  if (FIREBASE_READY) {
    if (myOrdersUnsub) myOrdersUnsub();

    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid));

    myOrdersUnsub = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      orders.forEach((order) => {
        if (orderStatusMemory[order.id] && orderStatusMemory[order.id] !== order.status) {
          showToast(`Seu pedido foi atualizado para: ${statusLabel(order.status)}`, "info");
        }
        orderStatusMemory[order.id] = order.status;
      });

      renderMyOrders(orders);
    });

    return;
  }

  const orders = getDemoOrders()
    .filter((order) => order.userId === currentUser.uid)
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

  orders.forEach((order) => {
    if (orderStatusMemory[order.id] && orderStatusMemory[order.id] !== order.status) {
      showToast(`Seu pedido foi atualizado para: ${statusLabel(order.status)}`, "info");
    }
    orderStatusMemory[order.id] = order.status;
  });

  renderMyOrders(orders);
}

/* =========================
   PEDIDOS ADMIN
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
  if (!currentUser || !isAdmin()) return;

  if (FIREBASE_READY) {
    if (allOrdersUnsub) allOrdersUnsub();

    allOrdersUnsub = onSnapshot(collection(db, "orders"), (snapshot) => {
      const orders = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      renderAdminOrders(orders);
    });

    return;
  }

  const orders = getDemoOrders().sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  renderAdminOrders(orders);
}

async function updateOrderStatus(orderId, newStatus) {
  if (FIREBASE_READY) {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        updatedAt: new Date(),
        updatedAtMs: Date.now()
      });
      showToast(`Pedido atualizado para ${statusLabel(newStatus)}.`);
    } catch {
      showToast("Erro ao atualizar pedido.", "error");
    }
    return;
  }

  const orders = getDemoOrders().map((order) => {
    if (order.id === orderId) {
      return {
        ...order,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now()
      };
    }
    return order;
  });

  setDemoOrders(orders);
  listenAllOrders();
  if (!isAdmin()) listenMyOrders();
  showToast(`Pedido atualizado para ${statusLabel(newStatus)}.`);
}

/* =========================
   LOGIN / CADASTRO
========================= */
async function registerWithFirebase(name, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(userCredential.user, {
    displayName: name
  });

  await setDoc(doc(db, "users", userCredential.user.uid), {
    name,
    email,
    createdAt: new Date()
  });

  currentUser = {
    uid: userCredential.user.uid,
    displayName: name,
    email: userCredential.user.email
  };
}

function registerInDemo(name, email, password) {
  const users = getDemoUsers();

  const alreadyExists = users.find((user) => user.email === email);
  if (alreadyExists) {
    throw new Error("Esse e-mail já está em uso.");
  }

  const user = {
    uid: generateId("user"),
    name,
    email,
    password
  };

  users.push(user);
  setDemoUsers(users);

  currentUser = {
    uid: user.uid,
    displayName: user.name,
    email: user.email
  };

  saveDemoCurrentUser(currentUser);
}

async function loginWithFirebase(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  currentUser = {
    uid: userCredential.user.uid,
    displayName: userCredential.user.displayName || "Cliente",
    email: userCredential.user.email
  };
}

function loginInDemo(email, password) {
  const users = getDemoUsers();
  let user = users.find((item) => item.email === email && item.password === password);

  if (!user && email === ADMIN_EMAIL && password === ADMIN_DEMO_PASSWORD) {
    user = {
      uid: "admin-local",
      name: "Moises Elias",
      email: ADMIN_EMAIL
    };
  }

  if (!user) {
    throw new Error("E-mail ou senha inválidos.");
  }

  currentUser = {
    uid: user.uid,
    displayName: user.name || "Cliente",
    email: user.email
  };

  saveDemoCurrentUser(currentUser);
}

/* =========================
   EVENTOS
========================= */
showRegisterBtn.addEventListener("click", showRegisterForm);
showLoginBtn.addEventListener("click", showLoginForm);

btnCart.addEventListener("click", openCart);
btnCloseCart.addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
btnCheckout.addEventListener("click", checkoutCart);

btnOpenOrders.addEventListener("click", () => {
  ordersSection.scrollIntoView({ behavior: "smooth" });
});

btnLogout.addEventListener("click", async () => {
  if (FIREBASE_READY) {
    try {
      await signOut(auth);
      showToast("Você saiu da conta.", "info");
    } catch {
      showToast("Erro ao sair.", "error");
    }
    return;
  }

  currentUser = null;
  saveDemoCurrentUser(null);
  cleanupListeners();
  renderAuthState();
  showToast("Você saiu da conta.", "info");
});

btnSeedProducts.addEventListener("click", seedInitialProducts);
productForm.addEventListener("submit", addProduct);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (!name || !email || !password) {
    showToast("Preencha todos os campos.", "warning");
    return;
  }

  try {
    if (FIREBASE_READY) {
      await registerWithFirebase(name, email, password);
    } else {
      registerInDemo(name, email, password);
      showToast("Conta criada no modo local/demo.");
    }

    renderAuthState();
    showToast("Conta criada com sucesso!");
  } catch (error) {
    showToast(authErrorMessage(error), "error");
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value
