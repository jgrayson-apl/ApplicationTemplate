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

class MapLoader {

  // CONFIG//
  config;

  /**
   *
   * @param {{}} config
   */
  constructor(config) {
    this.config = config;
  }

  /**
   *
   * @returns {Promise<unknown>}
   */
  loadMap() {
    return new Promise(async (resolve, reject) => {

      const itemID = (this.config.webmap || this.config.webscene);
      if (itemID) {

        if (this.config.webmap) {
          const WebMap = await $arcgis.import("esri/WebMap");
          const map = new WebMap({portalItem: {id: itemID}});
          map.load().then(resolve).catch(reject);
        }

        if (this.config.webscene) {
          const WebScene = await $arcgis.import("esri/WebScene");
          const map = new WebScene({portalItem: {id: itemID}});
          map.load().then(resolve).catch(reject);
        }
      } else {
        reject(new Error('No configured WebMap or WebScene id.'));
      }

    });
  }

}

MapLoader.hasMap = (config) => {
  return (config.webmap?.length || config.webscene?.length);
};

export default MapLoader;
