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
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {Portal}
   */
  portal;

  /**
   *
   * @param {HTMLElement} container
   * @param {Portal} portal
   */
  constructor({container , portal}) {
    super();

    this.container = container;
    this.portal = portal;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host .signIn-info-content {
          display:flex;
          flex-direction:row;
          align-items:center;
        }              
        :host .signIn-info-user {
          display:flex;
          flex-direction:column;
          padding-left:10px;
        }
        :host .signIn-username {
          margin-bottom: 4px; 
          --calcite-ui-text-1: var(--calcite-ui-brand);               
        }
        :host .signIn-portal-name {
          margin-bottom: 4px;   
          --calcite-font-size--1: 11pt;            
        }
        :host .signIn-avatar {
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }      
        :host .signIn-portal-url {
          --calcite-ui-text-link: var(--calcite-ui-brand);
        }      
      </style>      
      <calcite-dropdown width="auto" type="click" placement="bottom-end">                
        <calcite-action slot="trigger" class="signIn-status-btn" text-enabled text="not signed in" appearance="transparent" icon="user"></calcite-action>        
        <calcite-dropdown-group selection-mode="none">          
          <calcite-dropdown-item class="signIn-info">
            <div class="signIn-info-content">        
              <calcite-avatar class="signIn-avatar" scale="l" username="" thumbnail=""></calcite-avatar>
              <div class="signIn-info-user">
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

    this.container?.append(this);

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

    // BIND METHODS //
    this.updateUserUI = this.updateUserUI.bind(this);
    this.userSignIn = this.userSignIn.bind(this);
    this.userSignOut = this.userSignOut.bind(this);

    this.initialize();

  }

  /**
   *
   */
  initialize() {
    if (this.portal) {
      require(['esri/identity/IdentityManager', 'esri/core/reactiveUtils'], (esriId, reactiveUtils) => {

        this.userSignInItem && this.userSignInItem.addEventListener('click', this.userSignIn);
        this.userSignOutItem && this.userSignOutItem.addEventListener('click', this.userSignOut);

        reactiveUtils.watch(() => this.portal.user, (user) => {
          this.updateUserUI().then(() => {
            this.dispatchEvent(new CustomEvent('user-change', {detail: {user: user}}));
          }).catch(this.displayError);
        }, {initial: true});

        // CREDENTIAL CREATED //
        esriId.on('credential-create', ({credential}) => {
          credential ? this.userSignIn() : this.userSignOut();
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
      if (this.portal) {
        const hasUser = (this.portal.user != null);

        this.portalInfoItem && (this.portalInfoItem.hidden = !hasUser);
        this.userSignInItem && (this.userSignInItem.hidden = hasUser);
        this.userSignOutItem && (this.userSignOutItem.hidden = !hasUser);

        if (hasUser) {

          const firstName = this.portal.user.fullName.split(' ')[0];
          //this.userStatusBtn.innerHTML = `${ firstName } (${ this.portal.name })`;
          this.userStatusBtn.setAttribute('text', `${ firstName } (${ this.portal.name })`);
          this.userStatusBtn.title = this.portal.user.fullName;
          this.avatar.thumbnail = this.portal.user.thumbnailUrl;
          this.avatar.username = this.portal.user.username;

          this.portalInfoUsername.innerHTML = this.portal.user.username;
          this.portalInfoName.innerHTML = this.portal.name;

          const organizationUrl = `https://${ this.portal.urlKey }.${ this.portal.customBaseUrl }/`;
          this.portalInfoUrl.innerHTML = organizationUrl;
          this.portalInfoUrl.href = organizationUrl;

        } else {
          //this.userStatusBtn.innerHTML = 'not signed in';
          this.userStatusBtn.setAttribute('text','not signed in');
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
        reject(new Error(`Can't sign in to '${ this.portal.name }' [${ this.portal.url }]`));
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
        this.portal = new Portal({authMode: 'immediate'});
        this.portal.load().then(() => {
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
        this.portal && (this.portal.user = null);
        this.updateUserUI().then(resolve);
      });
    });
  };

}

customElements.define('apl-sign-in', SignIn);

export default SignIn;
