# MangoJuice Router

> Canonical Router implementation for MangoJuice

In trems of MJS, this packages is a Block with `Logic` and `createModel`. It just converts any change of browser's History to change of Router Model. You should work with Router's model (using built-in helper functions) to identify which route is active, which route user left and so on, to show appropreate view in your App.

## Installation
```bash
npm install mangojuice-router
```

## Quick start
### Nest Router.Logic to Shared Block
As said above, this module is a Block. So you just need to nest it to your shared block like this:

```js
// Shared.js
import Router from 'mangojuice-router';
import * as routes from './routes';

export const createModel = () => ({
  router: Router.createModel()
});

export const Logic = {
  name: "SharedBlock",

  config({ nest }) {
    return {
      children: {
        router: nest(Router.Logic).singleton(routes)
      }
    };
  }
};
```

**`import * as routes from './routes';`** it imports all our routes definition. Routes is just an object with sub-objects where each field of sub-object is a route. You will see the example of routes definition below.

**`router: nest(Router.Logic).singleton(routes)`** nests the Router logic to Shared logic and bind it to `router` field of shared model. Also it makes the Router Logic to be singleton in the scope of your app. Which means that you won't need to bind Router commands explicitly to the `shared.router` model to execute it.

Now let's see how routes definition looks like

### Define routes
```js
// routes.js
import { route } from 'mangojuice-router';

export const NewsRoutes = {
  All: route('/'),
  Category: route('/:category')
};

export const MainRoutes = {
  Home: route('/'),
  News: route('/news', NewsRoutes)
};
```

Here we are defining the routes tree structure. `MainRoutes` is a root routes, where we are defining that `News` have some sub-routes in `NewsRoutes` object.

First argument in `route` is a pattern in format acceptable by [url-pattern](https://github.com/snd/url-pattern) (mangojuice-router uses it internally). The second arugment is a children routes object.

`route` returns a command creator. So, you are able to use your routes definition like `NewsRoutes.Category('worl-news')`. Let's talk how to use it in next section

### Routes usage
```
```
