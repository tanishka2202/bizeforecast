document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector(".add-product-form");

    // ── 1. Currency formatting on price inputs ─────────────────────────────
    const priceInputs = document.querySelectorAll('input[name="costPrice"], input[name="sellingPrice"]');
    priceInputs.forEach(input => {
        input.addEventListener('input', () => {
            let value = input.value.replace(/[^\d.]/g, '');
            if (value.includes('.')) {
                const parts = value.split('.');
                value = parts[0] + '.' + parts[1].substring(0, 2);
            }
            input.value = value;
        });
    });


    // ── 2. Client-side validation before Flask POST ────────────────────────
    function validateForm(formData) {
        const errors = [];

        const productName = formData.get('productName')?.trim();
        if (!productName || productName.length < 2) {
            errors.push('Product name must be at least 2 characters');
        }

        if (!formData.get('category')) {
            errors.push('Please select a category');
        }

        const costPrice = parseFloat(formData.get('costPrice'));
        const sellingPrice = parseFloat(formData.get('sellingPrice'));
        const quantitySold = parseInt(formData.get('quantitySold'));

        if (!costPrice || costPrice <= 0)     errors.push('Cost price must be greater than 0');
        if (!sellingPrice || sellingPrice <= 0) errors.push('Selling price must be greater than 0');
        if (isNaN(quantitySold) || quantitySold < 0) errors.push('Quantity sold cannot be negative');

        if (costPrice > sellingPrice) {
            errors.push('⚠️ Cost price is higher than selling price (you will make a loss)');
        }

        return errors;
    }


    // ── 3. Show inline error banner ────────────────────────────────────────
    function showError(message) {
        removeError();
        const banner = document.createElement('div');
        banner.className = 'flash-msg flash-error js-error-banner';
        banner.textContent = message;
        const formActions = document.querySelector('.form-actions');
        formActions.parentNode.insertBefore(banner, formActions);
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function removeError() {
        document.querySelector('.js-error-banner')?.remove();
    }


    // ── 4. Real-time profit preview between the two price fields ───────────
    const costInput     = document.querySelector('input[name="costPrice"]');
    const sellInput     = document.querySelector('input[name="sellingPrice"]');
    let profitBadge     = null;

    function updateProfitPreview() {
        const cost = parseFloat(costInput.value) || 0;
        const sell = parseFloat(sellInput.value) || 0;

        if (!profitBadge) {
            profitBadge = document.createElement('div');
            profitBadge.style.cssText = `
                margin-top: 6px; padding: 6px 12px; border-radius: 6px;
                font-size: 12px; font-weight: 600; transition: all 0.2s ease;
            `;
            sellInput.parentNode.appendChild(profitBadge);
        }

        if (cost > 0 && sell > 0) {
            const profit = sell - cost;
            const margin = ((profit / cost) * 100).toFixed(1);
            profitBadge.style.background = profit >= 0
                ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
            profitBadge.style.color      = profit >= 0 ? '#10b981' : '#ef4444';
            profitBadge.textContent = profit >= 0
                ? `✅ Profit: ₹${profit.toFixed(2)} (${margin}% margin)`
                : `⚠️ Loss: ₹${Math.abs(profit).toFixed(2)} per unit`;
        } else {
            profitBadge.textContent = '';
        }
    }

    if (costInput && sellInput) {
        costInput.addEventListener('input', updateProfitPreview);
        sellInput.addEventListener('input', updateProfitPreview);
    }


    // ── 5. Intercept submit — validate, then let Flask handle it ───────────
    form.addEventListener("submit", (e) => {
        removeError();
        const formData = new FormData(form);
        const errors = validateForm(formData);

        if (errors.length > 0) {
            e.preventDefault();          // stop the POST only on error
            showError(errors.join(' • '));
        }
        // If no errors → form submits normally to Flask /add-product
    });


    // ── 6. Confirm before delete ───────────────────────────────────────────
    window.confirmDelete = function(deleteForm) {
        const row  = deleteForm.closest('tr');
        const name = row?.querySelector('.product-name-cell')?.textContent?.trim() || 'this product';
        if (!confirm(`Delete "${name}"?\n\nThis will remove it from all your analytics.`)) {
            return false;
        }
        // Animate the row out before the page reloads
        if (row) {
            row.classList.add('deleting');
            setTimeout(() => deleteForm.submit(), 320);
            return false;   // we submit manually after animation
        }
        return true;
    };


    // ── 7. Auto-dismiss Flask flash messages after 4 s ────────────────────
    document.querySelectorAll('.flash-msg').forEach(msg => {
        setTimeout(() => {
            msg.style.transition = 'opacity 0.5s ease';
            msg.style.opacity    = '0';
            setTimeout(() => msg.remove(), 500);
        }, 4000);
    });

});