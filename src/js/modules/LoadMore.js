/**
 * LoadMore.js
 * 
 * @author Sergio Ruiz
 *
 * @description
 * This class handles the dynamic loading of taxonomies and its information via API and
 * manages the taxonomy select filter login and the "Load More" pagination logic.
 *
 */

class LoadMore {
    constructor() {
        this.DOM = {
            select: document.querySelector('.js--taxonomy-select'),
            container: document.querySelector('.js--cards-container'),
            btnLoadMore: document.querySelector('.js--load-more'),
            btnHide: document.querySelector('.js--hide-results'),
            messageContainer: document.querySelector('.js--message-container'),
        };

        this.endpoints = {
            taxonomiesCategories: 'https://www.sei.com/wp-json/wp/v2/insight-types',
            items: 'https://www.sei.com/wp-json/wp/v2/insight'
        };

        this.state = {
            currentTaxonomyId: null,
            currentSize: 0,
            isLoading: false,
            hasMore: true
        };

        this.config = {
            pagSize: 8,
            maxPagSize: 32
        };

        this.init();
    }

    async init() {
        console.log("LoadMore initialized");
        this.events();
        
        if (this.DOM.btnLoadMore) this.DOM.btnLoadMore.style.display = 'none';
        if (this.DOM.btnHide) this.DOM.btnHide.style.display = 'none';

        await this.fetchTaxonomies();
    }

    events() {
        // Taxonomy select change event
        this.DOM.select?.addEventListener('change', (e) => {
            this.handleTaxonomyChange(e.target.value);
        });

        // Load more click event
        this.DOM.btnLoadMore?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadItems();
        });

        // Hide click event
        this.DOM.btnHide?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleHide();
        });
    }

    /**
     * Updates the status message
     */
    updateMessage(text) {
        if (this.DOM.messageContainer) {
            this.DOM.messageContainer.innerHTML = text 
                ? `<p class="u--text-align-center status-cards-message">${text}</p>` 
                : '';
        }
    }

    /**
     * Hides the status message.
     */
    hideMessage() {
        if (this.DOM.messageContainer) {
            this.DOM.messageContainer.style.display = 'none';
        }
    }

    /**
     * Shows the status message.
     */
    showMessage() {
        if (this.DOM.messageContainer) {
            this.DOM.messageContainer.style.display = 'inline-block';
        }
    }

    /**
     * Separates the title and subtitle for the items entries
     * @param {string} fullTitle 
     */
    formatContent(fullTitle) {
        let sanitizedTitle = this.escapeHTML(fullTitle);
        let title = sanitizedTitle;
        let subtitle = "";

        if (sanitizedTitle.includes(':')) {
            const parts = sanitizedTitle.split(':');
            title = parts[0].trim();
            subtitle = parts[1].trim();
        }

        return { title, subtitle };
    }

    /**
     * Get the information to fill the taxonomies categories select
     */
    async fetchTaxonomies() {
        try {
            const response = await fetch(this.endpoints.taxonomiesCategories);
            const categories = await response.json();
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                this.DOM.select.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching taxonomies categories:", error);
        }
    }

    /**
     * Logic for every change on taxonomies category select
     * @param {int} taxonomyId 
     */ 
    async handleTaxonomyChange(taxonomyId) {
        this.DOM.container.innerHTML = '';
        this.state.currentTaxonomyId = taxonomyId;
        this.state.currentSize = 0;
        this.state.hasMore = true;
        this.hideMessage();

        if (!taxonomyId) {
            this.toggleButtons(false, false);
            return;
        }
        await this.loadItems();
    }

    /**
     * Gets the items data from the API for the taxonomy selected
     */
    async loadItems() {
        if (this.state.isLoading || !this.state.hasMore) return;

        this.state.isLoading = true;
        
        if (this.state.currentSize === 0) {
            this.DOM.container.innerHTML = '<div class="f--col-12 u--text-align-center"><p>Loading insights...</p></div>';
        }

        const limit = this.config.pagSize;
        const url = `${this.endpoints.items}?insight-types=${this.state.currentTaxonomyId}&per_page=${limit}&offset=${this.state.currentSize}`;

        try {
            const response = await fetch(url);
            const items = await response.json();

            if (this.state.currentSize === 0){
                this.DOM.container.innerHTML = '';
            } 

            if (items.length > 0) {
                this.renderCards(items);
                this.state.currentSize += items.length;
                if (items.length < limit || this.state.currentSize == this.config.maxPagSize) {
                    this.state.hasMore = false;
                    this.toggleButtons(false, true);
                } else {
                    this.toggleButtons(true, false);
                }
            } else {
                this.state.hasMore = false;
                this.toggleButtons(false, this.state.currentSize > 0);
                this.showMessage();
                this.updateMessage('Sorry, no results for this category');
            }
        } catch (error) {
            console.error("Error loading items:", error);
        } finally {
            this.state.isLoading = false;
        }
    }

    /**
     * Show item information in each card
     * @param {array} items 
     */
    renderCards(items) {
        items.forEach(item => {
            const { title, subtitle } = this.formatContent(item.title.rendered);
            
            const cardHTML = `<div class="f--col-6 c-card-style-class">
                    <div class="c--card-a">
                        <h3 class="c--card-a__title c-card-header">${title}</h3>
                        <p class="c--card-a__subtitle">${subtitle}</p>
                    </div>
                </div> `;
            this.DOM.container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    /**
     * Hide button logic to reset viewed elements
     */
    handleHide() {
        this.DOM.container.innerHTML = '';
        this.state.currentSize = 0;
        this.state.hasMore = true;
        this.loadItems();
    }

    /**
     * Show or hide the Load More and Hide buttons
     * @param {boolean} showLoadMore 
     * @param {boolean} showHide 
     */
    toggleButtons(showLoadMore, showHide) {
        if (this.DOM.btnLoadMore) {
            this.DOM.btnLoadMore.style.display = showLoadMore ? 'inline-block' : 'none';
        }
        if (this.DOM.btnHide) {
            this.DOM.btnHide.style.display = showHide ? 'inline-block' : 'none';
        }
    }

    /**
     * Sanitizes input strings to prevent HTML injection issues.
     * @param {string} string 
     */
    escapeHTML(string) {
        if (!string) return '';
        return string.replace(/[&<>"']/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[tag]));
    }
    
}

export default LoadMore;