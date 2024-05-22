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
 * UserContent
 *  - Element: apl-user-content
 *  - Description: User Content
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  4/22/2024 - 0.0.1 -
 * Modified:
 *
 */

class UserContent extends HTMLElement {

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
   * @type {Map<string,PortalFolder>}
   */
  portalFolderById;

  /**
   * @type {Map<string,PortalItem>}
   */
  portalItemById;

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
    this.portalFolderById = new Map();
    this.portalItemById = new Map();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}      
        :host calcite-flow {
          max-height: 250px;
        }        
      </style>
      <calcite-flow class="folders-flow">
        <calcite-flow-item class="folders-flow-item">                    
          <calcite-list class="folders-list" selection-appearance="border" selection-mode="single-persist"></calcite-list>                    
        </calcite-flow-item>
      </calcite-flow>     
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {

    this.flow = this.shadowRoot.querySelector('.folders-flow');
    this.flow.addEventListener('calciteFlowItemBack', () => {
      this.dispatchEvent(new CustomEvent('portal-item-selected', {detail: {portalItem: null}}));
    });

    this.foldersList = this.shadowRoot.querySelector('.folders-list');
    this.foldersList.addEventListener('calciteListChange', () => {
      const [selectedItem] = this.foldersList.selectedItems;
      const selectedPortalFolder = this.portalFolderById.get(selectedItem.value);
      this.portalFolderSelected({portalFolder: selectedPortalFolder}).then(({hasItems}) => {
        selectedItem.toggleAttribute('disabled', !hasItems);
      });
    });

    this.displayFolderList().then(() => {
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
  displayFolderList() {
    return new Promise((resolve, reject) => {

      if (this.portalUser) {

        this.portalUser.fetchFolders().then((folders) => {

          const homeFolder = {id: '/', title: this.portal.user.username, icon: 'home'};

          const folderItems = [homeFolder, ...folders].map(folder => {
            this.portalFolderById.set(folder.id, folder);

            const folderIcon = document.createElement('calcite-action');
            folderIcon.setAttribute('slot', 'actions-start');
            folderIcon.setAttribute('icon', folder.icon || 'folder');

            const folderItem = document.createElement('calcite-list-item');
            folderItem.setAttribute('value', folder.id);
            folderItem.setAttribute('label', folder.title);
            folderItem.append(folderIcon);

            return folderItem;
          });
          this.foldersList.replaceChildren(...folderItems);

          resolve();
        });
      } else { reject(); }

    });
  }

  /**
   *
   * @param {PortalFolder} portalFolder
   * @return {Promise<{hasItems:boolean}>}
   */
  portalFolderSelected({portalFolder}) {
    return new Promise((resolve, reject) => {

      this.portalUser.fetchItems({folder: portalFolder}).then(({items}) => {

        const validPortalItems = items.filter(item => UserContent.VALID_ITEM_TYPES.includes(item.type));
        if (validPortalItems.length) {

          const portalItemsList = new PortalItemList({portalItems:validPortalItems});
          portalItemsList.addEventListener('portal-item-selected', ({detail: {portalItem}}) => {
            this.dispatchEvent(new CustomEvent('portal-item-selected', {detail: {portalItem}}));
          });

          const itemsFlowItem = document.createElement('calcite-flow-item');
          itemsFlowItem.setAttribute('description', `${ validPortalItems.length } items in ${ portalFolder.title }`);
          itemsFlowItem.append(portalItemsList);
          this.flow.append(itemsFlowItem);
          resolve({hasItems: true});

        } else {
          resolve({hasItems: false});
        }
      }).catch(reject);

    });
  }

}

customElements.define("apl-user-content", UserContent);

export default UserContent;
