# MangoJuice

> Missed MC part for your favorite V library.

* **Highly scalable** because of strongly decoupled M, V and C and good definition of logical Block of your application
* **Forces you to write good decomposed code**, which is easy to scale, test and debug.
* **Fully-featured core**, no need to add any middleware or anything to write complete app
* **View library agnostic**
* **Support for server-rendering**
* **Lightweight** (zero dependencies, around **6kb minified gzipped**)
* **Easy to learn and fun to use**

## Philosophy
Front-end development is not something new. MVC pattern invented long time ago and it defined application as the following:

> There is a `Model` that should be displayed to a user with a `View`. User via `View` and other external sources (server, browser, etc) could produce events. Events should be handled by `Controller`, which could change `Model`. Every change of the `Model` should be mapped to a `View`.

And that's it. Every framework you could find will work around this basic definition. The question is: how exactly? Most frameworks trying to do everything: their own view templates engine, their own logic and model management tools, their own http clients, etc; and all of this hardly dependent.

Mangojuice going another way: it only provides a set of tools to implement the most harder part of your application – logical part – in very strict manner. It is not showing your model (your favorite View library should do that), it is not giving you own http client (your favorite lib should do that). But it provides a good way to define logic of your app, do async calls, handle results, and finally change the model.

## Installation
```bash
npm install mangojuice-core  # general set of tools
npm install mangojuice-react # for using react for view rendering
```

## Quick start (block, cmd, task, run)
Mangojuice (MJS) consists of three main parts:
* **Model** – plain `function createModel() { return { ... }; }`, which defines initial model state of your logical block.
* **Logic** - plain object `const Logic = { ... };` with a set of commands inside.
* **View** – plain `function View({ model }) { ... }`, which should display something based on current state of a model. If your favorite V library is React, then View is a plain-function component.

All this three parts together called `Block`. For example, let's say you have a page with very complicated search form and results list. In this case you will probably have three logical blocks: (1) Search form, (2) Results list and (3) Block that manage search and results (parent block of 1 and 2).

#### Search Form example
```js
// SearchForm.js
import { Cmd } from 'mangojuice-core';

export function createModel() {
  return { query: '' };
}
export const Logic = {
  name: 'SearchForm',

  @Cmd.update
  SetQuery(ctx, e) {
    return { query: e.target.value };
  },

  @Cmd.nope
  Search() {
  }
};
export function View({ model, exec }) {
  <div>
    <label>Complicated Search Form</label>
    <input value={model.query} onChange={exec(Logic.SetQuery)} />
    <button onClick={exec(Logic.Search)}>Search</button>
  </div>
}
```
Module `SearchForm.js` is a `Block`. It exports `createModel`, `View` and `Logic`. Only this kind of modules could be called `Block` in MJS.

**`function createModel()`** is a function (factory) that returns initial state of the block.

**`name: 'SearchForm'`** defines a name of the logical block. Each logic object should have a name for easier debugging and namespacing commands.

**`@Cmd.update`** defines that decorated function is a function for updating a model. MJS implements so called `command pattern`, and `Cmd` decorators help to convert plain function to a command creator with defined behavour.

For instance, if you will call `Logic.SetQuery(1,2,3)` it will return you a plain object (command), which contains original function, array of arguments `[1,2,3]` and some other internally used information, that defines that this is a command for updating a model.

If you are familiar with Redux, then you can think about it as about action creator tied with function that will actually handle the action.

**`@Cmd.nope`** just do nothing. We will see why this is useful a bit later. And there is some more command types in MJS core and we will meet them a bit later too.

**`function View({ model, exec })`** is just a pure-function React component, which renders the form. MJS passing a props object with model and `exec` function. `exec` needed to create actual event handler, which you can pass to some prop like `onChange`. By calling this function the command will be created and executed.

#### Runing the block
```js
// index.js
import { Run } from 'mangojuice-core';
import ReactMounter from 'mangojuice-react';
import * as SearchForm from './SearchForm.js';

Run.mount({
  app: SearchForm,
  mounter: new ReactMounter('#container')
});
```

**`Run.mount`** setup a block you are passing in `app` field (object with `View`, `createModel` and `Logic`) and mount it to the DOM using specific View mounter instance. Mounter depends on what view library you are using.

#### Search Results example
```js
// SearchForm.js
import { Cmd, Task } from 'mangojuice-core';

export function createModel() {
  return {
    results: [],
    query: '',
    loading: false,
    error: ''
  };
}
export const Tasks = {
  async findResults({ model }) {
    const res = await this.call(fetch, 'www.google.com/search');
    return res.items;
  }
};
export const Logic = {
  name: 'SearchResults',

  @Cmd.batch
  Search(ctx, query) {
    return [
      this.InitSearch(query),
      this.DoSearch()
    ];
  },

  @Cmd.execLatest
  DoSearch() {
    return Task
      .create(Tasks.findResults)
      .success(this.SetResultsList)
      .fail(this.HandleSearchFail)
  },

  @Cmd.update
  InitSearch(ctx, query) {
    return { query, loading: true };
  },

  @Cmd.update
  SetResultsList(ctx, results) {
    return {
      results,
      loading: false
    };
  },

  @Cmd.update
  HandleSearchFail(ctx, err) {
    return {
      error: 'Something weird happened',
      loading: false
    };
  }
};
export function View({ model, exec }) {
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <div key={i}>{x}</div>)}
  </div>
}
```
**`@Cmd.batch`** is a command type aimed to execute other commands. Commands of this type should decide what should be done next and with what arguments. Returned value could be an array, a command or null/undefined.

**`@Cmd.execLatest`**. There is also `@Cmd.execEvery`. It is a command for executing async function. Command of this type should return a `Task` object, which defines what async function should be executed and what is success/fail handler commands. Success command will be executed with returned value from async function, and fail command will be executed with throwed error object. Success and fail commands is optional (will be executed a nope command instead of some not defined cmd). The task function gets the same arguments as command function which created a task.

**`this.call(fetch, 'www.google.com/search')`** in task. This thing inspired by `redux-saga` and needed to achive two goals: (1) it creates task cancellation point and (2) it makes easier to test a task (you can pass some testing `call` func in a context which will mock results of some executions). If some task marked as `execLatest` and it will be called before previos one returned some results (before success/fail cmd executed), then previous task will be canceled and new one started.

**`ctx`** as first argument of each command is just an object with `model` field. So you can use it to define next state of a model, or to take some information to decide what command should be executed next.

#### All together
```js
// Main.js
import { Cmd } from 'mangojuice-core';
import * as SearchForm from './SearchForm';
import * as SearchResults from './SearchResults';

export function createModel() {
  return {
    form: SearchForm.createModel(),
    results: SearchResults.createModel()
  };
}
export const Logic = {
  name: 'Main',

  config({ nest }) {
    return {
      children: {
        form: nest(this.HandleSearchForm(), SearchForm.Logic),
        results: nest(null, SearchResults.Logic),
      }
    }
  },

  @Cmd.batch
  HandleSearchForm({ model }, cmd) {
    if (cmd.is(SearchForm.Logic.Search)) {
      return SearchResults.Logic.Search(model.form.query).model(model.results);
    }
  }
};
export function View({ model, nest }) {
  <div>
    {nest(model.form, SearchForm.View)}
    {nest(model.results, SearchResilts.View)}
  </div>
}
```
This block contains form and results blocks and tie them together.

**`function createModel()`** is making initial block's model as usual, but it also creates models for children blocks using their own `createModel` functions.

**`config({ nest })`** helps to define what logic should be binded to what model. We are saying that this block have two child blocks.

**`form: nest(this.HandleSearchForm(), SearchForm.Logic),`** not only defines that `SearchForm.Logic` will be binded to `form` model field, but also set a handler command that will be executed before and after each command from `SearchForm` block (and all nested blocks if they will be).

**`if (cmd.is(SearchForm.Logic.Search))`** in handler catching `Search` command from `SearchForm` block before it is actually executed. The handler returns a command of child block `SearchResults` with query string from `form` field binded to a child model `results`. That model binding is required because by default all commands returned by `Cmd.batch` executed in context of current model (in this case with model of `Main` block). But we want to run the command on `results` model.

**`nest(model.form, SearchForm.View)`** is showing View of `SearchForm` for model `form`.

As you can see, to nest one block to another you have to nest all three parts of a block separately: model, logic, view. It is a bit overhead, but it makes nesting very flexible. For example you can use Logic of one block and compelely replace View of this block for something more suitable in some concrete situation. Or you can create a model for a child block in some specific way.


## Going deeper (shared, subscribe, port)
What if you will have to add a user to your app? Obviously user model should be easily accessable from anywhere of the app, for example to check is user authorized or not, or to check role of the user. For these cases, when you need to have widly used model, MJS provides shared block.

As you already know, application in MJS is a tree of blocks. A tree of main app called `app` (surprise), and a tree of shared block called `shared` (surprise again). The key diffeerence of shared tree is that blocks from shared tree do not have a View. But anyway it is better to show how it looks like.

```js
// Shared.js
import { Cmd } from 'mangojuice-core';
import * as User from './User';

export function createModel() {
  return {
    user: User.createModel(),
  };
}
export const Logic = {
  name: 'Shared',
  config({ nest }) {
    return {
      children: {
        user: nest(null, User.Logic),
      }
    }
  }
};

// User.js
import { Cmd } from 'mangojuice-core';

export function createModel() {
  return {
    name: '',
    authorized: false
  };
}
export const Logic = {
  name: 'User',

  config() {
    return { bindCommands: this };
  },

  @Cmd.update
  Login() {
    return {
      authorized: true,
      name: 'Test User'
    }
  }
};
```
You should already understand what is going on above, except one thing...

**`bindCommands: this`** binds all commands from User logic to lastly created model. It is useful for singletone blocks when only one instance of a block could be presented in the app. So it allows you to call `User.Logic.Login` command without explicitly binding it to user's model, like we did above for `SearchResults.Logic.Search` command.

#### Use shared block
```js
// index.js
...
import * as Shared from './Shared';

Run.mount({
  app: Search,
  shared: Shared,
  mounter: ...
})
```

**`shared: Shared`** saying to a runner that we have a shared block that should be initiated with app block and tied together.

```js
// Search.js
import * as User from './User';
...
export function View({ model, shared, nest, exec }) {
  <div>
    {shared.user.authorized && <div>Hello, {shared.user.name}</div>}
    {!shared.user.authorized && (
      <button onClick={exec(User.Logic.Login)}>Login</button>
    )}
    {nest(model.form, SearchForm.View)}
    {nest(model.results, SearchResilts.View)}
  </div>
}
```
**`function View({ model, shared, nest, exec }) `** now also have a `shared` field in props which is just a model of shared block.

#### App depends on Shared
It is important to notice that every view from app block tree depends on changes of model of shared tree. For example, when user logged in (`authorazed` changed to `true` by `Login` command) each View of the app (of each app block) will be rerendered. For instance `Main.Vew`, `SearchForm.View`, `SearchResults.View`, all of them will be rerendered.

That imposes an important restriction to shared blocks. They should be rarely changing to have a good performance. But there is also a way to disable shared dependency for a specific block:

```js
// SearchResults.js
...
export const Logic = {
  config({ subscribe, shared }) {
    return {
      manualSharedSubscribe: true,
      subscriptions: [ subscribe(this.HandleUserUpdate(), shared.user) ]
    }
  },

  @Cmd.batch
  HandleUserUpdate(ctx, cmd, userModel) {
  }
  ...
}
```

**`manualSharedSubscribe: true`** is disabeling View re-rendering of `SearchResults` block on each shared model change.

**`subscriptions: ...`** provides a way to subscribe only to some of shared model changes. Above we subscribed to changes of `shared.user` and added an update handler command `HandleUserUpdate`. This command will be executed on every `shared.user` model change.

In this example, created user subscription is almost ignoring our `manualSharedSubscribe: true`, because subscription also re-rendering the view. But if `shared` (root) model will be changed in some way (not `shared.user`), then the View won't be renredered, because we have `manualSharedSubscribe: true` and subscription only to `shared.user`.

#### Dealing with the world
Above we showed how to handle events from View. But complex applications could have to handle not only view events, but some more, like WebSocket messages, or pressing `esc` in window scope, or some interval. The good neews is that MJS also provide a way to handle this kind of events.

```js
// SearchResults.js
...
export const Logic = {
  ...
  port({ model, destroy, exec }) {
    const timer = setInterval(() => {
      exec(this.Search(model.query));
    }, 10000);
    destroy.then(() => clearInterval(timer));
  }
  ...
}
```
**`port({ model, destroy, exec })`** is a special function of logic object, that is aimed to subscribe to some global events and execute commands. In above example we just made an interval for refrashing search results every 10 secs. Also we subscribed to a destroy Promise, which will be resolved when block will be removed.

#### Conclusion
That is all about basics of MJS. It was inspired by many existing frameworks/languages that the author used for a while. So probably there is no something extremly new. MJS is all about defining scalable, flexible way of implementing logic of your app in MVC manner with help of Command Pattern, that is it.

## Documentation
TODO
