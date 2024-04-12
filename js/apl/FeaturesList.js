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

const Feature = await $arcgis.import("esri/widgets/Feature");

class FeaturesList extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {HTMLTemplateElement}
   */
  static FEATURE_ITEM_TEMPLATE;
  static {
    FeaturesList.FEATURE_ITEM_TEMPLATE = document.createElement('template');
    FeaturesList.FEATURE_ITEM_TEMPLATE.innerHTML = `      
      <calcite-list-item value="" label="" description="">        
        <calcite-action slot="actions-end" scale="s" icon="information"></calcite-action>        
      </calcite-list-item>
    `;
  }

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
   *
   * @param {HTMLElement|string} container
   * @param {MapView|SceneView} view
   * @param {FeatureLayer} featureLayer
   * @param {Object} queryParams
   * @param {FeatureInfoCallback} getFeatureInfoCallback
   */
  constructor({
                container,
                view,
                featureLayer,
                queryParams,
                getFeatureInfoCallback
              }) {
    super();

    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);
    this.view = view;
    this.featureLayer = featureLayer;
    this.#queryParams = {
      where: '1=1',
      maxRecordCountFactor: 5,
      returnGeometry: false,
      ...queryParams
    };
    this.getFeatureInfo = getFeatureInfoCallback;

    this.featuresByOID = new Map();
    this.geometryByOID = new Map();

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {          
          display: flex;
          flex-direction: column;
          flex: 1 1 auto;
          /*overflow: auto;*/          
        }
        :host calcite-panel [slot="footer"]{
          justify-content: space-around;
        }
        :host calcite-pagination {
          width: 100%;
        }               
      </style>            
      <calcite-flow>        
        <calcite-flow-item>          
          <calcite-panel class="list-container" >
            <calcite-action slot="header-actions-end" class="clear-selection-action" icon="selection-x" title="clear selection"></calcite-action>
            <calcite-list filter-enabled selection-mode="single" selection-appearance="icon"></calcite-list>                          
            <calcite-pagination slot="footer" page-size="1" start-item="1" total-items="100" scale="s"></calcite-pagination>
          </calcite-panel>      
        </calcite-flow-item>          
      </calcite-flow>
    `;

    this.container?.append(this);

  }

  /**
   *
   */
  connectedCallback() {

    // FLOW //
    this.flowPanel = this.shadowRoot.querySelector('calcite-flow');
    // PANEL //
    this.listPanel = this.shadowRoot.querySelector('.list-container');
    // PANEL HEADING //
    this.listPanel.setAttribute('heading', this.featureLayer.title);

    // CLEAR LIST ACTION //
    this.clearListAction = this.shadowRoot.querySelector('.clear-selection-action');
    this.clearListAction.addEventListener('click', () => {
      this.clearSelection();
    });

    // LIST //
    this.list = this.shadowRoot.querySelector('calcite-list');
    // FILTER PLACEHOLDER //
    this.list.setAttribute('filter-placeholder', `filter '${ this.featureLayer.title }' features...`);

    // LIST SELECTION CHANGE //
    this.list.addEventListener('calciteListItemSelect', () => {

      const [selectedItem] = this.list.selectedItems;
      if (selectedItem) {
        const action = selectedItem.querySelector('calcite-action');
        action.toggleAttribute('loading', true);
        this._goToFeature({selectedItem}).then(() => {
          action.toggleAttribute('loading', false);
        });
      }
    });

    // CREATE FEATURES LIST //
    this._createFeaturesList();

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
   * @param {Graphic} detailsFeature
   * @private
   */
  _updateDetails(detailsFeature) {

    const featureUI = new Feature({
      container: document.createElement("div"),
      view: this.view,
      graphic: detailsFeature
    });

    const featureUICard = document.createElement("calcite-card");
    featureUICard.style.setProperty('margin', '5px');
    featureUICard.append(featureUI.container);

    const detailsFlowItem = document.createElement("calcite-flow-item");
    detailsFlowItem.setAttribute('heading', 'Details');
    detailsFlowItem.append(featureUICard);

    this.flowPanel.append(detailsFlowItem);

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

    const {value, label, description} = this.getFeatureInfo(feature);

    featureListItem.setAttribute('value', value);
    featureListItem.setAttribute('label', label);
    featureListItem.setAttribute('description', description);

    const action = featureListItem.querySelector('calcite-action');
    action.addEventListener('click', () => {
      this._updateDetails(feature);
    });

    return featureListItem;
  }

  /**
   *
   * @param {number} featureOID
   * @returns {Promise<Graphic>}
   * @private
   */
  _getFeatureGeometry({featureOID}) {
    return new Promise((resolve, reject) => {

      let geometry = this.geometryByOID.get(featureOID);
      if (geometry) {
        resolve({geometry});

      } else {
        this.featureLayer.queryFeatures({
          returnGeometry: true,
          outFields: [],
          objectIds: [Number(featureOID)]
        }).then(fs => {
          if (fs.features.length) {
            geometry = fs.features[0].geometry;
            this.geometryByOID.set(featureOID, geometry);
            resolve({geometry});
          } else {
            reject(new Error("Can't get feature geometry."));
          }
        }).catch(reject);
      }

    });
  }

  /**
   *
   * @param {CalciteListItem} selectedItem
   * @private
   */
  _goToFeature({selectedItem}) {
    return new Promise((resolve, reject) => {

      const featureOID = Number(selectedItem.value);

      this._getFeatureGeometry({featureOID}).then(({geometry}) => {
        const goToTarget = (geometry.type === 'point') ? geometry : geometry.extent.clone().expand(1.5);
        const goToOptions = (geometry.type === 'point') ? {scale: 500000} : {};
        this.view.goTo({target: goToTarget, ...goToOptions}).then(() => {
          resolve({geometry});
        });
      }).catch(reject);

    });
  }

  /**
   *
   */
  clearSelection() {
    this.list.selectedItems.forEach(selectedItem => selectedItem.selected = false);
  }

  /**
   *
   * @param {number} featureOID
   */
  /*updateSelection({featureOID}) {
   if (featureOID) {
   const featureListItem = this.list.querySelector(`calcite-list-item[value="${ featureOID }"]`);
   if (featureListItem) {
   featureListItem.scrollIntoView({block: 'center', behavior: 'smooth'});
   featureListItem.selected = true;
   }
   } else {
   this.clearSelection();
   }
   }*/

}

customElements.define("apl-features-list", FeaturesList);

export default FeaturesList;

/*
 this.displayFeatureList({view});
 ====================
 displayFeatureList({view}) {
 if (view) {

 const dateFormatter = new Intl.DateTimeFormat('default', {day: 'numeric', month: 'short', year: 'numeric'});
 const acresFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 1, maximumFractionDigits: 1});

 // FEATURE LAYER //
 const layerTitle = 'Current Perimeters';
 const featureLayer = view.map.allLayers.find(layer => layer.title === layerTitle);
 if (featureLayer) {
 featureLayer.load().then(() => {
 featureLayer.set({outFields: ["*"]});

 // ENABLE TOGGLE ACTION //
 document.querySelector('calcite-action[data-toggle="features-list"]').removeAttribute('hidden');

 /!**
 * GER FEATURE INFO CALLBACK
 *
 * @param {Graphic} feature
 * @returns {{description: string, label: string, value: string}}
 *!/

 // FEATURES LIST //
 const featuresList = new FeaturesList({
 view,
 container: 'feature-list-container',
 featureLayer,
 queryParams: {
 where: '(IncidentName is not null)',
 outFields: ['OBJECTID', 'IncidentName', 'FeatureCategory', 'GISAcres', 'DateCurrent'],
 orderByFields: ['DateCurrent DESC']
 },
 getFeatureInfoCallback: (feature) => {
 return {
 value: String(feature.getObjectId()),
 label: `${ feature.attributes.IncidentName }`,
 description: `${ dateFormatter.format(new Date(feature.attributes.DateCurrent)) } | Acres: ${ acresFormatter.format(feature.attributes.GISAcres) }`
 };
 }
 });

 });
 } else {
 this.displayError({
 name: `Can't Find Layer`,
 message: `The layer '${ layerTitle }' can't be found in this map.`
 });
 }

 }
 }*/
