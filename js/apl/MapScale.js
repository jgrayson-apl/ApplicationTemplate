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
 * MapScale
 *  - Element: apl-map-scale
 *  - Description: Map Scale
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  1/24/2024 - 0.0.1 -
 * Modified:
 *
 */

const reactiveUtils = await $arcgis.import("esri/core/reactiveUtils");

class MapScale extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {MapView | SceneView}
   */
  view;

  /**
   * @type {NumberFormat}
   */
  scaleFormatter;

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
   * @param {MapView | SceneView} view
   */
  constructor({container, view}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);
    this.view = view;
    this.scaleFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 0, maximumFractionDigits: 0});

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {
          box-shadow: none !important;
        }      
      </style>
      <calcite-chip icon="switch" scale="s" title="map scale"></calcite-chip>     
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {

    const scaleLabel = this.shadowRoot.querySelector('calcite-chip');

    reactiveUtils.watch(() => this.view.scale, scale => {
      scaleLabel.innerHTML = `1: ${ this.scaleFormatter.format(scale) }`;
    }, {initial: true});

    // LOADED //
    requestAnimationFrame(() => { this.loaded = true; });

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

}

customElements.define("apl-map-scale", MapScale);

export default MapScale;
