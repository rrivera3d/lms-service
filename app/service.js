const express = require("express");
const _ = require("lodash");
const moment = require("moment");
const WebSocket = require("ws");

const SlackService = require("./slack");
const data = require("./data");

const now = () => {
  return moment().toISOString();
};

let app = express();

app.get('/api/dashboard/aggregation', (req, res, next) => {
  console.log('Received GET /api/dashboard/aggregation');

  res.status(200);
  res.send({
    applications: data.applications.length
  });

});

app.get('/api/applications', function(req, res, next) {
  console.log('Received GET /api/applications');

  let subsetApplications = data.applications.map(function(application) {
    return (({ createdAt,
               firstName,
               id,
               lastName,
               loanAmount,
               referralAgent,
               region,
               status,
               updatedAt }) => ({
      createdAt,
      firstName,
      id,
      lastName,
      loanAmount,
      referralAgent,
      region,
      status,
      updatedAt,
      fullName: [firstName, lastName].join(' ') }))(application);
  });

  res.status(200);
  res.send({results: subsetApplications});
});

const clientsById = _.keyBy(data.clients, 'id');
app.get('/api/applications/:id', function(req, res, next) {

  let params = req.params;
  console.log('Received GET /api/applications/' + params.id);

  let application = _.find(data.applications, {id: params.id});
  application.fullName = [application.firstName, application.lastName].join(' ');
  application.clients = application.clientIds.map(clientId => clientsById[clientId]);

  console.log("application data:", application);
  res.status(200);
  res.send(application);
});

app.post('/api/applications/:id/approve', (req, res, next) => {

  const currentDateTime = now();

  let params = req.params;
  console.log('Received POST /api/applications/' + params.id + '/approve');

  let application = _.find(data.applications, {id: params.id});
  application.fullName = [application.firstName, application.lastName].join(' ');

  const doNotChangeStatus = ["Automated declined", "Declined", "Approved"];
  if (doNotChangeStatus.indexOf(application.status) > -1) {

    res.status(400);
    res.send({
      message: `The current application is already in ${application.status.toLowerCase()} status.`
    });

  } else {

    application.status = "Approved";
    application.updatedAt = currentDateTime;

    console.log("application data:", application);

    let fullName = [application.firstName, application.lastName].join(" ");
    let prettyDate = moment(currentDateTime).format("MMM DD, YYYY hh:mm a");
    let message = `Application for ${fullName} was approved on ${prettyDate}!`;

    // Send slack message
    SlackService.postMessage({
      "text": message,
      "attachments": [
        {
          "text": "<!here> View the application <http://localhost:3000/applications/" + params.id + "|here>.",
          "color": "#36a64f",
          "fields": [
            {
              "title": "Priority",
              "value": "High",
              "short": false
            }
          ]
        }
      ]
    });

    // Send WebSocket Event
    let msg = JSON.stringify({
      events: [
        {
          type: "ADD_NOTIFICATION",
          payload: {
            id: application.id,
            action: 'APPLICATION_APPROVED',
            created: now(),
            message: message
          }
        }
      ]
    });

    if (app.wss) {
      // Broadcast to everyone else.
      app.wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });

      console.log('Broadcast WebSocket message', msg);

    } else {
      console.log('There are no open WebSocket connections.');
    }

    res.status(200);
    res.send(application);
  }
});

module.exports = app;