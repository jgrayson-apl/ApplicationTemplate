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
  constructor({container, portal}) {
    super();

    this.container = container;
    this.portal = portal;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {
          height: 100%;
          display: inline-flex;
          align-items: center;
        }    
      </style>      
      <calcite-dropdown width="auto" type="click" placement="bottom-end">      
        <div slot="trigger">
          <calcite-button class="status-btn" appearance="outline-fill" kind="neutral" icon-start="sign-in">Sign In</calcite-button>
          <calcite-navigation-user class="user-nav" hidden></calcite-navigation-user>
        </div>                
        <calcite-dropdown-group selection-mode="none">          
          <calcite-dropdown-item class="info">
            <calcite-navigation-user class="portal-nav"></calcite-navigation-user>                      
          </calcite-dropdown-item>          
        </calcite-dropdown-group>        
        <calcite-dropdown-item class="sign-out" icon-start="sign-out" hidden>Sign Out</calcite-dropdown-item>
      </calcite-dropdown>
    `;

    this.container?.append(this);

  }

  /**
   *
   */
  connectedCallback() {

    this.userNav = this.shadowRoot.querySelector('.user-nav');
    this.portalNav = this.shadowRoot.querySelector('.portal-nav');
    this.userStatusBtn = this.shadowRoot.querySelector('.status-btn');
    this.portalInfoItem = this.shadowRoot.querySelector('.info');
    this.userSignOutItem = this.shadowRoot.querySelector('.sign-out');

    // OPEN PORTAL URL //
    this.portalInfoItem.addEventListener('click', () => {
      const portalUrl = this.portalNav.getAttribute('username');
      portalUrl && window.open(portalUrl);
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

        this.userStatusBtn && this.userStatusBtn.addEventListener('click', this.userSignIn);
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
        this.userSignOutItem && (this.userSignOutItem.hidden = !hasUser);

        if (hasUser) {

          this.userStatusBtn.toggleAttribute('hidden', true);

          this.userNav.setAttribute('user-id', this.portal.user.username);
          this.userNav.setAttribute('username', this.portal.user.username);
          this.userNav.setAttribute('full-name', this.portal.user.fullName);
          this.userNav.setAttribute('thumbnail', this.portal.user.thumbnailUrl);
          this.userNav.toggleAttribute('hidden', false);

          const organizationUrl = this.portal.urlKey ? `https://${ this.portal.urlKey }.${ this.portal.customBaseUrl }/` : this.portal.url;
          const orgThumbUrl = `${ organizationUrl }/sharing/rest/portals/self/resources/${ this.portal.thumbnail }`;

          this.portalNav.setAttribute('user-id', this.portal.id);
          this.portalNav.setAttribute('username', organizationUrl);
          this.portalNav.setAttribute('full-name', this.portal.name);
          this.portalNav.setAttribute('thumbnail', orgThumbUrl);

        } else {

          this.userNav.setAttribute('full-name', '');
          this.userNav.setAttribute('username', '');
          this.userNav.setAttribute('user-id', '');
          this.userNav.setAttribute('thumbnail', '');
          this.userNav.toggleAttribute('hidden', true);

          this.userStatusBtn.toggleAttribute('hidden', false);
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
