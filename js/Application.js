/*
 Copyright 2020 Esri

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

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";

class Application extends AppBase {

  // PORTAL //
  portal;

  // SIGN IN //
  signIn;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // APP TITLE //
        this.title = this.title || map?.portalItem?.title || 'Application';
        // APP DESCRIPTION //
        this.description = this.description || map?.portalItem?.description || group?.description || '...';

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {
    if (this.oauthappid || this.portal?.user) {

      this.signIn = document.getElementById('sign-in');
      this.signIn && (this.signIn.portal = this.portal);

    }
  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/LayerList',
          'esri/widgets/Legend'
        ], (Home, Search, LayerList, Legend) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            qualityProfile: "high"
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // LEGEND //
          /*
           const legend = new Legend({ view: view });
           view.ui.add(legend, {position: 'bottom-left', index: 0});
           */

          // SEARCH /
          /*
           const search = new Search({ view: view});
           view.ui.add(legend, {position: 'top-right', index: 0});
           */

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layer-list-container',
            view: view,
            listItemCreatedFunction: (event) => {
              event.item.open = (event.item.layer.type === 'group');
            },
            visibleElements: {statusIndicators: true}
          });

          // VIEW UPDATING //
          this.disableViewUpdating = false;
          const viewUpdating = document.getElementById('view-updating');
          view.ui.add(viewUpdating, 'bottom-right');
          this._watchUtils.init(view, 'updating', updating => {
            (!this.disableViewUpdating) && viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        /* ... */
        this.displayFeatureList(view);

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   */
  displayFeatureList(view) {
    if (view) {
      require(['esri/core/promiseUtils'], (promiseUtils) => {

        // POPUP DOCKING OPTIONS //
        view.set({
          popup: {
            dockEnabled: true,
            dockOptions: {
              buttonEnabled: false,
              breakpoint: false,
              position: "top-right"
            }
          }
        });

        const dateFormatter = new Intl.DateTimeFormat('default', {day: 'numeric', month: 'short', year: 'numeric'})
        const acresFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 1, maximumFractionDigits: 1});

        const layerInfo = {
          title: 'Current Perimeters',
          filter: '(IncidentName is not null)',
          queryParams: {
            returnGeometry: true,
            outFields: ['OBJECTID', 'IncidentName', 'FeatureCategory', 'GISAcres', 'DateCurrent'],
            orderByFields: ['DateCurrent DESC']
          },
          itemInfos: {
            label: f => `${ f.attributes.IncidentName }`,
            description: f => `${ dateFormatter.format(new Date(f.attributes.DateCurrent)) } | Acres: ${ acresFormatter.format(f.attributes.GISAcres) }`
          }
        }

        // FEATURE LAYER //
        const featureLayer = view.map.allLayers.find(layer => layer.title === layerInfo.title);
        if (featureLayer) {
          featureLayer.load().then(() => {
            featureLayer.set({outFields: ["*"]});

            // LAYER TITLE //
            document.getElementById('features-title').innerHTML = featureLayer.title;

            // OBJECTID FIELD //
            const objectIdField = featureLayer.objectIdField;

            const featureSelected = (featureOID) => {
              view.popup.close();
              if (featureOID) {
                const feature = featuresByOID.get(featureOID);
                const zoomTarget = (feature.geometry.type === 'point') ? feature : feature.geometry.extent.clone().expand(1.5);
                view.goTo({target: zoomTarget});
              }
            };

            // VIEW CLICK //
            view.on('click', clickEvt => {
              view.hitTest(clickEvt, {include: [featureLayer]}).then(hitResponse => {
                if (hitResponse.results.length) {
                  const featureOID = hitResponse.results[0].graphic.attributes[objectIdField];
                  featureSelected(featureOID);
                } else {
                  featureSelected();
                }
              });
            });

            // ENABLE TOGGLE ACTION //
            document.querySelector('calcite-action[data-toggle="features-list"]').removeAttribute('hidden');

            // LIST OF FEATURES //
            const featuresList = document.getElementById('features-list');
            featuresList.addEventListener('calciteListChange', (evt) => {
              const featureOID = evt.detail.size ? Number(Array.from(evt.detail.keys())[0]) : null;
              featureSelected(featureOID);
            });

            // UPDATE LIST SELECTION //
            const updateListSelection = (featureOID) => {
              if (featureOID) {
                const featureItem = featuresList.querySelector(`calcite-pick-list-item[value="${ featureOID }"]`)
                featureItem && (featureItem.selected = true);
              } else {
                featuresList.getSelectedItems().then((selectedItems) => {
                  selectedItems.forEach(item => {
                    item.selected = false;
                  });
                });
              }
            };

            let featuresByOID = new Map();
            const updateFeaturesList = features => {
              featuresByOID = features.reduce((list, feature) => {
                return list.set(feature.attributes[objectIdField], feature);
              }, new Map());

              // GET CURRENT SELECTED ITEM //
              const selectedItem = featuresList.querySelector(`calcite-pick-list-item[selected]`);
              const selectedOID = selectedItem ? selectedItem.value : null;

              // CREATE AND ADD FEATURE ITEMS //
              featuresList.replaceChildren(...features.map(createFeatureItemNodes));
              updateFeatureActions();

              selectedOID && updateListSelection(selectedOID);
            };

            const updateFeatureActions = () => {
              featuresList.querySelectorAll('calcite-action').forEach(actionNode => {
                actionNode.addEventListener('click', () => {
                  const feature = featuresByOID.get(Number(actionNode.parentNode.value));
                  view.popup.open({features: [feature]});
                });
              });
            }

            // CLEAR LIST SELECTION //
            const clearListSelectionAction = document.getElementById('clear-list-selection-action');
            clearListSelectionAction.addEventListener('click', () => {
              updateListSelection();
            });

            // FEATURE ITEM TEMPLATE //
            const featureItemTemplate = document.getElementById('feature-item-template');
            // CREATE ITEM NODE //
            const createFeatureItemNodes = (feature) => {
              const templateNode = featureItemTemplate.content.cloneNode(true);
              const itemNode = templateNode.querySelector('calcite-pick-list-item');
              itemNode.setAttribute('label', layerInfo.itemInfos.label(feature));
              itemNode.setAttribute('description', layerInfo.itemInfos.description(feature));
              itemNode.setAttribute('value', feature.attributes[objectIdField]);
              return itemNode;
            };

            // GET FEATURES BASED ON FILTER //
            const getFeatures = (filter) => {
              return promiseUtils.create((resolve, reject) => {
                const featuresQuery = featureLayer.createQuery();
                featuresQuery.set({where: filter || '1=1', ...layerInfo.queryParams});
                featureLayer.queryFeatures(featuresQuery).then(featuresFS => {
                  resolve(featuresFS.features);
                }).catch(reject);
              });
            };

            // GET ALL FEATURES //
            getFeatures(layerInfo.filter).then((features) => {
              updateFeaturesList(features);
              featuresList.loading = false;
            });

          });
        } else {
          this.displayAlert({
            title: `Can't Find Layer`,
            message: `The layer '${ layerInfo.title }' can't be found in this map.`
          });
        }
      });

    }
  }

}

export default new Application();
