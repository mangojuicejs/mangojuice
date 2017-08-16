import { Run, Cmd, Utils } from "mangojuice-core";
import { Mounter as ClientMounter } from "mangojuice-react";
import { Mounter as ServerMounter } from "mangojuice-react/server";
import * as App from "./app/AppPage";
import * as Shared from "./shared/Main";
import { SimpleStackLogger } from "mangojuice-core";

// REGULAR RENDERING FROM SCRATCH
// let { restart } = Run.mount({
//   logger: SimpleStackLogger,
//   mounter: new ReactMounter("#content"),
//   app: App,
//   shared: Shared
// });

// if (module.hot) {
//   module.hot.accept(["./app/AppPage", "./shared/Main"], function() {
//     restart = restart({
//       app: require("./app/AppPage"),
//       shared: require("./shared/Main")
//     }).restart;
//   });
// }

// SERVER RENDERING
const rehydrateApp = (appModel, sharedModel) => {
  let { restart } = Run.rehydrate(appModel, sharedModel, {
    logger: SimpleStackLogger,
    mounter: new ClientMounter('#content'),
    app: App,
    shared: Shared
  });

  if(module.hot) {
    module.hot.accept(['./app/AppPage', './shared/Main'], function() {
      restart = restart({
        app: require('./app/AppPage'),
        shared: require('./shared/Main')
      }).restart;
    });
  }
};

const serverRendering = (callback) => {
  const request = { location: window.location };
  Run.render({
    logger: SimpleStackLogger,
    mounter: new ServerMounter(),
    app: App,
    shared: { ...Shared, configArgs: [ request ] }
  }).then(({ html, app, shared }) => {
    document.getElementById('content').innerHTML = html;
    console.log('Rendered HTML.')
    console.log('Waiting a bit and re-rendering it (hydrate)')
    setTimeout(() => callback(app.model, shared.model), 1000);
  });
}

serverRendering(rehydrateApp);
