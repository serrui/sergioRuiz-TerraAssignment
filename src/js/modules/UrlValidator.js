/**
 * UrlValidator.js
 * 
 * @author Sergio Ruiz
 *
 * @description
 * This class validates URLs and calls an API endpoint to obtain his detailed redirect chain 
 * 
 */

class UrlValidator {
    constructor() {
        this.DOM = {
            input: document.querySelector('.js--url-input'),
            btn: document.querySelector('.js--url-submit'),
            resultContainer: document.querySelector('.js--url-result'),
        };

        this.apiUrl = '/api/check-url';
        this.isLoading = false;
        this.init();
    }

    init() {
        console.log("UrlValidator initialized");
        this.events();
    }

    events() { 
        // Check URL click event
        this.DOM.btn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Allow pressing "Enter" key for the input
        this.DOM.input?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSubmit();
            }
        });
    }

    /**
     * Communicate with the API if the URL is valid and process the render with the result.
     */
    async handleSubmit() {
        const url = this.DOM.input.value.trim();

        if (!this.isValidUrl(url)) {
            this.renderError('Please enter a valid URL');
            return;
        }

        this.isLoading = true;
        this.updateButtonState(true);
        this.DOM.resultContainer.innerHTML = '<p class="u--text-align-center">Analyzing redirect chain...</p>';

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();
            if (response.ok) {
                this.renderResults(data);
            } else {
                this.renderError(data.error || 'An error occurred while checking the URL.');
            }
        } catch (error) {
            console.error(error);
            this.renderError('Connection error. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateButtonState(false);
        }
    }

    /**
     * Checks if the URL has a valid format
     * @param {string} stringUrl 
     */
    isValidUrl(stringUrl) {
        try {
            const url = new URL(stringUrl);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return false;
            }
            const hostname = url.hostname;
            const domainRegex = /^[a-zA-Z0-9-.]+\.[a-z]{2,}$/i;
            return domainRegex.test(hostname);
        } catch {
            return false;
        }
    }

    /**
     * Disables the Check URL button while the system process the URL
     * @param {boolean} isloading 
     */
    updateButtonState(isloading) {
        if (this.DOM.btn) {
            this.DOM.btn.textContent = isloading ? 'Checking...' : 'Check URL';
            this.DOM.btn.disabled = isloading;
            this.DOM.btn.style.opacity = isloading ? '0.7' : '1';
        }
    }

    /**
     * Renders the error message in the view
     * @param {string} message 
     */
    renderError(message) {
        this.DOM.resultContainer.innerHTML = `
            <div class="c-url-error">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }

    /**
     * Renders the chain of redirects to the view 
     */
    renderResults(data) {
        const { chain, redirectLoopDetected, maxHopsReached } = data;

        let html = `
            <div class="c-url-results">
                <h4 class="u--mb-3">Redirect Chain (${data.redirectCount} redirects)</h4>
                <div>
        `;

        chain.forEach((hop, index) => {
            const isLast = index === chain.length - 1;
            const statusColorClass = this.getStatusColor(hop.status);
            
            html += `
                <div class="c-redirection-info-box">
                    <div class="${statusColorClass} c-status-code-box">
                        ${hop.status}
                    </div>
                    <div class="c-container-url-redirects">
                        <div class="hop-url">${hop.url}</div>
                        <div class="hop-text">${hop.statusText}</div>
                        ${hop.redirectTo ? `<div class="hop-redirect" >↳ Redirects to: ${hop.redirectTo}</div>` : ''}
                    </div>
                </div>
            `;
            
            if (!isLast) {
                html += `<div class="c-last-url-info">↓</div>`;
            }
        });

        html += `</div>`;

        if (redirectLoopDetected) {
            html += `<div class="c-url-loop"> Redirect Loop Detected.</div>`;
        } else if (maxHopsReached) {
            html += `<div class="c-url-max-hops"> Max redirect hops reached.</div>`;
        }

        html += `</div>`;

        this.DOM.resultContainer.innerHTML = html;
    }

    /**
     * Set the css class color for every status code
     * @param {int} status 
     */
    getStatusColor(status) {
        if (status >= 200 && status < 300) return 'c-url-status-green';
        if (status >= 300 && status < 400) return 'c-url-status-orange';
        if (status >= 400 && status < 500) return 'c-url-status-red';
        if (status >= 500) return 'c-url-status-darkred';
        return 'c-url-status-grey';
    }
}

export default UrlValidator;
