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

import AdobeAnalyticsUtils from "./AdobeAnalyticsUtils.js";
import AppConfig from './AppConfig.js';

class AppBase extends AppConfig {

  // APP NAME //
  _name = 'ApplicationTemplate';
  set name(value) {
    this._name = value;
    this.dispatchEvent(new CustomEvent('name-change', {detail: {name: this._name}}));
  }

  get name() {
    return this._name;
  }

  // APP TITLE //
  _title = null;
  set title(value) {
    this._title = value;
    document.querySelectorAll('.application-title').forEach(node => { node.innerHTML = this._title; });
    this.dispatchEvent(new CustomEvent('title-change', {detail: {title: this._title}}));
  }

  get title() {
    return this._title;
  }

  // APP DESCRIPTION //
  _description = null;
  set description(value) {
    this._description = value;
    document.querySelectorAll('.application-description').forEach(node => { node.innerHTML = this._description; });
    this.dispatchEvent(new CustomEvent('description-change', {detail: {description: this._description}}));
  }

  get description() {
    return this._description;
  }

  /**
   *
   */
  constructor() {
    super();

    // ADOBE ANALYTICS //
    const analyticsUtils = new AdobeAnalyticsUtils({source: this});

    // APP NAME //
    const pathParts = location.pathname.split('/');
    this.name = String([pathParts[pathParts.length - 2]]);

    // ALERTS AND NOTICES //
    this.initializeAlertNotice();

    // TOGGLE ACTION & PANELS //
    this.initializeSidePanels();

    // STARTUP DIALOG //
    this.initializeStartupDialog();

    // APPLICATION SHARING //
    this.initializeSharing();

  }

  /**
   * LOAD APP CONFIG
   *
   * @param {string|null} configPath
   * @returns {Promise<unknown>}
   */
  async load(configPath = null) {
    return new Promise((resolve, reject) => {
      super.load(configPath).then(resolve).catch(reject);
    });
  }

  /**
   *
   */
  initializeAlertNotice() {

    const appNotice = document.getElementById('app-notice');
    const noticeTitleNode = appNotice.querySelector('[slot="title"]');
    const noticeMessageNode = appNotice.querySelector('[slot="message"]');

    /**
     *
     * @param {Error|{name:string, message:string}} error
     */
    this.displayError = (error) => {
      noticeTitleNode.innerHTML = error.name || 'Error';
      noticeMessageNode.innerHTML = error.message || JSON.stringify(error, null, 2) || 'Something went wrong...';
      appNotice.open = true;
      console.error(error);
    };

    this.clearError = () => {
      noticeTitleNode.innerHTML = 'Error';
      noticeMessageNode.innerHTML = 'Something went wrong...';
      appNotice.open = false;
    };

  }

  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
   */
  initializeSharing() {

    // SHARE APPLICATION ACTION //
    const appShareAction = document.getElementById('app-share-action');
    if (appShareAction) {

      // SHARE APPLICATION ALERT & LINK //
      const appShareAlert = document.getElementById('app-share-alert');
      const appShareLink = appShareAlert.querySelector('[slot="link"]');

      appShareAction.addEventListener('click', () => {

        // SHARE ALERT //
        const shareURL = this.toShareURL();
        appShareLink.setAttribute('href', shareURL);
        appShareAlert.setAttribute('open', 'true');

        // COPY TO CLIPBOARD //
        navigator.clipboard.writeText(shareURL).then(() => {
          navigator.clipboard.readText().then((clipText) => {
            console.info("SHARE URL COPIED TO CLIPBOARD: ", clipText);
          }, console.error);
        }, console.error);

      });
    }

  }

  /**
   *
   */
  initializeSidePanels() {

    // TOGGLE INFOS //
    const toggleInfos = new Map();

    // TOGGLE PANEL //
    this.togglePanel = (toggleId, active) => {
      // TOGGLE DETAILS BY TOGGLE ID //
      const {toggleActions, togglePanels, sidePanel} = toggleInfos.get(toggleId);
      // ACTIONS //
      toggleActions.forEach(actionNode => {
        actionNode.active = active && (actionNode.dataset.toggle === toggleId);
      });
      // PANELS //
      togglePanels.forEach(panel => {
        panel.hidden = (panel.dataset.toggle !== toggleId);
      });
      // SIDE PANEL //
      sidePanel.collapsed = !active;
    };

    // TOGGLE SIDE PANELS //
    const sidePanels = document.querySelectorAll('calcite-shell-panel');
    sidePanels.forEach(sidePanel => {
      // TOGGLE PANELS //
      const togglePanels = sidePanel.querySelectorAll('.toggle-panel');

      // TOGGLE ACTIONS //
      const toggleActions = sidePanel.querySelectorAll('.toggle-action');
      toggleActions.forEach(toggleAction => {
        // TOGGLE INFOS //
        toggleInfos.set(toggleAction.dataset.toggle, {toggleActions, togglePanels, sidePanel});
        // TOGGLE ACTION //
        toggleAction.addEventListener('click', () => {
          this.togglePanel(toggleAction.dataset.toggle, toggleAction.toggleAttribute('active'));
        });
      });

      // CLOSE ACTIONS //
      const closeActions = sidePanel.querySelectorAll('.toggle-close');
      closeActions.forEach(closeAction => {
        // TOGGLE CLOSE ACTION //
        closeAction.addEventListener('click', () => {
          const toggleAction = sidePanel.querySelector(`.toggle-action[data-toggle="${ closeAction.dataset.toggle }"]`);
          toggleAction.removeAttribute('active');
          this.togglePanel(closeAction.dataset.toggle, false);
        });
      });

    });

  }

  /**
   *
   * @param {Map|WebMap|WebScene} [map]
   * @param {PortalGroup} [group]
   */
  setApplicationDetails({map = null, group = null}) {

    // APP TITLE //
    this.title = this.title?.length ? this.title : (map?.portalItem?.title || 'Application');

    // APP DESCRIPTION //
    this.description = this.description?.length ? this.description : (map?.portalItem?.description || group?.description || '...');

  }

  /**
   *
   */
  initializeStartupDialog() {

    // APP DETAILS MODAL //
    const appDetailsModal = document.getElementById('app-details-modal');

    // SHOW STARTUP MODAL //
    const showStartupId = `show-startup-${ this.name || 'all' }`;
    const showStartup = localStorage.getItem(showStartupId) || 'show';
    if (showStartup === 'show') {
      appDetailsModal.open = true;
    }

    // HIDE STARTUP DIALOG //
    const hideStartupCheckbox = document.getElementById('hide-startup-checkbox');
    hideStartupCheckbox.checked = (showStartup === 'hide');
    hideStartupCheckbox.addEventListener('calciteCheckboxChange', () => {
      localStorage.setItem(showStartupId, hideStartupCheckbox.checked ? 'hide' : 'show');
    });

    // TOGGLE APP DETAILS DIALOG //
    const appDetailsAction = document.getElementById('app-details-action');
    appDetailsAction.addEventListener('click', () => {
      appDetailsModal.open = (!appDetailsModal.open);
    });

  }
  /**
   * https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
   * - create UUID / GUID
   *
   *  - four possible variations...
   *     - id
   *     - id.replace(/-/g,'')
   *     - `{${ id }}`
   *     = `{${ id.replace(/-/g,'') }}`
   *
   * @param {boolean} dashes
   * @param {boolean} brackets
   * @returns {string}
   * @private
   */
  _createGUID(dashes = false, brackets = false) {
    const url = URL.createObjectURL(new Blob());
    const [id] = url.toString().split('/').reverse();
    URL.revokeObjectURL(url);
    const uuid = dashes ? id : id.replace(/-/g, '');
    return brackets ? uuid : `{${ uuid }}`;
  };

  /**
   * Example: setShadowElementStyle(diseaseInput, ".list-container", "maxHeight", "200px");
   *
   * @param {HTMLElement} ref
   * @param {string} selector
   * @param {string} rule
   * @param {string} val
   */
  setShadowElementStyle(ref, selector, rule, val) {
    const shadowDiv = ref.shadowRoot.querySelector(`${ selector }`);
    if (shadowDiv && shadowDiv.style[rule] !== val) shadowDiv.style[rule] = val;
  }

}

export default AppBase;
