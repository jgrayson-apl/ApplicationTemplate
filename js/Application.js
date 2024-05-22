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

//const promiseUtils = await $arcgis.import("esri/core/promiseUtils");
const reactiveUtils = await $arcgis.import("esri/core/reactiveUtils");

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import ViewLoading from './apl/ViewLoading.js';
import MapScale from './apl/MapScale.js';

class Application extends AppBase {

  /**
   * @type {Portal}
   */
  portal;

  /**
   *
   */
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
          //console.info("Application ready...");
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
    return new Promise(async (resolve, reject) => {
      if (view) {

        // VIEW AND POPUP //
        const Popup = await $arcgis.import("esri/widgets/Popup");
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
        const Search = await $arcgis.import("esri/widgets/Search");
        const search = new Search({view: view});
        view.ui.add(search, {position: 'top-left', index: 0});

        // HOME //
        const Home = await $arcgis.import("esri/widgets/Home");
        const home = new Home({view});
        view.ui.add(home, {position: 'top-left', index: 1});

        // COMPASS //
        const Compass = await $arcgis.import("esri/widgets/Compass");
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
        view.ui.add(viewLoading, 'bottom-right');

        // LAYER LIST //
        const LayerList = await $arcgis.import("esri/widgets/LayerList");
        const layerList = new LayerList({
          container: 'layers-container',
          view: view,
          visibleElements: {
            errors: true,
            statusIndicators: true
          }
        });

        // LEGEND //
        const Legend = await $arcgis.import("esri/widgets/Legend");
        const legend = new Legend({
          container: 'legend-container',
          view: view
        });
        //view.ui.add(legend, {position: 'bottom-left', index: 0});

        resolve();

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
        //
        // ...APPLICATION CODE HERE...
        //
        resolve();
      }).catch(reject);
    });
  }

}

export default new Application();
