'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const Connection = require('./connection');
const Options = require('./options');
const DenonRegex = require('./denon_regex');

/**
 * The Denon AVR RPC class.
 *
 * @class Denon
 * @extends EventEmitter
 */
class Denon extends Connection {
  /**
   * Initializes the telnet connection and sets up events.
   *
   * @constructor
   * @param  {string} host [The Denon AVR address]
   */
  constructor(host) {
    super(host);

    this.regExTable = {
      'masterVolume': {
        regEx: /(?:(MV))(?:(\d{2,3}))\r/,
        /**
         * @event masterVolumeChanged
         * @param {object} volume The current volume
         */
        emit: 'masterVolumeChanged'
      },
      'masterVolumeMax': {
        regEx: /(?:(MVMAX ))(?:(\d{2,3}))\r/,
        /**
         * @event masterVolumeMaxChanged
         * @param {object} maxVolume The maximal volume
         */
        emit: 'masterVolumeMaxChanged'
      },
      'mute': {
        regEx: DenonRegex.constructStatusChangedRegex(Options.MuteOptions),
        /**
         * @event muteChanged
         * @param {MuteOptions} mute The current mute status
         */
        emit: 'muteChanged'
      },
      'input': {
        regEx: DenonRegex.constructStatusChangedRegex(Options.InputOptions),
        /**
         * @event inputChanged
         * @param {InputOptions} input The current input status
         */
        emit: 'inputChanged'
      },
      'power': {
        regEx: DenonRegex.constructStatusChangedRegex(Options.PowerOptions),
        /**
         * @event powerChanged
         * @param {PowerOptions} power The current power status
         */
        emit: 'powerChanged'
      },
      'surround': {
        regEx: DenonRegex.constructStatusChangedRegex(Options.SurroundOptions),
        /**
         * @event surroundChanged
         * @param {SurroundOptions} surround The current surround status
         */
        emit: 'surroundChanged'
      },
    }

    this.on('data', (data) => {
      this._onData(data);
    });
  }

  getEvent(key)
  {
    if (typeof this.regExTable[key] !== 'undefined') {
      return this.regExTable[key].emit;
    } else {
      return undefined;
    }
  }

  /**
   * Does the RegEx magic.
   *
   * @method _applyRegex
   * @private
   * @param  {[string]} data  [The incoming data]
   * @return {[string|undefined]}       [Response or undefined]
   */
  _applyRegex(data) {
    //const expression = new RegExp(regEx);
    const keys = _(this.regExTable).keys();
    const matches = [];

    _(keys).each((key) => {
      const handler = this.regExTable[key];
      const match = data.match(handler.regEx);

      if (match != null) {
        const matchResult = handler;
        matchResult.value = match[2];

        matches.push(matchResult);
      }
    });

    return matches;
  }

  /**
   * Receives the incoming data. Does some RegEx magic.
   * Calls the defined events and resolves promises.
   *
   * @method _onData
   * @private
   * @param  {[string]} data [The incoming data]
   */
  _onData(data) {
    if (typeof data === 'string') {
      const response = data.replace('\r', '');
      const results = this._applyRegex(data);

      results.forEach((result) => {
        this.emit(result.emit, result.value);
      })
    }
  }

  /**
   * Sends a command to the Denon AVR
   *
   * @method sendCommand
   * @param  {string} command   [The command]
   * @param  {string} parameter [The parameter]
   * @return {Promise} [A response, or no response.]
   */
  sendCommand(command, parameter, hook) {
    return new Promise((resolve) => {
      this.once(hook, (result) => {
        resolve(result);
      });

      return this
        .write(`${command}${parameter}`);
    })
  }

  /**
   * Sets the volume of the Denon AVR.
   * Use {VolumeOptions} or a number from 0-98.
   *
   * @method setVolume
   * @param {VolumeOptions} volumeOptions [The volume option]
   * @return {Promise} [A response, or no response.]
   */
  setVolume(volumeOptions) {

    return this.sendCommand('MV', volumeOptions,
      this.getEvent('masterVolume'));
  }

  /**
   * Returns the current Denon AVR volume.
   *
   * @method getVolume
   * @return {Promise} [A response, or no response.]
   */
  getVolume() {

    return this.sendCommand('MV', Options.VolumeOptions.Status,
      this.getEvent('masterVolume'));
  }

  /**
   * Returns the current Denon AVR volume.
   *
   * @method getVolume
   * @return {Promise} [A response, or no response.]
   */
  getMaxVolume() {

    return this.sendCommand('MV', Options.VolumeOptions.Status,
      this.getEvent('masterVolumeMax'));
  }

  /**
   * Sets the power mode of the Denon AVR. (On / Standby).
   * Use {PowerOptions}.
   *
   * @method setPower
   * @param {PowerOptions} powerOptions [The power option]
   * @return {Promise} [A response, or no response.]
   */
  setPower(powerOptions) {

    return this.sendCommand('PW', powerOptions,
      this.getEvent('power'));
  }

  /**
   * Returns the current power status of the Denon AVR.
   *
   * @method getPower
   * @return {Promise} [A response, or no response.]
   */
  getPower() {

    return this.sendCommand('PW', Options.PowerOptions.Status,
      this.getEvent('power'));
  }

  /**
   * Sets the mute status of the Denon AVR. (On / Off).
   * Use {MuteOptions}.
   *
   * @method setMute
   * @param {MuteOptions} muteOptions [The mute option]
   * @return {Promise} [A response, or no response.]
   */
  setMute(muteOptions) {

    return this.sendCommand('MU', muteOptions,
      this.getEvent('mute'));
  }

  /**
   * Returns the current mute status of the Denon AVR.
   *
   * @method getMute
   * @return {Promise} [A response, or no response.]
   */
  getMute() {

    return this.sendCommand('MU', Options.MuteOptions.Status,
      this.getEvent('mute'));
  }

  /**
   * Sets the active input of the Denon AVR. (TV, DVD, ...).
   * Use {InputOptions}.
   *
   * @method setInput
   * @param {InputOptions} inputOptions [The input option]
   * @return {Promise} [A response, or no response.]
   */
  setInput(inputOptions) {

    return this.sendCommand('SI', inputOptions,
      this.getEvent('input'));
  }

  /**
   * Returns the current active input source (TV, DVD, ...) of the Denon AVR.
   *
   * @method getInput
   * @return {Promise} [A response, or no response.]
   */
  getInput() {

    return this.sendCommand('SI', Options.InputOptions.Status,
      this.getEvent('input'));
  }

  /**
   * Sets the surround mode of the Denon AVR. (Dolby, Stereo, ...).
   * Use {SurroundOptions}.
   *
   * @method setSurround
   * @param {SurroundOptions} surroundOptions [The surround option]
   * @return {Promise} [A response, or no response.]
   */
  setSurround(surroundOptions) {

    return this.sendCommand('MS', surroundOptions,
      this.getEvent('surround'));
  }

  /**
   * Returns the current surround mode of the Denon AVR.
   *
   * @method getSurround
   * @return {Promise} [A response, or no response.]
   */
  getSurround() {

    return this.sendCommand('MS', Options.SurroundOptions.Status,
      this.getEvent('surround'));
  }
}

module.exports = Denon;