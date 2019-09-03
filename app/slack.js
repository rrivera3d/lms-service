const rp = require('request-promise-native');
const config = require('../config');

/**
 * Slack Service
 * @class SlackService
 */
class SlackService {

  /**
   * Reference: '<!rrivera>: Sample text with link to <https://www.google.com/>.
   */
  static message(msg) {
    return msg ? msg : {
      text: 'Testing slack service complete!'
    };
  }

  static options(req) {

    req = req ? req : null;
    let msg = req || req.body || null;

    return {
      method: 'POST',
      uri: config['SLACK_INCOMING_WEBHOOK'],
      body: this.message(msg),
      json: true,
      headers: {
        'content-type': 'application/json'
      }
    };
  }

  static postMessage(req) {
    const options = this.options(req);
    const onSuccess = (res) => {
      console.log('Posted a message to the channel!');
    };
    const onError = (err) => {
      console.error('Uh oh, something broke...', err);
    };
    rp(options)
      .then(onSuccess)
      .catch(onError);
  }
}

module.exports = SlackService;