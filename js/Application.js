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
import ViewLoading from './apl/ViewLoading.js';
import MapScale from './apl/MapScale.js';

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

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // STARTUP DIALOG //
        this.initializeStartupDialog();

        // VIEW SHAREABLE URL PARAMETERS //
        this.initializeViewShareable({view});

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {

          // HIDE APP LOADER //
          document.getElementById('app-loader').toggleAttribute('hidden', true);
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
  configView({view}) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Popup',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/Compass',
          'esri/widgets/Legend',
          'esri/widgets/LayerList'
        ], (reactiveUtils, Popup, Home, Search, Compass, Legend, LayerList) => {

          // VIEW AND POPUP //
          view.set({
            constraints: {snapToZoom: false},
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            })
          });

          // SEARCH //
          const search = new Search({view: view});
          view.ui.add(search, {position: 'top-left', index: 0});

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 1});

          // COMPASS //
          const compass = new Compass({view: view});
          view.ui.add(compass, {position: 'top-left', index: 2});
          reactiveUtils.watch(() => view.rotation, rotation => {
            compass.set({visible: (rotation > 0)});
          }, {initial: true});

          // MAP SCALE //
          const mapScale = new MapScale({view});
          view.ui.add(mapScale, {position: 'bottom-left', index: 0});

          // VIEW LOADING INDICATOR //
          const viewLoading = new ViewLoading({view: view});
          view.ui.add(viewLoading, 'bottom-left');

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layers-container',
            view: view,
            visibleElements: {
              errors: true,
              statusIndicators: true
            }
          });

          // LEGEND //
          const legend = new Legend({
            container: 'legend-container',
            view: view  //basemapLegendVisible: true
          });
          //view.ui.add(legend, {position: 'bottom-left', index: 0});

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
      this.configView({view}).then(() => {

        this.displayFeatureList({view});

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   */
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

          /**
           * GER FEATURE INFO CALLBACK
           *
           * @param {Graphic} feature
           * @returns {{description: string, label: string, value: string}}
           */

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
  }

}

export default new Application();
