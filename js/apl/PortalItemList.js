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
/**
 *
 * PortalItemList
 *  - Element: apl-portal-item-list
 *  - Description: Portal Item List
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/22/2024 - 0.0.1 -
 * Modified:
 *
 */

class PortalItemList extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {Map<string,PortalItem>}
   */
  portalItemById;

  /**
   * @type {PortalItem[]}
   */
  #portalItems;

  /**
   *
   * @return {PortalItem[]}
   */
  get portalItems() {
    return this.#portalItems;
  }

  /**
   *
   * @param {PortalItem[]} portalItems
   */
  set portalItems(portalItems) {
    this.#portalItems = portalItems;
    this.updatePortalItemsList();
  }

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
   * @param {PortalItem[]} portalItems
   */
  constructor({container, portalItems} = {}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);
    this.portalItemById = new Map();
    this.#portalItems = portalItems;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}      
      </style>
      <calcite-list class="portal-item-list" selection-appearance="border" selection-mode="single-persist"></calcite-list>
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {

    this.portalItemList = this.shadowRoot.querySelector('.portal-item-list');
    this.portalItemList.addEventListener('calciteListChange', () => {
      const [selectedItem] = this.portalItemList.selectedItems;
      const portalItem = this.portalItemById.get(selectedItem.value);
      portalItem.load().then(() => {
        this.dispatchEvent(new CustomEvent('portal-item-selected', {detail: {portalItem}}));
      });
    });

    this.updatePortalItemsList().then(() => {
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
   */
  updatePortalItemsList() {
    return new Promise((resolve, reject) => {

      if (this.#portalItems?.length) {

        const listItems = this.#portalItems.map((portalItem, portalItemIdx) => {
          this.portalItemById.set(portalItem.id, portalItem);

          const itemIcon = document.createElement('calcite-action');
          itemIcon.setAttribute('slot', 'actions-start');
          itemIcon.setAttribute('icon', 'map');

          const listItem = document.createElement('calcite-list-item');
          listItem.setAttribute('value', portalItem.id);
          listItem.setAttribute('label', portalItem.title);
          listItem.append(itemIcon);

          return listItem;
        });

        this.portalItemList.replaceChildren(...listItems);
        this.dispatchEvent(new CustomEvent('list-updated', {detail: {itemCount: listItems.length}}));
        resolve();
      } else {
        this.portalItemList.replaceChildren();
        this.dispatchEvent(new CustomEvent('list-updated', {detail: {itemCount: 0}}));
        resolve();
      }

    });
  }

}

customElements.define("apl-portal-item-list", PortalItemList);

export default PortalItemList;
