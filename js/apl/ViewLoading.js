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
 * ViewLoading
 *  - Element: apl-view-loading
 *  - Description: view loading indicator
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  11/7/2022 - 0.0.1 -
 * Modified:
 *
 */

class ViewLoading extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {MapView|SceneView}
   */
  view;

  /**
   * @type {boolean}
   */
  enabled;

  constructor({container, view, enabled = true}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);
    this.view = view;
    this.enabled = enabled;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {
          pointer-events: none;
          box-shadow: none !important;
        }
        :host calcite-loader {
          --calcite-loader-padding: 0;           
          margin: auto 15px;          
        }     
      </style>
      <calcite-loader type="indeterminate" scale="s"></calcite-loader>   
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {
    require(['esri/core/reactiveUtils'], (reactiveUtils) => {
      this.view.when(() => {
        const loader = this.shadowRoot.querySelector('calcite-loader');
        reactiveUtils.watch(() => this.view.updating, (updating) => {
          this.enabled && loader.toggleAttribute('hidden', !updating);
        });
      });
    });
  }

}

customElements.define("apl-view-loading", ViewLoading);

export default ViewLoading;
