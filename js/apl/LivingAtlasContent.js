/*
 Copyright 2023 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import PortalItemList from './PortalItemList.js';

/**
 *
 * LivingAtlasContent
 *  - Element: apl-living-atlas-content
 *  - Description: Living Atlas Content
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/22/2024 - 0.0.1 -
 * Modified:
 *
 */

class LivingAtlasContent extends HTMLElement {

  static version = '0.0.1';

  static VALID_ITEM_TYPES = ["Web Map"];

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {Portal}
   */
  portal;

  /**
   * @type {PortalUser}
   */
  portalUser;

  /**
   * @type {PortalGroup}
   */
  livingAtlasGroup;

  /**
   * @type {Map<string,PortalItem>}
   */
  portalItemById;

  /**
   * @type {PortalItemList}
   */
  portalItemList;

  /**
   * @type {boolean}
   */
  #loaded = false;
  get loaded() {
    return this.#loaded;
  }

  set loaded(value) {
    this.#loaded = value;
    this.dispatchEvent(new CustomEvent('loaded', {detail: {}}));
  }

  /**
   *
   * @param {HTMLElement|string} [container]
   * @param {Portal} portal
   */
  constructor({container, portal} = {}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);

    this.portal = portal;
    this.portalUser = this.portal?.user;
    this.portalItemById = new Map();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}      
        :host calcite-panel {
          /*max-height: 250px;*/
          padding: 8px;
        }
        :host calcite-card {          
          overflow: hidden;
        }         
      </style>
      <calcite-panel>
        <calcite-card>
          <div slot="title">Search Maps</div>          
          <calcite-input-text class="search-input" slot="subtitle" suffix-text="" placeholder="search topic..." input-mode="search" clearable icon="search"></calcite-input-text>          
        </calcite-card>        
        <div class="portal-item-list"></div>
      </calcite-panel>            
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {

    this.searchInput = this.shadowRoot.querySelector('.search-input');
    this.searchInput.addEventListener('calciteInputTextInput', () => {
      this.updateSearchResults({searchTerm: this.searchInput.value});
    });

    this.portalItemList = new PortalItemList({
      container: this.shadowRoot.querySelector('.portal-item-list')
    });
    this.portalItemList.addEventListener('portal-item-selected', ({detail: {portalItem}}) => {
      this.dispatchEvent(new CustomEvent('portal-item-selected', {detail: {portalItem}}));
    });

    // FIND LIVING ATLAS GROUP //
    this.portal.queryGroups({query: this.portal.livingAtlasGroupQuery}).then(({results}) => {
      // LIVING ATLAS GROUP //
      this.livingAtlasGroup = results.at(0);
      // LOADED //
      requestAnimationFrame(() => { this.loaded = true; });
    });

  }

  /**
   *
   * @returns {Promise<>}
   */
  load() {
    return new Promise((resolve, reject) => {
      if (this.loaded) { resolve(); } else {
        this.addEventListener('loaded', () => { resolve(); }, {once: true});
      }
    });
  }

  /**
   *
   * @param searchTerm
   */
  updateSearchResults({searchTerm}) {

    if (searchTerm?.length > 2) {

      const searchQuery = {
        query: `${searchTerm} AND type:"Web Map" AND typekeywords:"Web Map"`,
        sortField:'modified', sortOrder: 'desc',
      };

      this.livingAtlasGroup?.queryItems(searchQuery).then(({results}) => {

        const validPortalItems = results.filter(item => LivingAtlasContent.VALID_ITEM_TYPES.includes(item.type));
        this.searchInput.setAttribute('suffix-text', `top ${validPortalItems.length}`);
        this.portalItemList.portalItems = validPortalItems;

      });

    } else {
      this.searchInput.setAttribute('suffix-text', '');
      this.portalItemList.portalItems = null;
      this.dispatchEvent(new CustomEvent('portal-item-selected', {detail: {portalItem:null}}));
    }

  }

}

customElements.define("apl-living-atlas-content", LivingAtlasContent);

export default LivingAtlasContent;
