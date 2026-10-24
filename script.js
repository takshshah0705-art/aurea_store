"use strict";

/* =========================================
   AUREA — STORE ENGINE
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const $ = selector => document.querySelector(selector);

    const STORAGE = {
        cart: "aurea_cart_v2",
        wishlist: "aurea_wishlist_v2",
        products: "aurea_products_v2",
        orders: "aurea_orders_v2"
    };

    const SIZES = ["S", "M", "L", "XL", "XXL"];

    const IMAGE_TSHIRT =
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80";

    const IMAGE_UNDERWEAR =
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80";

    const IMAGE_COLORS = [
        "Black",
        "White",
        "Navy",
        "Grey",
        "Olive",
        "Beige",
        "Pink",
        "Maroon",
        "Blue",
        "Brown"
    ];

    const TSHIRT_STYLES = [
        "Classic Cotton T-Shirt",
        "Premium Crew Neck T-Shirt",
        "Everyday Essential T-Shirt",
        "Relaxed Fit T-Shirt",
        "Minimal Graphic T-Shirt",
        "Soft Touch T-Shirt",
        "Modern Fit T-Shirt",
        "Essential Solid T-Shirt",
        "Urban Casual T-Shirt",
        "Premium Basic T-Shirt"
    ];

    const UNDERWEAR_STYLES = [
        "Everyday Cotton Briefs",
        "Comfort Stretch Trunks",
        "Classic Boxer Briefs",
        "Soft Cotton Boxers",
        "Essential Everyday Trunks"
    ];

    function readStorage(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) {
                return fallback;
            }

            return JSON.parse(value);
        } catch (error) {
            console.error("Storage read error:", error);
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage write error:", error);
            showToast("Unable to save. Check your browser storage.");
            return false;
        }
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatPrice(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function showToast(message) {
        const toast = $("#toast");

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(showToast.timer);

        showToast.timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2600);
    }

    function makeProduct(id, category, index) {
        const isTshirt = category === "T-Shirts";

        const styles = isTshirt
            ? TSHIRT_STYLES
            : UNDERWEAR_STYLES;

        const color = IMAGE_COLORS[index % IMAGE_COLORS.length];

        const basePrice = isTshirt
            ? 399 + (index % 6) * 100
            : 249 + (index % 5) * 100;

        const image = isTshirt
            ? IMAGE_TSHIRT
            : IMAGE_UNDERWEAR;

        const style = styles[index % styles.length];

        return {
            id,
            name: `${color} ${style}`,
            category,
            color,
            price: basePrice,
            originalPrice: Math.round(basePrice * 1.35),
            image,
            sizes: [...SIZES],
            stock: 25,
            featured: index < 10,
            premium: index % 7 === 0
        };
    }

    function generateProducts() {
        const products = [];

        for (let i = 1; i <= 500; i++) {
            products.push(
                makeProduct(`AUR-TS-${String(i).padStart(4, "0")}`,
                    "T-Shirts",
                    i - 1)
            );
        }

        for (let i = 1; i <= 250; i++) {
            products.push(
                makeProduct(`AUR-UG-${String(i).padStart(4, "0")}`,
                    "Undergarments",
                    i - 1)
            );
        }

        return products;
    }

    const defaultProducts = generateProducts();

    let products = readStorage(STORAGE.products, null);

    if (!Array.isArray(products) || products.length === 0) {
        products = defaultProducts;
        writeStorage(STORAGE.products, products);
    }

    let cart = readStorage(STORAGE.cart, []);
    let wishlist = readStorage(STORAGE.wishlist, []);
    let orders = readStorage(STORAGE.orders, []);

    if (!Array.isArray(cart)) cart = [];
    if (!Array.isArray(wishlist)) wishlist = [];
    if (!Array.isArray(orders)) orders = [];

    let activeCategory = "All";
    let activeWishlistOnly = false;

    let currentSearch = "";
    let toastTimer = null;

    /* =====================================
       PRODUCT HELPERS
       ===================================== */

    function getProduct(productId) {
        return products.find(product => product.id === productId);
    }

    function saveCart() {
        writeStorage(STORAGE.cart, cart);
        updateBagCount();
    }

    function saveWishlist() {
        writeStorage(STORAGE.wishlist, wishlist);
        updateWishlistCount();
    }

    function updateBagCount() {
        const count = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );

        $("#bagCount").textContent = count;
    }

    function updateWishlistCount() {
        $("#wishlistCount").textContent = wishlist.length;
    }

    function getCartTotal() {
        return cart.reduce((total, item) => {
            const product = getProduct(item.productId);

            return total + (
                product
                    ? product.price * item.quantity
                    : 0
            );
        }, 0);
    }

    /* =====================================
       PRODUCT DISPLAY
       ===================================== */

    function getFilteredProducts() {
        let result = [...products];

        if (activeCategory === "Premium") {
            result = result.filter(product => product.premium);
        } else if (activeCategory !== "All") {
            result = result.filter(
                product => product.category === activeCategory
            );
        }

        if (activeWishlistOnly) {
            result = result.filter(
                product => wishlist.includes(product.id)
            );
        }

        if (currentSearch) {
            const query = currentSearch.toLowerCase();

            result = result.filter(product => {
                return [
                    product.name,
                    product.category,
                    product.color,
                    product.id
                ].some(value =>
                    String(value).toLowerCase().includes(query)
                );
            });
        }

        const selectedSize = $("#sizeFilter").value;

        if (selectedSize !== "All") {
            result = result.filter(product =>
                product.sizes.includes(selectedSize)
            );
        }

        const maxPrice = $("#priceFilter").value;

        if (maxPrice !== "All") {
            result = result.filter(
                product => product.price < Number(maxPrice)
            );
        }

        const sort = $("#sortFilter").value;

        if (sort === "price-low") {
            result.sort((a, b) => a.price - b.price);
        } else if (sort === "price-high") {
            result.sort((a, b) => b.price - a.price);
        } else if (sort === "name") {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }

    function productCard(product) {
        const isSaved = wishlist.includes(product.id);

        const discount = Math.round(
            (1 - product.price / product.originalPrice) * 100
        );

        return `
            <article class="product-card">

                <div class="product-image-wrap">

                    <img
                        class="product-image"
                        src="${escapeHTML(product.image)}"
                        alt="${escapeHTML(product.name)}"
                        loading="lazy"
                    >

                    ${product.featured
                        ? `<span class="product-badge">BESTSELLER</span>`
                        : ""
                    }

                    <button
                        class="wishlist-toggle ${isSaved ? "active" : ""}"
                        data-action="wishlist"
                        data-id="${escapeHTML(product.id)}"
                        aria-label="${isSaved ? "Remove from" : "Add to"} wishlist"
                        aria-pressed="${isSaved}"
                    >
                        ${isSaved ? "♥" : "♡"}
                    </button>

                </div>

                <div class="product-info">

                    <p class="product-brand">AUREA</p>

                    <p class="product-name">
                        ${escapeHTML(product.name)}
                    </p>

                    <p class="product-category">
                        ${escapeHTML(product.category)}
                    </p>

                    <div class="product-price">
                        <span>${formatPrice(product.price)}</span>

                        <del>${formatPrice(product.originalPrice)}</del>

                        <span class="discount">${discount}% OFF</span>
                    </div>

                    <label>
                        <select
                            class="product-size"
                            data-size-for="${escapeHTML(product.id)}"
                            aria-label="Choose size for ${escapeHTML(product.name)}"
                        >
                            <option value="">Select size</option>

                            ${product.sizes.map(size =>
                                `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`
                            ).join("")}

                        </select>
                    </label>

                    <button
                        class="add-to-bag"
                        data-action="add"
                        data-id="${escapeHTML(product.id)}"
                    >
                        ADD TO BAG +
                    </button>

                </div>

            </article>
        `;
    }

    function renderProducts() {
        const filteredProducts = getFilteredProducts();

        $("#productGrid").innerHTML =
            filteredProducts.map(productCard).join("");

        $("#productCount").textContent =
            `${filteredProducts.length} products found`;

        $("#visibleCount").textContent =
            filteredProducts.length;

        $("#emptyState").hidden =
            filteredProducts.length !== 0;

        $("#productGrid").hidden =
            filteredProducts.length === 0;
    }

    /* =====================================
       SEARCH AND FILTERS
       ===================================== */

    $("#searchInput").addEventListener("input", event => {
        currentSearch = event.target.value.trim();
        renderProducts();
    });

    $("#categoryFilter").addEventListener("change", event => {
        activeCategory = event.target.value;
        activeWishlistOnly = false;
        renderProducts();
    });

    $("#sizeFilter").addEventListener("change", renderProducts);
    $("#priceFilter").addEventListener("change", renderProducts);
    $("#sortFilter").addEventListener("change", renderProducts);

    function clearFilters() {
        activeCategory = "All";
        activeWishlistOnly = false;
        currentSearch = "";

        $("#searchInput").value = "";
        $("#categoryFilter").value = "All";
        $("#sizeFilter").value = "All";
        $("#priceFilter").value = "All";
        $("#sortFilter").value = "featured";

        renderProducts();
    }

    $("#clearFilters").addEventListener("click", clearFilters);
    $("#resetSearch").addEventListener("click", clearFilters);

    document.querySelectorAll("[data-category]").forEach(element => {
        element.addEventListener("click", event => {
            const category = event.currentTarget.dataset.category;

            activeCategory = category;
            activeWishlistOnly = false;

            $("#categoryFilter").value =
                ["All", "T-Shirts", "Undergarments"].includes(category)
                    ? category
                    : "All";

            renderProducts();

            $("#shop").scrollIntoView({
                behavior: "smooth"
            });

            $("#mobileNav").classList.remove("open");
        });
    });

    /* =====================================
       WISHLIST
       ===================================== */

    function toggleWishlist(productId) {
        if (wishlist.includes(productId)) {
            wishlist = wishlist.filter(id => id !== productId);
            showToast("Removed from wishlist.");
        } else {
            wishlist.push(productId);
            showToast("Added to wishlist.");
        }

        saveWishlist();
        renderProducts();
    }

    function openWishlist() {
        activeWishlistOnly = true;
        activeCategory = "All";

        $("#categoryFilter").value = "All";

        closeModal();
        renderProducts();

        $("#shop").scrollIntoView({
            behavior: "smooth"
        });

        if (wishlist.length === 0) {
            showToast("Your wishlist is empty.");
        } else {
            showToast("Showing your saved products.");
        }
    }

    $("#wishlistButton").addEventListener("click", openWishlist);
    $("#footerWishlist").addEventListener("click", openWishlist);

    /* =====================================
       SHOPPING BAG
       ===================================== */

    function addToCart(productId, size) {
        const product = getProduct(productId);

        if (!product) {
            showToast("Product not found.");
            return;
        }

        if (!size || !product.sizes.includes(size)) {
            showToast("Please select a size first.");
            return;
        }

        if (product.stock <= 0) {
            showToast("This product is currently out of stock.");
            return;
        }

        const existingItem = cart.find(item =>
            item.productId === productId &&
            item.size === size
        );

        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                showToast("Maximum available quantity reached.");
                return;
            }

            existingItem.quantity += 1;
        } else {
            cart.push({
                productId,
                size,
                quantity: 1
            });
        }

        saveCart();
        showToast("Added to your bag.");
    }

    function changeQuantity(productId, size, change) {
        const item = cart.find(entry =>
            entry.productId === productId &&
            entry.size === size
        );

        if (!item) return;

        const product = getProduct(productId);

        item.quantity += change;

        if (item.quantity <= 0) {
            cart = cart.filter(entry => entry !== item);
        } else if (product && item.quantity > product.stock) {
            item.quantity = product.stock;
            showToast("Maximum available quantity reached.");
        }

        saveCart();
        renderCart();
    }

    function removeCartItem(productId, size) {
        cart = cart.filter(item =>
            !(item.productId === productId && item.size === size)
        );

        saveCart();
        renderCart();
        showToast("Item removed from bag.");
    }

    /* =====================================
       MODAL
       ===================================== */

    function openModal(title, content) {
        $("#modalTitle").textContent = title;
        $("#modalContent").innerHTML = content;
        $("#modalBackdrop").hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        $("#modalBackdrop").hidden = true;
        document.body.style.overflow = "";
    }

    $("#closeModal").addEventListener("click", closeModal);

    $("#modalBackdrop").addEventListener("click", event => {
        if (event.target === $("#modalBackdrop")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !$("#modalBackdrop").hidden) {
            closeModal();
        }
    });

    function renderCart() {
        if (cart.length === 0) {
            openModal("YOUR BAG", `
                <div class="modal-empty">
                    <h3>Your bag is waiting.</h3>
                    <p>Explore the collection and add something you love.</p>

                    <button class="full-button" data-action="continue-shopping">
                        CONTINUE SHOPPING
                    </button>
                </div>
            `);

            return;
        }

        const itemsHTML = cart.map(item => {
            const product = getProduct(item.productId);

            if (!product) return "";

            return `
                <div class="bag-item">

                    <img
                        src="${escapeHTML(product.image)}"
                        alt="${escapeHTML(product.name)}"
                    >

                    <div>
                        <h3>${escapeHTML(product.name)}</h3>

                        <p>Size: ${escapeHTML(item.size)}</p>

                        <p>Price: ${formatPrice(product.price)}</p>

                        <div class="bag-controls">

                            <button
                                data-action="decrease"
                                data-id="${escapeHTML(product.id)}"
                                data-size="${escapeHTML(item.size)}"
                                aria-label="Decrease quantity"
                            >−</button>

                            <span>${item.quantity}</span>

                            <button
                                data-action="increase"
                                data-id="${escapeHTML(product.id)}"
                                data-size="${escapeHTML(item.size)}"
                                aria-label="Increase quantity"
                            >+</button>

                            <button
                                class="remove-item"
                                data-action="remove"
                                data-id="${escapeHTML(product.id)}"
                                data-size="${escapeHTML(item.size)}"
                            >REMOVE</button>

                        </div>
                    </div>

                    <div class="bag-item-price">
                        ${formatPrice(product.price * item.quantity)}
                    </div>

                </div>
            `;
        }).join("");

        const total = getCartTotal();

        const shipping = total >= 999 ? 0 : 49;

        openModal("YOUR BAG", `
            ${itemsHTML}

            <div class="bag-summary">

                <div class="summary-line">
                    <span>Subtotal</span>
                    <span>${formatPrice(total)}</span>
                </div>

                <div class="summary-line">
                    <span>Shipping</span>
                    <span>${shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                </div>

                <div class="summary-line summary-total">
                    <span>Total</span>
                    <span>${formatPrice(total + shipping)}</span>
                </div>

                <button class="full-button" data-action="checkout">
                    PROCEED TO CHECKOUT →
                </button>

                <button class="secondary-button" data-action="continue-shopping">
                    CONTINUE SHOPPING
                </button>

            </div>
        `);
    }

    $("#bagButton").addEventListener("click", renderCart);
    $("#footerBag").addEventListener("click", renderCart);

    /* =====================================
       CHECKOUT
       ===================================== */

    function checkoutHTML() {
        const subtotal = getCartTotal();
        const shipping = subtotal >= 999 ? 0 : 49;
        const total = subtotal + shipping;

        return `
            <div class="notice">
                DEMO CHECKOUT: Orders placed here are stored only in this
                browser. This is not yet a production order system.
            </div>

            <h3 class="admin-section-title">Delivery details</h3>

            <form id="checkoutForm" class="checkout-form">

                <label>
                    Full name
                    <input
                        name="name"
                        type="text"
                        maxlength="100"
                        autocomplete="name"
                        required
                    >
                </label>

                <label>
                    Email address
                    <input
                        name="email"
                        type="email"
                        autocomplete="email"
                        required
                    >
                </label>

                <label>
                    Mobile number
                    <input
                        name="phone"
                        type="tel"
                        inputmode="numeric"
                        pattern="[0-9]{10}"
                        maxlength="10"
                        placeholder="10-digit mobile number"
                        autocomplete="tel"
                        required
                    >
                </label>

                <label>
                    Delivery address
                    <textarea
                        name="address"
                        maxlength="500"
                        autocomplete="street-address"
                        required
                    ></textarea>
                </label>

                <label>
                    City
                    <input
                        name="city"
                        maxlength="100"
                        autocomplete="address-level2"
                        required
                    >
                </label>

                <label>
                    PIN code
                    <input
                        name="pincode"
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]{6}"
                        maxlength="6"
                        autocomplete="postal-code"
                        required
                    >
                </label>

                <h3 class="admin-section-title">Payment method</h3>

                <label class="payment-option">
                    <input
                        type="radio"
                        name="payment"
                        value="COD"
                        checked
                    >
                    Cash on Delivery
                </label>

                <label class="payment-option">
                    <input
                        type="radio"
                        name="payment"
                        value="ONLINE"
                    >
                    Online payment — Razorpay integration required
                </label>

                <div class="bag-summary">

                    <div class="summary-line">
                        <span>Subtotal</span>
                        <span>${formatPrice(subtotal)}</span>
                    </div>

                    <div class="summary-line">
                        <span>Shipping</span>
                        <span>${shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
                    </div>

                    <div class="summary-line summary-total">
                        <span>Order total</span>
                        <span>${formatPrice(total)}</span>
                    </div>

                </div>

                <button class="full-button" type="submit">
                    PLACE DEMO ORDER
                </button>

            </form>
        `;
    }

    function openCheckout() {
        if (cart.length === 0) {
            showToast("Your bag is empty.");
            return;
        }

        openModal("CHECKOUT", checkoutHTML());
    }

    /* =====================================
       ORDER STORAGE
       ===================================== */

    function placeDemoOrder(formData) {
        const payment = formData.get("payment");

        if (payment === "ONLINE") {
            showToast("Online payments are not connected yet.");

            alert(
                "Online payments are not enabled yet.\n\n" +
                "A secure backend and Razorpay account integration " +
                "are required before real payments can be accepted.\n\n" +
                "Choose Cash on Delivery for this local demo."
            );

            return;
        }

        const orderItems = cart.map(item => {
            const product = getProduct(item.productId);

            return {
                productId: item.productId,
                name: product ? product.name : "Product",
                price: product ? product.price : 0,
                size: item.size,
                quantity: item.quantity
            };
        });

        const subtotal = getCartTotal();
        const shipping = subtotal >= 999 ? 0 : 49;

        const order = {
            id: "AUR-" + Date.now(),
            createdAt: new Date().toISOString(),
            customer: {
                name: formData.get("name"),
                email: formData.get("email"),
                phone: formData.get("phone"),
                address: formData.get("address"),
                city: formData.get("city"),
                pincode: formData.get("pincode")
            },
            items: orderItems,
            subtotal,
            shipping,
            total: subtotal + shipping,
            paymentMethod: "Cash on Delivery",
            status: "Demo order — not submitted to a server"
        };

        const updatedOrders = [order, ...orders];

        if (!writeStorage(STORAGE.orders, updatedOrders)) {
            return;
        }

        orders = updatedOrders;

        cart = [];
        saveCart();

        openModal("ORDER CREATED", `
            <div class="modal-empty">

                <h3>Thank you, ${escapeHTML(order.customer.name)}!</h3>

                <p>Your demo order has been recorded in this browser.</p>

                <div class="notice">
                    Order reference: ${escapeHTML(order.id)}<br>
                    Total: ${formatPrice(order.total)}<br><br>
                    This is a local demonstration only. No order has been
                    sent to a business, courier, or payment gateway.
                </div>

                <button class="full-button" data-action="continue-shopping">
                    CONTINUE SHOPPING
                </button>

            </div>
        `);

        showToast("Demo order created.");
    }

    /* =====================================
       BASIC ADMIN DASHBOARD
       ===================================== */

    function openAdmin() {
        const tshirtCount = products.filter(
            product => product.category === "T-Shirts"
        ).length;

        const underwearCount = products.filter(
            product => product.category === "Undergarments"
        ).length;

        const orderRows = orders.length
            ? orders.map(order => `
                <tr>
                    <td>${escapeHTML(order.id)}</td>
                    <td>${escapeHTML(order.customer.name)}</td>
                    <td>${formatPrice(order.total)}</td>
                    <td>${escapeHTML(order.paymentMethod)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No demo orders yet.</td></tr>`;

        openModal("AUREA ADMIN", `

            <div class="notice">
                DEVELOPMENT ADMIN ONLY. This dashboard is not protected by
                a server login. Do not use it to manage a live store.
            </div>

            <h3 class="admin-section-title">Store overview</h3>

            <div class="summary-line">
                <span>Total products</span>
                <strong>${products.length}</strong>
            </div>

            <div class="summary-line">
                <span>T-shirts</span>
                <strong>${tshirtCount}</strong>
            </div>

            <div class="summary-line">
                <span>Undergarments</span>
                <strong>${underwearCount}</strong>
            </div>

            <div class="summary-line">
                <span>Demo orders</span>
                <strong>${orders.length}</strong>
            </div>

            <h3 class="admin-section-title">Add a product</h3>

            <form id="adminProductForm" class="admin-form">

                <input
                    name="name"
                    placeholder="Product name"
                    maxlength="120"
                    required
                >

                <select name="category" required>
                    <option value="T-Shirts">T-shirts</option>
                    <option value="Undergarments">Undergarments</option>
                </select>

                <input
                    name="price"
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="Selling price in ₹"
                    required
                >

                <input
                    name="image"
                    type="url"
                    placeholder="Product image URL (optional)"
                >

                <input
                    name="stock"
                    type="number"
                    min="0"
                    max="100000"
                    placeholder="Available stock"
                    value="10"
                    required
                >

                <button class="full-button" type="submit">
                    ADD PRODUCT
                </button>

            </form>

            <h3 class="admin-section-title">Recent demo orders</h3>

            <div class="admin-table-wrap">
                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Payment</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${orderRows}
                    </tbody>

                </table>
            </div>

            <h3 class="admin-section-title">Inventory management</h3>

            <div class="admin-table-wrap">
                <table class="admin-table">

                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${products.slice(0, 20).map(product => `
                            <tr>
                                <td>${escapeHTML(product.name)}</td>
                                <td>${formatPrice(product.price)}</td>
                                <td>${product.stock}</td>
                                <td>
                                    <button
                                        class="text-button"
                                        data-action="delete-product"
                                        data-id="${escapeHTML(product.id)}"
                                    >DELETE</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>

                </table>
            </div>

            <p class="muted">
                The inventory table currently displays the first 20 products.
            </p>

        `);
    }

    $("#adminButton").addEventListener("click", openAdmin);

    function addAdminProduct(formData) {
        const name = String(formData.get("name") || "").trim();
        const category = formData.get("category");
        const price = Number(formData.get("price"));
        const stock = Number(formData.get("stock"));
        const image = String(formData.get("image") || "").trim();

        if (!name || !Number.isFinite(price) || price <= 0) {
            showToast("Please enter valid product details.");
            return;
        }

        if (
            !Number.isInteger(stock) ||
            stock < 0 ||
            stock > 100000
        ) {
            showToast("Please enter a valid stock quantity.");
            return;
        }

        if (!["T-Shirts", "Undergarments"].includes(category)) {
            showToast("Invalid product category.");
            return;
        }

        if (image) {
            try {
                const parsedURL = new URL(image);

                if (!["https:", "http:"].includes(parsedURL.protocol)) {
                    showToast("Use a valid HTTP or HTTPS image URL.");
                    return;
                }
            } catch (error) {
                showToast("Please enter a valid image URL.");
                return;
            }
        }

        const product = {
            id: "AUR-CUSTOM-" + Date.now(),
            name,
            category,
            color: "Custom",
            price,
            originalPrice: Math.round(price * 1.2),
            image: image || (
                category === "T-Shirts"
                    ? IMAGE_TSHIRT
                    : IMAGE_UNDERWEAR
            ),
            sizes: [...SIZES],
            stock,
            featured: false,
            premium: false
        };

        products = [product, ...products];

        if (!writeStorage(STORAGE.products, products)) {
            products = products.filter(item => item.id !== product.id);
            return;
        }

        showToast("Product added successfully.");
        renderProducts();
        openAdmin();
    }

    function deleteAdminProduct(productId) {
        const product = getProduct(productId);

        if (!product) return;

        const confirmed = confirm(
            `Delete "${product.name}" from this browser's catalog?`
        );

        if (!confirmed) return;

        products = products.filter(item => item.id !== productId);

        cart = cart.filter(item => item.productId !== productId);

        wishlist = wishlist.filter(id => id !== productId);

        writeStorage(STORAGE.products, products);

        saveCart();
        saveWishlist();

        renderProducts();
        openAdmin();

        showToast("Product deleted.");
    }

    /* =====================================
       CLICK ACTIONS
       ===================================== */

    document.addEventListener("click", event => {

        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const productId = button.dataset.id;
        const size = button.dataset.size;

        if (action === "add") {
            const sizeSelect = document.querySelector(
                `[data-size-for="${CSS.escape(productId)}"]`
            );

            if (!sizeSelect) return;

            addToCart(productId, sizeSelect.value);
        }

        if (action === "wishlist") {
            toggleWishlist(productId);
        }

        if (action === "increase") {
            changeQuantity(productId, size, 1);
        }

        if (action === "decrease") {
            changeQuantity(productId, size, -1);
        }

        if (action === "remove") {
            removeCartItem(productId, size);
        }

        if (action === "checkout") {
            openCheckout();
        }

        if (action === "continue-shopping") {
            closeModal();

            $("#shop").scrollIntoView({
                behavior: "smooth"
            });
        }

        if (action === "delete-product") {
            deleteAdminProduct(productId);
        }
    });

    /* =====================================
       FORM SUBMISSIONS
       ===================================== */

    document.addEventListener("submit", event => {

        if (event.target.id === "checkoutForm") {
            event.preventDefault();

            if (!event.target.reportValidity()) return;

            const formData = new FormData(event.target);

            placeDemoOrder(formData);
        }

        if (event.target.id === "adminProductForm") {
            event.preventDefault();

            if (!event.target.reportValidity()) return;

            const formData = new FormData(event.target);

            addAdminProduct(formData);
        }
    });

    /* =====================================
       NEWSLETTER DEMO
       ===================================== */

    $("#newsletterForm").addEventListener("submit", event => {
        event.preventDefault();

        const input = $("#newsletterEmail");

        if (!input.checkValidity()) {
            input.reportValidity();
            return;
        }

        $("#newsletterMessage").textContent =
            "Thank you! Newsletter integration will be added later.";

        input.value = "";
    });

    /* =====================================
       MOBILE NAVIGATION
       ===================================== */

    $("#menuButton").addEventListener("click", () => {
        $("#mobileNav").classList.toggle("open");
    });

    /* =====================================
       INITIALIZE
       ===================================== */

    $("#currentYear").textContent = new Date().getFullYear();

    updateBagCount();
    updateWishlistCount();
    renderProducts();

    console.log("AUREA initialized successfully.");
    console.log("Products loaded:", products.length);

});