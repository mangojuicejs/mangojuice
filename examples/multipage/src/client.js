import { Run, Cmd, Utils } from "mangojuice-core";
import ReactMounter from "mangojuice-react";
import ReactServerMounter from "mangojuice-react/server";
import * as App from "./app/AppPage";
import * as Shared from "./shared/Main";
import { SimpleStackLogger } from "mangojuice-core";

// REGULAR RENDERING FROM SCRATCH
let { restart } = Run.mount({
  logger: SimpleStackLogger,
  mounter: new ReactMounter("#content"),
  app: App,
  shared: Shared
});

if (module.hot) {
  module.hot.accept(["./app/AppPage", "./shared/Main"], function() {
    restart = restart({
      app: require("./app/AppPage"),
      shared: require("./shared/Main")
    }).restart;
  });
}

// SERVER RENDERING
// const rehydrateApp = (appModel, sharedModel) => {
//   let { restart } = Run.rehydrate(appModel, sharedModel, {
//     logger: simpleLogger(),
//     mounter: new ReactMounter('#content'),
//     app: App,
//     shared: Shared
//   });
//
//   if(module.hot) {
//     module.hot.accept(['./app/AppPage', './shared/Main'], function() {
//       restart = restart({
//         app: require('./app/AppPage'),
//         shared: require('./shared/Main')
//       }).restart;
//     });
//   }
// };
//
// const serverRendering = (callback) => {
//   const request = { location: window.location };
//   Run.render({
//     logger: simpleLogger(),
//     mounter: new ReactServerMounter(),
//     app: App,
//     shared: { ...Shared, configArgs: [ request ] }
//   }).then(({ html, app, shared }) => {
//     document.getElementById('content').innerHTML = html;
//     callback(app.model, shared.model);
//   });
// }
//
// serverRendering(rehydrateApp);
