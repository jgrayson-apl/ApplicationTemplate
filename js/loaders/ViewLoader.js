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

class ViewLoader {

  // VIEW PROPERTIES //
  _viewProperties;

  constructor(viewProperties) {
    this._viewProperties = viewProperties;
  }

  loadView() {
    return new Promise(async (resolve, reject) => {

      const {map} = this._viewProperties;

      if (map.declaredClass === 'esri.WebMap') {
        const MapView = await $arcgis.import("esri/views/MapView");
        const mapView = new MapView(this._viewProperties);
        mapView.when(resolve, reject);
      }

      if (map.declaredClass === 'esri.WebScene') {
        const SceneView = await $arcgis.import("esri/views/SceneView");
        const sceneView = new SceneView(this._viewProperties);
        sceneView.when(resolve, reject);
      }

    });
  }

}

export default ViewLoader;
