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
 * GlobeSpinner
 *  - Element: apl-globe-spinner
 *  - Description: Spin the globe
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  8/30/2022 - 0.0.1 -
 * Modified: 4/12/2024 - 0.0.2 -
 *
 */

class GlobeSpinner extends HTMLElement {

  static version = '0.0.2';

  /**
   * @enum {number}
   */
  static DIRECTION = {
    NONE: 0, RIGHT: 1, LEFT: 2
  };

  /**
   * @enum {number}
   */
  static TARGET = {
    CENTER: 1, SURFACE: 2
  };

  /**
   * @enum {number}
   */
  static SPEED = {
    SLOWER: 0.01, NORMAL: 0.05, FASTER: 0.25
  };

  /**
   * @type {number}
   */
  static SPIN_FPS = 90;

  /**
   * @enum {string}
   */
  static SCALE_OPTION = {
    SMALL: 's', MEDIUM: 'm', LARGE: 'l'
  };

  /**
   * @type {SceneView}
   */
  #view;

  /**
   * @type {GlobeSpinner.SPEED}
   */
  #spinSpeed;

  /**
   * @type {number}
   */
  #headingOffset;

  /**
   * @type {GlobeSpinner.DIRECTION}
   */
  #spinDirection;

  /**
   * @type {GlobeSpinner.TARGET}
   */
  #spinTarget;

  /**
   * @type {number|null}
   */
  #animationHandle;

  /**
   * @type {boolean}
   */
  #configurable;

  /**
   * @type {boolean}
   */
  #disabled;

  /**
   *
   * @param {boolean} value
   */
  set disabled(value) {
    this.#disabled = value;
    this.#disabled && this.setSpinState(GlobeSpinner.DIRECTION.NONE);
    this.actionPad.toggleAttribute('disabled', value);
  }

  /**
   * @type {string}
   */
  get state() {
    return (this.#spinDirection === GlobeSpinner.DIRECTION.NONE) ? 'idle' : 'spinning';
  }

  /**
   *
   * @param {SceneView} view
   * @param {GlobeSpinner.DIRECTION} [direction]
   * @param {GlobeSpinner.TARGET} [target]
   * @param {GlobeSpinner.SCALE_OPTION} [scale]
   * @param {GlobeSpinner.SPEED} [speed]
   * @param {boolean} [configurable]
   * @param {boolean} [disabled]
   */
  constructor({view, scale = GlobeSpinner.SCALE_OPTION.MEDIUM, target = GlobeSpinner.TARGET.CENTER, direction = GlobeSpinner.DIRECTION.NONE, speed = GlobeSpinner.SPEED.NORMAL, configurable = true, disabled = false}) {
    super();

    this.#view = view;
    this.#headingOffset = this.#spinSpeed = speed;
    this.#spinDirection = direction;
    this.#spinTarget = target;
    this.#configurable = configurable;
    this.#disabled = disabled;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>        
        :host {          
          color: var(--calcite-color-brand);
          background-color: var(--calcite-color-foreground-2);
          border: solid 0.5pt var(--calcite-color-border-2);                    
        }
        :host calcite-action-pad[disabled] {
          pointer-events: none;
          opacity: 0.4;
        }
        :host calcite-action {
          cursor: pointer;
        }        
        :host calcite-action.globe-spinner-direction-action[active] {         
          --calcite-ui-icon-color: var(--calcite-color-text-1);
        }  
      </style>
      <calcite-action-pad expand-disabled layout="horizontal">
        <calcite-action class="globe-spinner-direction-action globe-spinner-direction-left" icon="chevrons-left" scale="${ scale }" title="spin left"></calcite-action>        
        <calcite-action class="globe-spinner-direction-action globe-spinner-direction-right" icon="chevrons-right" scale="${ scale }" title="spin right"></calcite-action>            
        <calcite-dropdown title="spin options">
          <calcite-action slot="trigger" icon="gear" scale="s"></calcite-action>
          <calcite-dropdown-group selection-mode="single" group-title="Target">
            <calcite-dropdown-item data-type="TARGET" data-target="CENTER" icon-start="globe" active>center</calcite-dropdown-item>
            <calcite-dropdown-item data-type="TARGET" data-target="SURFACE" icon-start="360-view">surface</calcite-dropdown-item>
          </calcite-dropdown-group>
          <calcite-dropdown-group selection-mode="single" group-title="Speed">
            <calcite-dropdown-item data-type="SPEED" data-speed="SLOWER">slower</calcite-dropdown-item>
            <calcite-dropdown-item data-type="SPEED" data-speed="NORMAL" active>normal</calcite-dropdown-item>
            <calcite-dropdown-item data-type="SPEED" data-speed="FASTER">faster</calcite-dropdown-item>
          </calcite-dropdown-group>            
        </calcite-dropdown>        
      </calcite-action-pad>      
    `;

  }

  /**
   *
   */
  connectedCallback() {

    // ACTION PAD //
    this.actionPad = this.shadowRoot.querySelector('calcite-action-pad');
    this.actionPad.toggleAttribute('disabled', this.#disabled);

    // LEFT //
    this.leftAction = this.shadowRoot.querySelector('calcite-action.globe-spinner-direction-left');
    this.leftAction.addEventListener('click', () => {
      const isActive = this.leftAction.toggleAttribute('active');
      this.setSpinState(isActive ? GlobeSpinner.DIRECTION.LEFT : GlobeSpinner.DIRECTION.NONE);
    });

    // RIGHT //
    this.rightAction = this.shadowRoot.querySelector('calcite-action.globe-spinner-direction-right');
    this.rightAction.addEventListener('click', () => {
      const isActive = this.rightAction.toggleAttribute('active');
      this.setSpinState(isActive ? GlobeSpinner.DIRECTION.RIGHT : GlobeSpinner.DIRECTION.NONE);
    });

    // INITIAL UI SETTINGS //
    this.shadowRoot.querySelector('calcite-dropdown-item[data-target="CENTER"]').toggleAttribute('selected', (this.#spinTarget === GlobeSpinner.TARGET.CENTER));
    this.shadowRoot.querySelector('calcite-dropdown-item[data-target="SURFACE"]').toggleAttribute('selected', (this.#spinTarget === GlobeSpinner.TARGET.SURFACE));
    this.shadowRoot.querySelector('calcite-dropdown-item[data-speed="SLOWER"]').toggleAttribute('selected', (this.#spinSpeed === GlobeSpinner.SPEED.SLOWER));
    this.shadowRoot.querySelector('calcite-dropdown-item[data-speed="NORMAL"]').toggleAttribute('selected', (this.#spinSpeed === GlobeSpinner.SPEED.NORMAL));
    this.shadowRoot.querySelector('calcite-dropdown-item[data-speed="FASTER"]').toggleAttribute('selected', (this.#spinSpeed === GlobeSpinner.SPEED.FASTER));

    // OPTIONS DROPDOWN - TARGET AND SPEED //
    const optionsDropdown = this.shadowRoot.querySelector('calcite-dropdown');

    // TOGGLE OPTIONS DROPDOWN //
    optionsDropdown.toggleAttribute('hidden', !this.#configurable);

    // CONFIGURE TARGET AND SPEED OPTIONS //
    optionsDropdown.addEventListener('calciteDropdownSelect', () => {
      optionsDropdown.selectedItems.forEach(selectedItem => {
        switch (selectedItem.dataset.type) {
          case 'TARGET':
            this.#spinTarget = GlobeSpinner.TARGET[selectedItem.dataset.target];
            break;
          case 'SPEED':
            this.#spinSpeed = GlobeSpinner.SPEED[selectedItem.dataset.speed];
            this.#headingOffset = (this.#spinDirection === GlobeSpinner.DIRECTION.RIGHT) ? -this.#spinSpeed : this.#spinSpeed;
            break;
        }
      });
      this._setSpinDirection(this.#spinDirection);
    });

    // BIND SPIN EVENTS //
    this._spin = this._spin.bind(this);
    this._cancelSpin = this._cancelSpin.bind(this);

    // INITIAL SPIN //
    this.setSpinState(this.#spinDirection);

  }

  /**
   *
   */
  #previousState;

  pause() {
    this.#previousState = this.#spinDirection;
    this.setSpinState(GlobeSpinner.DIRECTION.NONE);
  }

  /**
   *
   */
  resume() {
    this.#previousState && this.setSpinState(this.#previousState);
    this.#previousState = null;
  }

  /**
   *
   * @param {GlobeSpinner.DIRECTION} direction
   */
  setSpinState(direction) {

    this.#spinDirection = direction || GlobeSpinner.DIRECTION.NONE;

    switch (this.#spinDirection) {
      case GlobeSpinner.DIRECTION.RIGHT:
        this.rightAction.toggleAttribute('active', true);
        this.leftAction.toggleAttribute('active', false);
        this.#headingOffset = -this.#spinSpeed;
        break;
      case GlobeSpinner.DIRECTION.LEFT:
        this.leftAction.toggleAttribute('active', true);
        this.rightAction.toggleAttribute('active', false);
        this.#headingOffset = this.#spinSpeed;
        break;
      case GlobeSpinner.DIRECTION.NONE:
        this.leftAction.toggleAttribute('active', false);
        this.rightAction.toggleAttribute('active', false);
        break;
    }

    this._setSpinDirection(this.#spinDirection);
  }

  /**
   *
   * @param {GlobeSpinner.DIRECTION} direction
   * @private
   */
  _setSpinDirection(direction) {
    switch (direction) {
      case GlobeSpinner.DIRECTION.RIGHT:
      case GlobeSpinner.DIRECTION.LEFT:
        this._enableSpin();
        break;
      case GlobeSpinner.DIRECTION.NONE:
        this._cancelSpin();
        break;
    }
  }

  /**
   *
   * @private
   */
  _cancelSpin() {
    this.#animationHandle && (cancelAnimationFrame(this.#animationHandle) && (this.#animationHandle = null));
  }

  /**
   *
   * @private
   */
  _enableSpin() {
    //this._cancelSpin();
    requestAnimationFrame(this._spin);
  }

  /**
   *
   * @private
   */
  _spin() {
    if (this.#spinDirection !== GlobeSpinner.DIRECTION.NONE) {

      let targetParams = {};
      switch (this.#spinTarget) {
        case GlobeSpinner.TARGET.CENTER:
          targetParams = {
            center: [(this.#view.center.longitude + this.#headingOffset), this.#view.center.latitude]
          };
          break;
        case GlobeSpinner.TARGET.SURFACE:
          targetParams = {
            heading: (this.#view.camera.heading + this.#headingOffset), target: this.#view.viewpoint.targetGeometry
          };
          break;
      }

      this.#view.goTo(targetParams, {animate: false}).then(() => {
        // setTimeout(() => {
        this.#animationHandle = requestAnimationFrame(this._spin);
        // }, (1000 / GlobeSpinner.SPIN_FPS));
      });
    }
  }

}

customElements.define("apl-globe-spinner", GlobeSpinner);

export default GlobeSpinner;
