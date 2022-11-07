/*
 Copyright 2022 Esri

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
 * Pane
 *  - Element: apl-pane
 *  - Description: A simple display pane
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  11/7/2022 - 0.0.1 -
 * Modified:
 *
 */

class Pane extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   *
   */
  constructor({container}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {
          color: var(--calcite-ui-text-1);
          background-color: var(--calcite-ui-foreground-1);          
        }      
        .apl-pane {
          padding: 8px;
          margin: 8px;   
          border: solid 1px var(--calcite-ui-border-1);
        }        
      </style>
      <div class="apl-pane">
    
      </div>     
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {



  }

}

customElements.define("apl-pane", Pane);

export default Pane;
