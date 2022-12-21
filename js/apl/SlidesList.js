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
 * SlidesList
 *  - Element: apl-slides-list
 *  - Description: The SlidesList web component displays the Slides of a Web Scene in a list.
 *                 Clicking on a list item will zoom to the viewpoint of the Slide.
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  7/5/2022 - 0.0.1 -
 * Modified:
 *
 */

class SlidesList extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLElement}
   */
  _container;

  /**
   * @type {SceneView}
   */
  _view;

  /**
   * @type {string}
   */
  _webSceneId;

  /**
   * @type {boolean}
   */
  _displayThumbnails;

  /**
   * @type {Slide[]}
   */
  _slides;

  /**
   *
   * @param {SceneView | null} [view]
   * @param {HTMLElement | string | null} container
   * @param {string | null} [webSceneId]
   * @param {boolean | null} [displayThumbnails]
   */
  constructor({view, container = null, webSceneId = null, displayThumbnails = true}) {
    super();

    this._container = (container instanceof HTMLElement) ? container : document.getElementById(container);

    this._view = view;
    this._webSceneId = webSceneId || this.getAttribute('webSceneId');
    this._displayThumbnails = displayThumbnails || this.getAttribute('displayThumbnails');

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          justify-content: flex-start; 
          min-width: 0;
          min-height: 0;                     
          color: var(--calcite-ui-brand);
          background-color: var(--calcite-ui-foreground-1) !important;          
        }          
        :host calcite-list {   
          flex: 1 1 auto;                           
          min-width: 180px;
          min-height: 0;
          width: 100%;
          height: auto;
        }        
        :host calcite-list:empty {
          content: 'No Slides Available';
        }        
        :host calcite-list-item img {
          padding: 5px;
          height: 44px;          
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }        
      </style>
      <calcite-list></calcite-list>     
    `;

    this._container?.append(this);

  }

  /**
   *
   */
  connectedCallback() {

    this.list = this.shadowRoot.querySelector('calcite-list');

    if (this._view?.type === '3d') {
      this._createSlidesFromWebScene({webScene: this._view.map});
    } else {
      if (this._webSceneId) {
        this._createSlidesFromItem({webSceneId: this._webSceneId});
      }
    }
  }

  /**
   *
   * @param {string} webSceneId
   * @private
   */
  _createSlidesFromItem({webSceneId}) {
    require(['esri/WebScene'], (WebScene) => {
      const webScene = new WebScene({portalItem: {id: webSceneId}});
      this._createSlidesFromWebScene({webScene});
    });
  }

  /**
   *
   * @param {WebScene} webScene
   * @private
   */
  _createSlidesFromWebScene({webScene}) {
    webScene.load().then(() => {
      this._slides = webScene.presentation.slides;
      this._createSlideListItems({slides: this._slides});
      this.dispatchEvent(new CustomEvent('slides-ready', {detail: {}}));
    });
  }

  /**
   *
   * @private
   */
  _createSlideListItems({slides}) {

    const slideListItems = slides.map(slide => {
      const slideListItem = document.createElement('calcite-list-item');
      slideListItem.setAttribute('label', slide.title.text);

      const slideThumb = document.createElement('img');
      slideThumb.setAttribute('slot', 'content-start');
      slideThumb.setAttribute('src', slide.thumbnail.url);
      slideThumb.toggleAttribute('hidden', !this._displayThumbnails);
      slideListItem.append(slideThumb);

      slideListItem.addEventListener('calciteListItemSelect', () => {
        this._view.goTo({target: slide.viewpoint});
      });

      return slideListItem;
    });
    slideListItems.length && this.list.replaceChildren(...slideListItems);

  }

  /**
   *
   * @param {string} slideTitle
   * @param {{[duration]:number}} goToOptions
   * @returns {Promise<unknown>}
   */
  goToSlide(slideTitle, goToOptions = {}) {
    return new Promise((resolve, reject) => {
      require(["esri/core/reactiveUtils"], (reactiveUtils) => {
        const goToSlide = this._slides.find(slide => slide.title.text === slideTitle);
        if (goToSlide) {
          reactiveUtils.whenOnce(() => !this._view.updating).then(() => {
            this._view.goTo({target: goToSlide.viewpoint}, goToOptions).then(resolve).catch(reject);
          });
        } else { resolve(); }
      });
    });
  }

}

customElements.define("apl-slides-list", SlidesList);

export default SlidesList;
