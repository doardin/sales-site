const PRODUCTS_API_URL = 'https://fakestoreapi.com/products';
const CHECKOUT_API_URL = 'https://fakestoreapi.com/carts';
const MIN_QUANTITY = 1;

// Elementos da Página Principal
const productSelect = document.getElementById('product-select');
const buyButton = document.getElementById('buy-button');
const buyButtonText = document.getElementById('buy-button-text');
const buyButtonSpinner = document.getElementById('buy-button-spinner');
const decreaseQuantityButton = document.getElementById('decrease-quantity');
const increaseQuantityButton = document.getElementById('increase-quantity');
const quantityDisplay = document.getElementById('quantity-display');
const whatsappMessageDiv = document.getElementById('whatsapp-message');
const maxStockInfoSpan = document.getElementById('max-stock-info');
const pageLoader = document.getElementById('page-loader');
const shopCardContainer = document.getElementById('shop-card-container');
const totalPriceContainer = document.getElementById('total-price-container');
const totalPriceValue = document.getElementById('total-price-value');

// Elementos do Modal de Informação
const infoModal = document.getElementById('info-modal');
const infoModalTitle = document.getElementById('info-modal-title');
const infoModalMessage = document.getElementById('info-modal-message');
const closeInfoModalButton = document.getElementById('close-info-modal-button');
const okInfoModalButton = document.getElementById('ok-info-modal-button');
const modalIconContainer = document.getElementById('modal-icon-container');

// Elementos do Modal de Confirmação de Compra
const confirmationPurchaseModal = document.getElementById('confirmation-purchase-modal');
const closeConfirmationModalButton = document.getElementById('close-confirmation-modal-button');
const confirmProductName = document.getElementById('confirm-product-name');
const confirmQuantity = document.getElementById('confirm-quantity');
const confirmUnitPrice = document.getElementById('confirm-unit-price');
const confirmGrandTotal = document.getElementById('confirm-grand-total');
const cancelPurchaseButton = document.getElementById('cancel-purchase-button');
const confirmPurchaseButton = document.getElementById('confirm-purchase-button');
const confirmPurchaseButtonText = document.getElementById('confirm-purchase-button-text');
const confirmPurchaseSpinner = document.getElementById('confirm-purchase-spinner');
const confirmEmailInput = document.getElementById('confirm-email-input');
const confirmEmailError = document.getElementById('confirm-email-error');


let productsData = [];
let currentQuantity = MIN_QUANTITY;
let currentSelectedProductForConfirmation = null;
let currentRedirectUrl = null; // Armazena a URL de redirecionamento
let redirectTimeoutId = null; // Armazena o ID do timeout
let isSuccessRedirectModalActive = false; // Flag para o modal de sucesso com redirecionamento

function showShopContent() {
    pageLoader.style.opacity = '0';
    setTimeout(() => pageLoader.style.display = 'none', 300);
    shopCardContainer.classList.add('visible');
}

function formatPrice(price) {
    return `R$ ${parseFloat(price).toFixed(2).replace('.', ',')}`;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateConfirmEmail() {
    const email = confirmEmailInput.value.trim();
    if (isValidEmail(email)) {
        confirmEmailError.style.display = 'none';
        confirmPurchaseButton.disabled = false;
        return true;
    } else {
        confirmEmailError.style.display = 'block';
        confirmPurchaseButton.disabled = true;
        return false;
    }
}
confirmEmailInput.addEventListener('input', validateConfirmEmail);


function updateQuantityControls() {
    quantityDisplay.textContent = currentQuantity;
    const selectedProductId = productSelect.value;
    let currentProductSimulatedMaxStock = 1;
    let selectedProduct = null;

    if (selectedProductId && productsData.length > 0) {
        selectedProduct = productsData.find(p => p.id == selectedProductId);
        if (selectedProduct) {
            currentProductSimulatedMaxStock = selectedProduct.simulatedMaxStock || 1;
            maxStockInfoSpan.textContent = `(Max: ${currentProductSimulatedMaxStock})`;
            const totalPrice = parseFloat(selectedProduct.price) * currentQuantity;
            totalPriceValue.textContent = formatPrice(totalPrice);
            totalPriceContainer.classList.remove('hidden');
        } else {
            maxStockInfoSpan.textContent = "";
            totalPriceContainer.classList.add('hidden');
        }
    } else {
        maxStockInfoSpan.textContent = "";
        totalPriceContainer.classList.add('hidden');
    }

    decreaseQuantityButton.disabled = currentQuantity <= MIN_QUANTITY;
    increaseQuantityButton.disabled = currentQuantity >= currentProductSimulatedMaxStock;

    if (selectedProduct && currentQuantity === currentProductSimulatedMaxStock && currentProductSimulatedMaxStock > 0) {
        whatsappMessageDiv.textContent = `O limite por pedido para este item é de ${currentProductSimulatedMaxStock} unidades. Para quantidades maiores, entre em contato pelo WhatsApp.`;
        whatsappMessageDiv.style.display = 'block';
    } else {
        whatsappMessageDiv.style.display = 'none';
    }

    const isProductSelected = selectedProductId !== "";
    const areProductsLoaded = !productSelect.disabled && productsData.length > 0;
    const isQuantityWithinStock = currentQuantity <= currentProductSimulatedMaxStock;
    const isNotPurchasing = buyButtonSpinner.style.display === 'none' && confirmPurchaseSpinner.style.display === 'none';

    buyButton.disabled = !(areProductsLoaded && isProductSelected && isQuantityWithinStock && currentQuantity >= MIN_QUANTITY && isNotPurchasing);
}

decreaseQuantityButton.addEventListener('click', () => {
    if (currentQuantity > MIN_QUANTITY) {
        currentQuantity--;
        updateQuantityControls();
    }
});

increaseQuantityButton.addEventListener('click', () => {
    const selectedProductId = productSelect.value;
    let maxStockForThisProduct = 1;
    if (selectedProductId && productsData.length > 0) {
        const selectedProduct = productsData.find(p => p.id == selectedProductId);
        if (selectedProduct && typeof selectedProduct.simulatedMaxStock !== 'undefined') {
            maxStockForThisProduct = selectedProduct.simulatedMaxStock;
        }
    }
    if (currentQuantity < maxStockForThisProduct) {
        currentQuantity++;
        updateQuantityControls();
    }
});

productSelect.addEventListener('change', () => {
    currentQuantity = MIN_QUANTITY;
    updateQuantityControls();
});

function setInfoModalIcon(type) {
    let iconName = 'information-circle-outline';
    let iconColor = 'text-blue-500';
    if (type === 'success') iconName = 'checkmark-circle-outline', iconColor = 'text-green-500';
    else if (type === 'error') iconName = 'alert-circle-outline', iconColor = 'text-red-500';
    else if (type === 'warning') iconName = 'warning-outline', iconColor = 'text-yellow-500';
    modalIconContainer.innerHTML = `<ion-icon name="${iconName}" class="${iconColor}"></ion-icon>`;
}

function showInfoModal(title, message, type = 'info', isRedirectModal = false) {
    infoModalTitle.textContent = title;
    infoModalMessage.textContent = message;
    setInfoModalIcon(type);
    isSuccessRedirectModalActive = isRedirectModal; // Define se este modal deve ter comportamento de redirecionamento
    infoModal.classList.add('active');
}

function closeInfoModal() {
    infoModal.classList.remove('active');
    if (isSuccessRedirectModalActive) {
        clearTimeout(redirectTimeoutId); // Limpa o timeout se o modal de sucesso for fechado manualmente
        isSuccessRedirectModalActive = false;
        currentRedirectUrl = null;
    }
}
closeInfoModalButton.addEventListener('click', closeInfoModal);

okInfoModalButton.addEventListener('click', () => {
    if (isSuccessRedirectModalActive && currentRedirectUrl) {
        clearTimeout(redirectTimeoutId);
        window.location.href = currentRedirectUrl;
        isSuccessRedirectModalActive = false;
        currentRedirectUrl = null;
    } else {
        closeInfoModal();
    }
});


function openConfirmationModal() {
    const selectedProductId = productSelect.value;
    currentSelectedProductForConfirmation = productsData.find(p => p.id == selectedProductId);

    if (!currentSelectedProductForConfirmation) {
        showInfoModal("Erro", "Produto não encontrado para confirmação.", "error");
        return;
    }

    const unitPrice = parseFloat(currentSelectedProductForConfirmation.price);
    const itemTotal = unitPrice * currentQuantity;

    confirmProductName.textContent = currentSelectedProductForConfirmation.title;
    confirmQuantity.textContent = currentQuantity;
    confirmUnitPrice.textContent = formatPrice(unitPrice);
    confirmGrandTotal.textContent = formatPrice(itemTotal);

    confirmEmailInput.value = '';
    confirmEmailError.style.display = 'none';
    confirmPurchaseButton.disabled = true;

    confirmationPurchaseModal.classList.add('active');
    productSelect.disabled = true;
    decreaseQuantityButton.disabled = true;
    increaseQuantityButton.disabled = true;
    buyButton.disabled = true;
}

function closeConfirmationModal() {
    confirmationPurchaseModal.classList.remove('active');
    productSelect.disabled = false;
    updateQuantityControls();
}
closeConfirmationModalButton.addEventListener('click', closeConfirmationModal);
cancelPurchaseButton.addEventListener('click', closeConfirmationModal);


async function populateProducts() {
    productSelect.innerHTML = '<option value="">A carregar produtos...</option>';
    decreaseQuantityButton.disabled = true;
    increaseQuantityButton.disabled = true;
    maxStockInfoSpan.textContent = "";
    totalPriceContainer.classList.add('hidden');

    try {
        const response = await fetch(PRODUCTS_API_URL);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        let fetchedProducts = await response.json();
        productsData = fetchedProducts.map(product => ({
            ...product,
            simulatedMaxStock: Math.floor(Math.random() * 8) + 3
        }));

        productSelect.innerHTML = '<option value="" disabled selected>Selecione um produto</option>';
        productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            const displayName = product.title.length > 30 ? product.title.substring(0, 27) + "..." : product.title;
            option.textContent = `${displayName} - ${formatPrice(product.price)}`;
            productSelect.appendChild(option);
        });
        productSelect.disabled = false;
        currentQuantity = MIN_QUANTITY;
        updateQuantityControls();
        showShopContent();
    } catch (error) {
        console.error('Falha ao buscar produtos:', error);
        productSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        showInfoModal("Erro de Rede", "Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.", "error");
        updateQuantityControls();
        showShopContent();
    }
}

buyButton.addEventListener('click', () => {
    const selectedProductId = productSelect.value;
    if (!selectedProductId) {
        showInfoModal("Atenção", "Por favor, selecione um produto da lista.", "warning");
        return;
    }
    const selectedProduct = productsData.find(p => p.id == selectedProductId);
    if (!selectedProduct) {
        showInfoModal("Erro", "Produto não encontrado.", "error");
        return;
    }
    if (currentQuantity < MIN_QUANTITY || currentQuantity > selectedProduct.simulatedMaxStock) {
        showInfoModal("Quantidade Inválida", `A quantidade deve estar entre ${MIN_QUANTITY} e ${selectedProduct.simulatedMaxStock}.`, "warning");
        return;
    }
    openConfirmationModal();
});

confirmPurchaseButton.addEventListener('click', async () => {
    if (!validateConfirmEmail()) {
        confirmEmailInput.focus();
        return;
    }

    if (!currentSelectedProductForConfirmation) {
        showInfoModal("Erro", "Nenhum produto selecionado para confirmação.", "error");
        closeConfirmationModal();
        return;
    }

    confirmPurchaseButtonText.style.display = 'none';
    confirmPurchaseSpinner.style.display = 'inline-block';
    confirmPurchaseButton.disabled = true;
    cancelPurchaseButton.disabled = true;

    const customerEmail = confirmEmailInput.value.trim();

    try {
        const checkoutPayload = {
            userId: Math.floor(Math.random() * 1000) + 1,
            date: new Date().toISOString().split('T')[0],
            products: [{ productId: currentSelectedProductForConfirmation.id, quantity: currentQuantity }],
            customerEmail: customerEmail
        };
        console.log("Enviando para API:", checkoutPayload);

        const response = await fetch(CHECKOUT_API_URL, {
            method: 'POST',
            body: JSON.stringify(checkoutPayload),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Falha ao processar o pedido (status ${response.status}). Detalhes: ${errorData}`);
        }

        const responseData = await response.json();
        console.log('Resposta da API de carrinho:', responseData);
        closeConfirmationModal();

        currentRedirectUrl = `https://fakestoreapi.com/checkout/order/${responseData.id || 'simulated' + Date.now().toString().slice(-5)}/payment?total=${(parseFloat(currentSelectedProductForConfirmation.price) * currentQuantity).toFixed(2)}`;
        showInfoModal(
            "Pedido Enviado!",
            `Assim que for identificado o pagamento, o pedido será enviado para o email ${customerEmail}. Você será redirecionado para a página de pagamento em instantes.`,
            "success",
            true // Indica que este é um modal com redirecionamento
        );

        redirectTimeoutId = setTimeout(() => {
            if (isSuccessRedirectModalActive) { // Só redireciona se o modal ainda estiver ativo e o usuário não clicou OK
                window.location.href = currentRedirectUrl;
                isSuccessRedirectModalActive = false;
                currentRedirectUrl = null;
            }
        }, 7000); // Aumentado para 7 segundos

    } catch (error) {
        console.error('Falha no processo de compra:', error);
        closeConfirmationModal();
        showInfoModal("Erro na Compra", `Não foi possível concluir seu pedido: ${error.message}. Tente novamente.`, "error");

        productSelect.disabled = false;
        updateQuantityControls();
    } finally {
        confirmPurchaseButtonText.style.display = 'inline-block';
        confirmPurchaseSpinner.style.display = 'none';
        cancelPurchaseButton.disabled = false;
        validateConfirmEmail();
        currentSelectedProductForConfirmation = null;
    }
});

window.addEventListener('click', (event) => {
    if (event.target == infoModal) {
        // Se for o modal de sucesso e o usuário clicar fora, cancela o timeout automático
        if (isSuccessRedirectModalActive) {
            clearTimeout(redirectTimeoutId);
            isSuccessRedirectModalActive = false;
            currentRedirectUrl = null;
        }
        closeInfoModal();
    }
    if (event.target == confirmationPurchaseModal) {
        closeConfirmationModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    populateProducts();
});