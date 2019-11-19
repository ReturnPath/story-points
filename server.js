const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const app = express();
const WebSocketServer = require("ws").Server;
/*
  serve static UI content
 */
app.use(express.static(__dirname + '/dist/story-points'));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname + '/dist/story-points/index.html'));
});

/*
  web socket server
 */
const http = require('http');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors);

const server = http.createServer(app);
const wss = new WebSocketServer({server: server, path: "/socket"});

let _ws;
const state = {
  sessions: {},
};

handleNewClients = (ws) => {
  _ws = ws;
  const message = formatMessage('state-of-the-state', state);

  notifyCaller(message);

  ws.on('message', handleIncomingMessages);
};

handleIncomingMessages = (message) => {
  const messageData = JSON.parse(message);
  const eventType = messageData.eventType;

  switch (eventType) {
    case 'state-of-the-state':
      notifyCaller(formatMessage(eventType, state));
      break;
    case 'session-created':
      createNewSession(messageData);
      break;
    case 'session-state':
      getSessionState(messageData);
      break;
    case 'participant-joined':
      addParticipantToSession(messageData);
      break;
    case 'participant-removed':
      removeParticipantFromSession(messageData);
      break;
    case 'point-submitted':
      pointWasSubmitted(messageData);
      break;
    case 'points-reset':
      resetPoints(messageData);
      break;
    case 'points-revealed':
      revealPoints(messageData);
      break;
    case 'terminate-session':
      terminateSession(messageData);
      break;

  }
};

// protect terminated sessions from being able to take actions

terminateSession = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;

  delete state.sessions[requestedSession];

  const message = formatMessage('state-of-the-state', state);
  notifyClients(message);
};

revealPoints = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  notifyClients(formatMessage(eventType, sessionData, requestedSession))
};

resetPoints = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];

  Object.values(sessionData).forEach(participant => {
    Object.values(participant).forEach(p => {
      if (p) {
        p['hasVoted'] = false;
        p.point = 0;
      }
    });
  });

  notifyClients(formatMessage(eventType, sessionData, requestedSession))

};

getSessionState = (messageData) => {
  const eventType = messageData.eventType;
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  notifyCaller(formatMessage(eventType, sessionData, requestedSession));
};

pointWasSubmitted = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const targetUser = payload.userName;

  const userData = sessionData.participants[targetUser];
  userData.point = payload.value;
  userData.hasVoted = true;
  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
};

addParticipantToSession = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const participantToAdd = payload.userName;
  const isAdmin = payload.isAdmin;

  sessionData.participants[participantToAdd] = {point: 0, isAdmin: isAdmin};

  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
};

removeParticipantFromSession = (messageData) => {
  const payload = messageData.payload;
  const requestedSession = payload.sessionName;
  const sessionData = state.sessions[requestedSession];
  const participantToRemove = payload.userName;

  sessionData.participants[participantToRemove] = undefined;

  notifyClients(formatMessage(messageData.eventType, sessionData, requestedSession))
};

createNewSession = (messageData) => {
  const payload = messageData.payload;
  const sessionName = payload && payload.sessionName ? payload.sessionName : undefined;
  if (!sessionName) {
    return;
  }
  state.sessions[sessionName] = {participants: {}};
  const stateMessage = formatMessage('session-created', state);

  notifyClients(stateMessage)
};

formatMessage = (eventType, payload, targetSession) => ({
  eventType: eventType,
  payload: payload,
  targetSession: targetSession,
});

notifyClients = (message) => {
  wss.clients
    .forEach(client => {
      client.send(JSON.stringify(message));
    });
};

notifyCaller = (message) => {
  wss.clients
    .forEach(client => {
      if (client === _ws) {
        client.send(JSON.stringify(message));
      }
    });
};

wss.on('connection', handleNewClients);

server.listen(process.env.PORT || 8081, () => {
  console.log(`Server (${server.address().address}) running on port ${server.address().port}`);
});
