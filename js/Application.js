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

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import FeaturesList from './apl/FeaturesList.js';

class Application extends AppBase {

  // PORTAL //
  portal;

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

        // USER SIGN-IN //
        this.configUserSignIn();

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

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

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
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
          'esri/core/reactiveUtils',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/LayerList',
          'esri/widgets/Legend'
        ], (reactiveUtils, Home, Search, LayerList, Legend) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            }
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
          reactiveUtils.watch(() => view.updating, (updating) => {
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

      const dateFormatter = new Intl.DateTimeFormat('default', {day: 'numeric', month: 'short', year: 'numeric'});
      const acresFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 1, maximumFractionDigits: 1});

      // FEATURE LAYER //
      const layerTitle = 'Current Perimeters';
      const featureLayer = view.map.allLayers.find(layer => layer.title === layerTitle);
      if (featureLayer) {
        featureLayer.load().then(() => {
          featureLayer.set({outFields: ["*"]});

          // LAYER TITLE //
          document.getElementById('features-title').innerHTML = featureLayer.title;

          // ENABLE TOGGLE ACTION //
          document.querySelector('calcite-action[data-toggle="features-list"]').removeAttribute('hidden');

          /**
           * GER FEATURE INFO CALLBACK
           *
           * @param {Graphic} feature
           * @returns {{description: string, label: string, value: string}}
           */
          const getFeatureDetails = (feature) => {
            const value = String(feature.getObjectId());

            const label = `${ feature.attributes.IncidentName }`;
            const description = `${ dateFormatter.format(new Date(feature.attributes.DateCurrent)) } | Acres: ${ acresFormatter.format(feature.attributes.GISAcres) }`;

            return {label, description, value};
          };

          // FEATURES LIST CONTAINER
          const featureListContainer = document.getElementById('feature-list-container');

          // FEATURES LIST //
          const featuresList = new FeaturesList({container: featureListContainer, view});
          featuresList.initialize({
            view, featureLayer,
            queryParams: {
              where: '(IncidentName is not null)',
              outFields: ['OBJECTID', 'IncidentName', 'FeatureCategory', 'GISAcres', 'DateCurrent'],
              orderByFields: ['DateCurrent DESC']
            },
            getFeatureInfoCallback: getFeatureDetails
          });

          // CLEAR LIST SELECTION //
          const clearListSelectionAction = document.getElementById('clear-list-selection-action');
          clearListSelectionAction.addEventListener('click', () => {
            featuresList.clearSelection();
          });

        });
      } else {
        this.displayAlert({
          title: `Can't Find Layer`,
          message: `The layer '${ layerTitle }' can't be found in this map.`
        });
      }

    }
  }

}

export default new Application();
