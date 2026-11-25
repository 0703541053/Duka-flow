const STORAGE_KEY = "dukaflow-v1";
const LOW_STOCK_LIMIT = 5;

const starterData = {
  products: [
    { id: "p1", name: "Classic tote bag", category: "Accessories", price: 850, stock: 3 },
    { id: "p2", name: "Everyday water bottle", category: "Home & living", price: 1200, stock: 4 },
    { id: "p3", name: "Linen shirt", category: "Clothing", price: 1850, stock: 2 },
    { id: "p4", name: "Woven storage basket", category: "Home & living", price: 1400, stock: 14 },
    { id: "p5", name: "Canvas pouch", category: "Accessories", price: 600, stock: 9 },
  ],
  orders: [
    { id: "DF-1042", customer: "Amina Wanjiku", phone: "0712345678", productId: "p1", productName: "Classic tote bag", quantity: 1, total: 850, status: "Pending", createdAt: "2026-11-23T09:15:00" },
    { id: "DF-1041", customer: "Brian Otieno", phone: "0723456789", productId: "p4", productName: "Woven storage basket", quantity: 1, total: 1400, status: "Paid", createdAt: "2026-11-23T08:40:00" },
    { id: "DF-1040", customer: "Njeri Kamau", phone: "", productId: "p2", productName: "Everyday water bottle", quantity: 2, total: 2400, status: "Ready", createdAt: "2026-11-22T15:20:00" },
    { id: "DF-1039", customer: "Kevin Mwangi", phone: "0700111222", productId: "p5", productName: "Canvas pouch", quantity: 1, total: 600, status: "Completed", createdAt: "2026-11-22T12:05:00" },
  ],
  nextOrder: 1043,
};

const money = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
const byId = (id) => document.getElementById(id);
let state = loadState();
let toastTimer;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(starterData);
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.orders) || !Number.isInteger(parsed.nextOrder)) {
      throw new Error("Saved shop data has an unexpected format.");
    }
    return parsed;
  } catch (error) {
    console.error("Could not read saved shop data.", error);
    window.alert("We couldn't read the saved shop data in this browser. The demo has been restored; refresh to continue.");
    return structuredClone(starterData);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save shop data.", error);
    showToast("Couldn't save changes in this browser. Check available storage and try again.", true);
    return false;
  }
}

function formatMoney(value) {
  return `KES ${money.format(value)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function getProduct(productId) {
  return state.products.find((product) => product.id === productId);
}

function render() {
  renderStats();
  renderRecentOrders();
  renderStockWatch();
  renderOrders();
  renderProducts();
  renderOrderProductOptions();
}

function renderStats() {
  const now = new Date();
  const paidThisMonth = state.orders
    .filter((order) => ["Paid", "Completed"].includes(order.status))
    .filter((order) => {
      const date = new Date(order.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, order) => sum + order.total, 0);
  const openOrders = state.orders.filter((order) => !["Completed"].includes(order.status)).length;
  const lowStock = state.products.filter((product) => product.stock <= LOW_STOCK_LIMIT).length;

  byId("sales-total").textContent = formatMoney(paidThisMonth);
  byId("open-order-total").textContent = openOrders;
  byId("product-total").textContent = state.products.length;
  byId("low-stock-total").textContent = lowStock;
  byId("nav-order-count").textContent = openOrders;
}

function orderRow(order, showDate = false, actions = false) {
  const dateCell = showDate ? `<td>${formatDate(order.createdAt)}<span class="sub-cell">${formatTime(order.createdAt)}</span></td>` : "";
  const actionCell = actions
    ? `<td><button class="row-action" data-share-order="${order.id}" ${order.phone ? "" : "disabled"} title="${order.phone ? "Prepare WhatsApp message" : "Add a customer WhatsApp number to share"}">Share</button></td>`
    : "";
  return `<tr>
    <td><span class="order-code">#${escapeHtml(order.id)}</span></td>
    <td><strong>${escapeHtml(order.customer)}</strong>${order.phone ? `<span class="sub-cell">${escapeHtml(order.phone)}</span>` : ""}</td>
    <td><strong>${escapeHtml(order.productName)}</strong><span class="sub-cell">Qty ${order.quantity}</span></td>
    ${dateCell}
    <td><strong>${formatMoney(order.total)}</strong></td>
    <td>${actions ? statusSelect(order) : `<span class="status-pill ${statusClass(order.status)}">${escapeHtml(order.status)}</span>`}</td>
    ${actionCell}
  </tr>`;
}

function statusSelect(order) {
  const statuses = ["Pending", "Paid", "Ready", "Completed"];
  return `<select class="status-select" data-order-status="${order.id}" aria-label="Update status for order ${order.id}">
    ${statuses.map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
  </select>`;
}

function renderRecentOrders() {
  const recent = [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  byId("recent-orders").innerHTML = recent.map((order) => orderRow(order)).join("");
  byId("empty-recent-orders").classList.toggle("hidden", recent.length > 0);
  byId("recent-orders").closest(".table-wrap").classList.toggle("hidden", recent.length === 0);
}

function renderStockWatch() {
  const lowProducts = state.products.filter((product) => product.stock <= LOW_STOCK_LIMIT).sort((a, b) => a.stock - b.stock);
  byId("stock-watch").innerHTML = lowProducts.map((product, index) => {
    const colors = ["", "warm", "blue"];
    const label = product.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return `<div class="stock-item">
      <div class="product-avatar ${colors[index % colors.length]}">${escapeHtml(label)}</div>
      <div class="stock-item-info"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.category)}</span></div>
      <span class="stock-quantity">${product.stock} left</span>
    </div>`;
  }).join("");
  byId("empty-stock").classList.toggle("hidden", lowProducts.length > 0);
  byId("stock-watch").classList.toggle("hidden", lowProducts.length === 0);
}

function renderOrders() {
  const query = byId("order-search").value.trim().toLowerCase();
  const orders = [...state.orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .filter((order) => [order.id, order.customer, order.productName, order.status].some((value) => value.toLowerCase().includes(query)));
  byId("all-orders").innerHTML = orders.map((order) => orderRow(order, true, true)).join("");
  byId("all-order-caption").textContent = `${state.orders.length} ${state.orders.length === 1 ? "order" : "orders"}`;
  byId("empty-all-orders").classList.toggle("hidden", orders.length > 0);
  byId("all-orders").closest(".table-wrap").classList.toggle("hidden", orders.length === 0);
}

function renderProducts() {
  const query = byId("product-search").value.trim().toLowerCase();
  const products = [...state.products]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query));
  byId("all-products").innerHTML = products.map((product) => {
    const stockPercent = Math.min(product.stock / 20 * 100, 100);
    const level = product.stock <= LOW_STOCK_LIMIT ? "Low stock" : "In stock";
    return `<tr>
      <td><strong>${escapeHtml(product.name)}</strong></td>
      <td>${escapeHtml(product.category)}</td>
      <td><strong>${formatMoney(product.price)}</strong></td>
      <td><strong>${product.stock}</strong> units</td>
      <td><div class="stock-bar" aria-label="${level}"><span class="${product.stock <= LOW_STOCK_LIMIT ? "low" : ""}" style="width:${stockPercent}%"></span></div><span class="sub-cell">${level}</span></td>
      <td><div class="restock-control"><input type="number" min="1" step="1" value="1" data-restock-quantity="${product.id}" aria-label="Quantity to restock for ${escapeHtml(product.name)}"><button type="button" data-restock="${product.id}">Add</button></div></td>
    </tr>`;
  }).join("");
  byId("product-caption").textContent = `${state.products.length} ${state.products.length === 1 ? "product" : "products"}`;
  byId("empty-products").classList.toggle("hidden", products.length > 0);
  byId("all-products").closest(".table-wrap").classList.toggle("hidden", products.length === 0);
}

function renderOrderProductOptions() {
  const select = byId("order-product");
  const availableProducts = state.products.filter((product) => product.stock > 0);
  select.innerHTML = availableProducts.length
    ? availableProducts.map((product) => `<option value="${product.id}">${escapeHtml(product.name)} — ${formatMoney(product.price)} (${product.stock} in stock)</option>`).join("")
    : `<option value="">No products in stock</option>`;
  select.disabled = availableProducts.length === 0;
  byId("order-form").querySelector('[type="submit"]').disabled = availableProducts.length === 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function showToast(message, isError = false) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.color = isError ? "#9d3e37" : "";
  toast.style.borderColor = isError ? "#e9c5c1" : "";
  toast.style.background = isError ? "#fff6f5" : "";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 4000);
}

function openWhatsApp(order) {
  const phone = order.phone.replace(/\D/g, "");
  const internationalPhone = phone.startsWith("0") ? `254${phone.slice(1)}` : phone.startsWith("254") ? phone : `254${phone}`;
  const message = `Hi ${order.customer}, your order ${order.id} for ${order.quantity} × ${order.productName} (${formatMoney(order.total)}) is ${order.status.toLowerCase()}. Thank you for shopping with Mtaa Store!`;
  window.open(`https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function switchView(view) {
  document.querySelectorAll(".page-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `${view}-view`);
    section.classList.toggle("active", section.id === `${view}-view`);
  });
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  byId("page-crumb").textContent = view[0].toUpperCase() + view.slice(1);
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
document.querySelectorAll("[data-navigate]").forEach((button) => button.addEventListener("click", () => {
  switchView(button.dataset.navigate);
  window.scrollTo({ top: 0, behavior: "smooth" });
}));
document.querySelectorAll("[data-open-modal]").forEach((button) => button.addEventListener("click", () => {
  const dialog = byId(button.dataset.openModal);
  if (dialog.id === "order-modal") byId("order-error").classList.add("hidden");
  if (dialog.id === "product-modal") byId("product-error").classList.add("hidden");
  dialog.showModal();
}));
document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
byId("order-search").addEventListener("input", renderOrders);
byId("product-search").addEventListener("input", renderProducts);

byId("product-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const product = {
    id: `p${Date.now()}`,
    name: String(form.get("name")).trim(),
    category: String(form.get("category")).trim(),
    price: Number(form.get("price")),
    stock: Number(form.get("stock")),
  };
  if (!product.name || !product.category || !Number.isSafeInteger(product.price) || product.price < 1 || !Number.isSafeInteger(product.stock) || product.stock < 0) {
    byId("product-error").textContent = "Enter a product name, category, whole-number price, and valid stock quantity.";
    byId("product-error").classList.remove("hidden");
    return;
  }
  state.products.push(product);
  if (!saveState()) {
    state.products.pop();
    return;
  }
  event.currentTarget.reset();
  byId("product-modal").close();
  render();
  showToast(`${product.name} added to your products.`);
});

byId("order-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const product = getProduct(String(form.get("product")));
  const quantity = Number(form.get("quantity"));
  const customer = String(form.get("customer")).trim();
  if (!customer || !product || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > product.stock) {
    byId("order-error").textContent = product ? `Enter a quantity from 1 to ${product.stock} for ${product.name}.` : "Add a product with stock before creating an order.";
    byId("order-error").classList.remove("hidden");
    return;
  }
  const order = {
    id: `DF-${state.nextOrder}`,
    customer,
    phone: String(form.get("phone")).trim(),
    productId: product.id,
    productName: product.name,
    quantity,
    total: product.price * quantity,
    status: String(form.get("status")),
    createdAt: new Date().toISOString(),
  };
  product.stock -= quantity;
  state.orders.push(order);
  state.nextOrder += 1;
  if (!saveState()) {
    product.stock += quantity;
    state.orders.pop();
    state.nextOrder -= 1;
    return;
  }
  event.currentTarget.reset();
  byId("order-modal").close();
  render();
  showToast(`Order ${order.id} saved. Stock has been updated.`);
});

document.addEventListener("change", (event) => {
  const orderId = event.target.dataset.orderStatus;
  if (!orderId) return;
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const previousStatus = order.status;
  order.status = event.target.value;
  if (!saveState()) {
    order.status = previousStatus;
    event.target.value = previousStatus;
    return;
  }
  render();
  showToast(`${order.id} marked ${order.status.toLowerCase()}.`);
});

document.addEventListener("click", (event) => {
  const restockButton = event.target.closest("[data-restock]");
  if (restockButton) {
    const product = getProduct(restockButton.dataset.restock);
    const quantityInput = document.querySelector(`[data-restock-quantity="${CSS.escape(restockButton.dataset.restock)}"]`);
    const quantity = Number(quantityInput.value);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(product.stock + quantity)) {
      showToast("Enter a valid whole-number restock quantity.", true);
      return;
    }
    product.stock += quantity;
    if (!saveState()) {
      product.stock -= quantity;
      return;
    }
    render();
    showToast(`${product.name} restocked by ${quantity}.`);
    return;
  }
  const button = event.target.closest("[data-share-order]");
  if (!button) return;
  const order = state.orders.find((item) => item.id === button.dataset.shareOrder);
  if (order) openWhatsApp(order);
});

const currentHour = new Date().getHours();
const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
document.querySelector(".welcome-row h1").innerHTML = `${greeting}, Mtaa Store <span class="wave">✦</span>`;
byId("today-label").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
render();
