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
 * FeaturesList
 *  - Element: apl-features-list
 *  - Description: A list of Features
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  7/12/2022 - 0.0.1 -
 * Modified:
 *
 *
 * pagination: https://codepen.io/benelan/pen/bGvdEgR
 *
 */

class FeaturesList extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLTemplateElement}
   */
  static FEATURE_ITEM_TEMPLATE;
  static {
    FeaturesList.FEATURE_ITEM_TEMPLATE = document.createElement('template');
    FeaturesList.FEATURE_ITEM_TEMPLATE.innerHTML = `      
      <calcite-list-item
        label=""
        description=""
        value="">        
        <calcite-action
          slot="actions-end"
          label=""
          scale="s"
          appearance="transparent"
          icon="blank">
        </calcite-action>
      </calcite-list-item>
    `;
  }

  /**
   *
   * @enum {string}
   */
  static ACTIVITY = {
    'NONE': 'NONE',
    'GOTO': 'GOTO',
    'POPUP': 'POPUP',
    'EVENT': 'EVENT'
  };

  /**
   *
   * @enum {string}
   */
  static ACTIVITY_ICON = {
    'NONE': 'blank',
    'GOTO': 'zoom-to-object',
    'POPUP': 'popup',
    'EVENT': 'route-from'
  };

  /**
   * @type {string}
   */
  id;

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {MapView|SceneView}
   */
  view;

  /**
   * @type {FeatureLayer}
   */
  featureLayer;

  /**
   * @type {Object}
   */
  #queryParams;
  set queryParams(value) {
    this.#queryParams = {...this.#queryParams, ...value};
    this._createFeaturesList();
  }

  /**
   * @type {Map<number,Graphic>}
   */
  featuresByOID;

  /**
   * @type {Map<number,Geometry>}
   */
  geometryByOID;

  /**
   *
   * @callback FeatureInfoCallback
   * @param {Graphic} feature
   * @returns {{description: string, label: string, value: string}}
   */
  getFeatureInfo;

  /**
   * @type {FeaturesList.ACTIVITY}
   */
  selectActivity;

  /**
   * @type {AbortController}
   */
  activityAbortController;

  /**
   * @type {FeaturesList.ACTIVITY}
   */
  actionActivity;

  /**
   * @type {boolean}
   */
  filterEnabled;

  /**
   *
   * @param {HTMLElement|string} container
   * @param {MapView|SceneView} view
   * @param {boolean} [filterEnabled]
   * @param {FeaturesList.ACTIVITY} [selectActivity]
   * @param {FeaturesList.ACTIVITY} [actionActivity]
   */
  constructor({container, view, filterEnabled = true, selectActivity = FeaturesList.ACTIVITY.NONE, actionActivity = FeaturesList.ACTIVITY.NONE}) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);
    this.view = view;

    this.filterEnabled = filterEnabled;
    this.selectActivity = selectActivity;
    this.actionActivity = actionActivity;

    this.featuresByOID = new Map();
    this.geometryByOID = new Map();

    this.#queryParams = {
      where: '1=1',
      maxRecordCountFactor: 5,
      returnGeometry: false
    };

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {          
          display: flex;            
          flex-shrink: 1;
          flex-grow: 1;
          flex-direction: column;
          justify-content: flex-start;            
          min-width: 0;
          min-height: 0;                     
          max-height: calc(100vh - 120px);         
          overflow: auto;
        }       
      </style>
      <calcite-panel heading="Features List">
        <calcite-action slot="header-actions-end" class="clear-selection-action" icon="selection-x" title="clear selection"></calcite-action>      
        <calcite-list filter-enabled="${ String(this.filterEnabled) }" selection-mode="single" selection-appearance="icon"</calcite-list>        
      </calcite-panel>           
    `;

    //<calcite-pagination slot="footer" num="100"></calcite-pagination>

    this.container?.append(this);

  }

  /**
   *
   */
  connectedCallback() {

    // PANEL //
    this.panel = this.shadowRoot.querySelector('calcite-panel');

    // CLEAR LIST ACTION //
    this.clearListAction = this.shadowRoot.querySelector('.clear-selection-action');
    this.clearListAction.addEventListener('click', () => {
      this.clearSelection();
    });

    // LIST //
    this.list = this.shadowRoot.querySelector('calcite-list');

    // SELECTION ACTIVITY //
    if (this.selectActivity !== FeaturesList.ACTIVITY.NONE) {
      // LIST SELECTION CHANGE //
      this.list.addEventListener('calciteListItemSelect', () => {
        requestAnimationFrame(() => {
          const selectedItems = this.list.querySelectorAll("[selected]")
          if(selectedItems?.length) {
            const selectedItem = selectedItems[0];
            this._doActivity({activity: this.selectActivity, oid: Number(selectedItem.value), eventName: 'item-selected'});
          } else {
            this.clearSelection();
          }
        });
      });
    }

  }

  /**
   *
   * @param {FeatureLayer} featureLayer
   * @param {Object}queryParams
   * @param {FeatureInfoCallback} getFeatureInfoCallback
   */
  initialize({featureLayer, queryParams = {}, getFeatureInfoCallback}) {
    require(['esri/core/reactiveUtils'], (reactiveUtils) => {

      this.id = `feature-list-${ featureLayer.title.replace(/ /g, '_') }`;

      this.featureLayer = featureLayer;
      this.#queryParams = {...this.#queryParams, ...queryParams};
      this.getFeatureInfo = getFeatureInfoCallback;

      // PANEL HEADING //
      this.panel.setAttribute('heading', this.featureLayer.title);

      // FILTER PLACEHOLDER //
      this.filterEnabled && this.list.setAttribute('filter-placeholder', `filter '${ this.featureLayer.title }' features...`);

      // CREATE FEATURES LIST //
      this._createFeaturesList();

      // VIEW SELECTION CHANGE //
      reactiveUtils.watch(() => this.view.popup.selectedFeature, selectedFeature => {
        if (selectedFeature?.layer.id === this.featureLayer.id) {
          const featureOID = selectedFeature.getObjectId();
          this.updateSelection({featureOID});
        } else {
          this.clearSelection();
        }
      });

    });
  }

  /**
   *
   */
  refresh() {
    this._createFeaturesList();
  }

  /**
   *
   */
  _createFeaturesList() {

    // SHOW LOADING //
    this.list.toggleAttribute('loading', true);

    const featuresQuery = this.featureLayer.createQuery();
    featuresQuery.set(this.#queryParams);
    this.featureLayer.queryFeatures(featuresQuery).then(featuresFS => {

      // CREATE FEATURE LIST ITEMS //
      const featureListItems = featuresFS.features.map(feature => {
        this.featuresByOID.set(feature.getObjectId(), feature);
        return this._createFeatureListItem({feature});
      });

      // ADD FEATURE LIST ITEMS //
      this.list.replaceChildren(...featureListItems);
      // HIDE LOADING //
      this.list.toggleAttribute('loading', false);

      console.info("Feature list updated ::: -Count: ", featureListItems.length, "-Where: ", this.#queryParams.where);

    }).catch(console.error);

  }

  /**
   *
   * @param {FeaturesList.ACTIVITY} activity
   * @param {number} oid
   * @param {string} eventName
   * @private
   */
  _doActivity({activity, oid, eventName}) {

    this.activityAbortController?.abort();
    this.activityAbortController = new AbortController();

    // GEOMETRY //
    this._getFeatureGeometry({featureOID: oid, signal: this.activityAbortController.signal}).then(({geometry}) => {
      // FEATURE //
      const feature = this.featuresByOID.get(oid);
      // ACTIVITY //
      switch (activity) {
        case FeaturesList.ACTIVITY.GOTO:
          this._goToFeatureByOID(oid).then(() => {
            if (this.view.popup.selectedFeature?.getObjectId() !== oid) {
              this.view.popup.close();
            }
            this.dispatchEvent(new CustomEvent(eventName, {detail: {activity, feature, geometry}}));
          });
          break;
        case FeaturesList.ACTIVITY.POPUP:
          this.view.popup.open({features: [feature]});
          this.dispatchEvent(new CustomEvent(eventName, {detail: {activity, feature, geometry}}));
          break;
        case FeaturesList.ACTIVITY.EVENT:
          this.dispatchEvent(new CustomEvent(eventName, {detail: {activity, feature, geometry}}));
          break;
      }
    }).catch(error => { if (error.name !== 'AbortError') { console.error(error);}});
  }

  /**
   *
   * @param {Graphic} feature
   * @returns {HTMLElement}
   * @private
   */
  _createFeatureListItem({feature}) {
    const templateContent = FeaturesList.FEATURE_ITEM_TEMPLATE.content.cloneNode(true);
    const featureListItem = templateContent.querySelector('calcite-list-item');

    const {label, description, value} = this.getFeatureInfo(feature);

    featureListItem.setAttribute('label', label);
    featureListItem.setAttribute('description', description);
    featureListItem.setAttribute('value', value);

    const action = featureListItem.querySelector('calcite-action');
    if (this.actionActivity === FeaturesList.ACTIVITY.NONE) {
      action.toggleAttribute('hidden', true);

    } else {
      action.setAttribute('icon', FeaturesList.ACTIVITY_ICON[this.actionActivity]);
      action.addEventListener('click', () => {
        const actionOID = Number(action.parentNode.value);
        this._doActivity({activity: this.actionActivity, oid: actionOID, eventName: 'item-action'});
      });
    }

    return featureListItem;
  }

  /**
   *
   * @param {number} featureOID
   * @param {AbortSignal} [signal]
   * @returns {Promise<Graphic>}
   * @private
   */
  _getFeatureGeometry({featureOID, signal}) {
    return new Promise((resolve, reject) => {
      require(['esri/core/promiseUtils'], (promiseUtils) => {

        let geometry = this.geometryByOID.get(featureOID);
        if (geometry) {
          resolve({geometry});
        } else {
          this.featureLayer.queryFeatures({
            returnGeometry: true,
            outFields: [],
            objectIds: [Number(featureOID)]
          }, {signal}).then(fs => {
            if (signal.aborted) {
              reject(promiseUtils.createAbortError());
            } else {
              if (fs.features.length) {
                geometry = fs.features[0].geometry;
                this.geometryByOID.set(featureOID, geometry);
                resolve({geometry});
              } else { reject(new Error("Can't get feature geometry.")); }
            }
          });
        }

      });
    });
  }

  /**
   *
   * @param {number} featureOID
   * @private
   */
  _goToFeatureByOID(featureOID) {
    return new Promise((resolve, reject) => {
      require(['esri/core/reactiveUtils'], (reactiveUtils) => {

        const selectedItem = this.list.querySelector(`calcite-list-item[value="${ featureOID }"]`);
        const action = selectedItem.querySelector('calcite-action');
        action.toggleAttribute('loading', true);

        this._getFeatureGeometry({featureOID}).then(({geometry}) => {
          const goToTarget = (geometry.type === 'point') ? geometry : geometry.extent.clone().expand(1.5);
          const goToOptions = (geometry.type === 'point') ? {scale: 500000} : {};
          this.view.goTo({target: goToTarget, ...goToOptions}).then(() => {
            resolve({geometry});
          }).catch(reject).then(() => {
            action.toggleAttribute('loading', false);
          });
        }).catch(reject);
      });
    });
  }

  /**
   *
   */
  clearSelection() {
    this.view.popup.close();
    this.list.selectedItems.forEach(selectedItem => selectedItem.selected = false);
  }

  /**
   *
   * @param {number} featureOID
   */
  updateSelection({featureOID}) {
    if (featureOID) {
      const featureListItem = this.list.querySelector(`calcite-list-item[value="${ featureOID }"]`);
      if (featureListItem) {
        featureListItem.scrollIntoView({block: 'center', behavior: 'smooth'});
        featureListItem.selected = true;
      }
    } else {
      this.clearSelection();
    }
  }

}

customElements.define("apl-features-list", FeaturesList);

export default FeaturesList;
