# MangoJuice Router

> Canonical Router implementation for MangoJuice

In trems of MJS, this packages is a Block with `Logic` and `createModel`. It just converts any change of browser's History to change of Router's Model. You should work with Router's model (using built-in helper functions) to identify which route is active, which route user left and so on, to show appropreate view in your App.

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
import { MainRoutes } from './routes';

export const createModel = () => ({
  router: Router.createModel()
});

export const Logic = {
  name: "SharedBlock",

  children() {
    return
      router: this.nest(Router.createLogic(MainRoutes)).singleton()
    };
  }
};
```

**`import { MainRoutes } from './routes';`** it imports a root route. It is required to create Router logic.

**`router: this.nest(Router.createLogic(MainRoutes)).singleton(routes)`** nests the Router logic to the Shared logic and bind it to the `router` field of the shared model. Also it makes the Router Logic to be singleton in the scope of your app. Which means that you won't need to bind Router commands explicitly to the `shared.router` model to execute it.

Now let's see how you can define the routes.

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

Here we are defining the routes tree structure. `MainRoutes` defines root routes of the app. Also it defines that `News` have some sub-routes in the `NewsRoutes` object.

`route` function accepts three arguments. First argument is a pattern in format acceptable by [url-pattern](https://github.com/snd/url-pattern) (mangojuice-router uses it internally). The second arugment is the children routes object or null. And the third argument is the options object `{ default: false }`. You can provide `{ default: true }` if you want to have non-`/` pattern to be your home page (user will be automatically redirected)

`route` returns a command creator. A command created by `route` redirecting a user to the specific route. For exmple `NewsRoutes.Category({ category: 'world-news' })` will retirect a user to the `/news/world-news`.

Let's talk how to use it in the next section.

### Routes usage
Assume you have an app block where you are nesting Landing Block nad News Block. Also you have the routes definition like above. Then:

```js
// MainBlock.js
import React from 'mangojuice-react';
import Router from 'mangojuice-router';
import * as News from './News';
import * as Landing from './Landing';
import { MainRoutes, NewsRoutes } from './routes';

const createWorldNewsLink = (shared) => {
  return Router.link(
    shared.router,
    NewsRoutes.Category({ category: 'world-news' })
  );
};

export const createModel = () => ({
  news: News.createModel(),
  landing: Landing.createModel()
});
export const Logic = {
  name: 'MainBlock',

  config() {
    return {
      news: this.nest(News.Logic),
      landing: this.nest(Landing.Logic)
    };
  }
};
export const View = ({ model, shared }) => (
  <div>
    <h2>Awesome Site</h2>
    <nav>
      <a onClick={MainRoutes.Home}>Home</a><br />
      <a {...createWorldNewsLink(shared)}>
        World news
      </a>
    </nav>
    {Router.isActive(shared.router, MainRoutes.Home) &&
      <Landing.View model={model.landing} />}
    {Router.isActive(shared.router, MainRoutes.News) &&
      <Landing.View model={model.news} />}
    {Router.isNotFound(shared.router) &&
      <div>404</div>}
  </div>
);
```

By default each App block updates when Shared Model get updated. So, when user change the URL from `/` to `/news`, the Router will catch this event, update `router` model and the App  will be re-rendered.

**`Router.isActive(shared.router, MainRoutes.Home)`** check that current route is `MainRoutes.Home` and if so we are rendering Landing's View.

**`Router.isActive(shared.router, MainRoutes.News)`** check that current route is `MainRoutes.News`. But as you remember our news route have children routes. It means that when you open `/news` then router will set as `acrive` more than one route, in this case `MainRoutes.News` and `NewsRoutes.All`. For `/news/3123` will be active `MainRoutes.News` and `NewsRoutes.Category` routes.

In case when `NewsRoutes.Category` is active, you can access parameter from the pattern in router's model by `shared.router.params.category`. Because of all parameters of all routes stored in one object, parameter names should be unique across all routes.

**`<a onClick={MainRoutes.Home}>Home</a>`** renders a link to `/`. One of the most beautiful thing in `mangojuice-router` is that each route is a command. So, when user click to the `Home` link, `MainRoutes.Home` command will be executed, which will change the route according defined pattern.

**`Router.link`** is a helper function which returns an object `{ onClick, href }` where `onClick` equals to a command you passed as a second argument, and `href` equals to an URL that will be set when a user click to the link. You can use this helper to create Search Crawler friendly links.

**`NewsRoutes.Category({ category: 'world-news' })`** creates a command for redirecting user to `/news/worl-news` page. Each route command accepts three arguments: (1) object with url parameters (from pattern), (2) object with query parameters and (3) options object `{ keep: false, replace: false }`. `keep` to not remove all existing query parameters (but extend it) and `replace` to replace current History State instead of pushing the new one.

**`Router.isNotFound`** returns true when current URL not match any of registered routes.

### Extend the Router
Sometimes you might need to have a full control over the routing. For example to redirect a user to login page when some route is protected and user not logged in. Or to redirect some old urls to new ones.

With `mangojuice-router` and MJS architecture you can do it pretty easily. By creating your own `Router`. Let's say you want to limit the user with available categories of News and redirect him to "world-news" when the category is out of defined set:

```js
// ExtendedRouter.js
import { Cmd } from 'mangojuice-core';
import Router from 'mangojuice-router';
import { NewsRoutes } from './routes';

const AvailableCategories = new Set([
  'worl-news', 'it', 'politics'
]);

const Logic = {
  ...Router.Logic,

  @Cmd.batch
  UpdateRouter({ model }, newModel) {
    if (
      Rotuer.isActive(newModel, NewsRoutes.Category) &&
      !AvailableCategories.has(newModel.params.category)
    ) {
      return NewsRoutes.Category({ category: 'world-news' });
    }

    return Router.Logic.UpdateRouter(...args);
  }
};

export default { ...Router, Logic };
```

Then you will just need to `import Router from './ExtendedRouter';` instead of `import Router from 'mangojuice-router';` in your Shared block.

Here we are using a very nice MJS feature – extendibilty of Blocks. We are creating the new logic based on the original `Router`'s logic and overriding the `UpdateRouter` command. In the new command we are checking current active route and category and deciding should we actually update the route or redirect to another route instead.

Note that with this implementation we are catching router's model update before it is actually updated, so App Views won't blink or anything with wrong category route. The App will be re-rendered only when original `Router.Logic.UpdateRouter` will be executed.

## Conclusion
That's basicaly it. `mangojuice-router` is really simple but yet powerfull implementation of SPA routing. If you have any questions or doubts fill free to ask in slack.

## API Reference
TODO
