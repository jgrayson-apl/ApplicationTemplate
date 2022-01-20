/*
 Copyright 2021 Esri

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
 * SignIn
 *  - Sign In
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  10/12/2021 - 0.0.1 -
 * Modified:
 *
 */

class SignIn extends HTMLElement {

  static version = '0.0.1';

  /**
   * @type {Portal}
   */
  _portal;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = `
      <style>
       .signIn-container .signIn-username {
          margin-bottom: 4px; 
          --calcite-ui-text-1: var(--calcite-ui-brand);               
       }         
       .signIn-container .signIn-portal-name {
         margin-bottom: 4px;   
         --calcite-font-size--1: 11pt;            
       }         
       .signIn-container .signIn-avatar{
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);
       }       
       .signIn-container .signIn-portal-url{
        --calcite-ui-text-link: var(--calcite-ui-brand);
       }      
      </style>
      
      <calcite-dropdown class="signIn-container" width="auto" type="click">                
        <calcite-button class="signIn-status-btn" slot="dropdown-trigger" appearance="transparent" color="neutral" scale="m" icon-start="user" width="auto">        
          not signed in
        </calcite-button>        
        <calcite-dropdown-group selection-mode="none">
          <calcite-dropdown-item class="signIn-info">
            <div style="display:flex;flex-direction:row;align-items:center;">        
              <calcite-avatar class="signIn-avatar" scale="l" username="" thumbnail=""></calcite-avatar>
              <div style="display:flex;flex-direction:column;padding-left:10px;">
                <calcite-label class="signIn-username"></calcite-label>
                <calcite-label class="signIn-portal-name"></calcite-label>
                <calcite-link class="signIn-portal-url" target="_blank"></calcite-link>
              </div>
            </div>
          </calcite-dropdown-item>
        </calcite-dropdown-group>
        <calcite-dropdown-item class="signIn-sign-in" icon-start="sign-in">Sign In</calcite-dropdown-item>
        <calcite-dropdown-item class="signIn-sign-out" icon-start="sign-out" hidden>Sign Out</calcite-dropdown-item>
      </calcite-dropdown>
    `;

    // BIND METHODS //
    this.updateUserUI = this.updateUserUI.bind(this);
    this.userSignIn = this.userSignIn.bind(this);
    this.userSignOut = this.userSignOut.bind(this);

  }

  /**
   *
   */
  connectedCallback() {

    // UI ELEMENTS //
    this.userStatusBtn = this.shadowRoot.querySelector('.signIn-status-btn');
    this.avatar = this.shadowRoot.querySelector('.signIn-avatar');
    this.portalInfoItem = this.shadowRoot.querySelector('.signIn-info');
    this.portalInfoUsername = this.shadowRoot.querySelector('.signIn-username');
    this.portalInfoName = this.shadowRoot.querySelector('.signIn-portal-name');
    this.portalInfoUrl = this.shadowRoot.querySelector('.signIn-portal-url');
    this.userSignInItem = this.shadowRoot.querySelector('.signIn-sign-in');
    this.userSignOutItem = this.shadowRoot.querySelector('.signIn-sign-out');

    // OPEN PORTAL URL //
    this.portalInfoItem.addEventListener('click', () => {
      this.portalInfoUrl.href && window.open(this.portalInfoUrl.href);
    });

  }

  /**
   *
   * @param {Portal} value
   */
  set portal(value) {

    // PORTAL //
    this._portal = value;
    if (this._portal) {
      require(['esri/identity/IdentityManager', 'esri/core/watchUtils'], (esriId, watchUtils) => {

        this.userSignInItem && this.userSignInItem.addEventListener('click', this.userSignIn);
        this.userSignOutItem && this.userSignOutItem.addEventListener('click', this.userSignOut);

        watchUtils.init(this._portal, 'user', (user) => {
          this.updateUserUI().then(() => {
            this.dispatchEvent(new CustomEvent('user-change', {detail: {user: user}}));
          }).catch(this.displayError);
        });

        // CREDENTIAL CREATED AND WE DON'T HAVE USER //
        esriId.on('credential-create', ({credential}) => {
          credential && (!this._portal.user) && this.userSignIn();
        });

      });

    } else {
      // this.userSignInItem && this.userSignInItem.removeEventListener('click', this.userSignIn);
      // this.userSignOutItem && this.userSignOutItem.removeEventListener('click', this.userSignOut);
    }
  }

  /**
   *
   * @returns {Promise<>}
   */
  updateUserUI() {
    return new Promise((resolve, reject) => {
      if (this._portal) {
        const hasUser = (this._portal.user != null)

        this.portalInfoItem && (this.portalInfoItem.hidden = !hasUser);
        this.userSignInItem && (this.userSignInItem.hidden = hasUser);
        this.userSignOutItem && (this.userSignOutItem.hidden = !hasUser);

        if (hasUser) {

          const firstName = this._portal.user.fullName.split(' ')[0]
          this.userStatusBtn.innerHTML = `${ firstName } (${ this._portal.name })`;
          this.userStatusBtn.title = this._portal.user.fullName;
          this.avatar.thumbnail = this._portal.user.thumbnailUrl;
          this.avatar.username = this._portal.user.username;

          this.portalInfoUsername.innerHTML = this._portal.user.username;
          this.portalInfoName.innerHTML = this._portal.name;

          const organizationUrl = `https://${ this._portal.urlKey }.${ this._portal.customBaseUrl }/`;
          this.portalInfoUrl.innerHTML = organizationUrl;
          this.portalInfoUrl.href = organizationUrl;

        } else {
          this.userStatusBtn.innerHTML = 'not signed in';
          this.userStatusBtn.title = '';
          this.avatar.thumbnail = null;
          this.portalInfoUsername.innerHTML = '';
          this.portalInfoName.innerHTML = '';
          this.portalInfoUrl.innerHTML = '';
          this.portalInfoUrl.href = '';
        }

        resolve();
      } else {
        this.userStatusBtn && (this.userStatusBtn.disabled = true);
        reject(new Error(`Can't sign in to '${ this._portal.name }' [${ this._portal.url }]`));
      }
    });
  }

  /**
   *
   * @returns {Promise<>}
   */
  userSignIn() {
    return new Promise((resolve, reject) => {
      require(['esri/portal/Portal'], (Portal) => {
        this._portal = new Portal({authMode: 'immediate'});
        this._portal.load().then(() => {
          this.updateUserUI().then(resolve);
        }).catch(reject).then();
      });
    });
  };

  /**
   *
   * @returns {Promise<>}
   */
  userSignOut() {
    return new Promise((resolve, reject) => {
      require(['esri/identity/IdentityManager'], (IdentityManager) => {
        IdentityManager.destroyCredentials();
        this._portal && (this._portal.user = null);
        this.updateUserUI().then(resolve);
      });
    });
  };

}

customElements.define('apl-sign-in', SignIn);

export default SignIn;
