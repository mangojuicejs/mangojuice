# MangoJuice

> The missing `M.C` part for your favorite `V` library.

* **Highly scalable** because of strongly decoupled Model, View and Controller, and good definition of logical Block of your application
* **Forces you to write good decomposed code**, which is easy to scale, test and debug.
* **Fully-featured core**, no need to add any middlewares to do just regular things
* **View library-agnostic**
* **Support for server-rendering**(if your View library also supports it, of course)
* **Lightweight** (zero dependencies, around **6kb minified gzipped**)
* **Easy to learn and fun to use**

## Installation
```bash
npm install mangojuice-core  # general set of tools
npm install mangojuice-react # using React as view rendering
npm install babel-plugin-transform-decorators-legacy
```
MangoJuice relies on decorators, so you should add decorators transformer to your babel configuration.


## Quick start
MangoJuice (MJS) consists of three main parts:
* **Model** – plain function `const createModel = () => ({ ... })`, which defines the initial model state of your logical block.
* **Logic** - plain object `const Logic = { ... };` with a set of commands inside.
* **View** – plain function `const View = ({ model }) => { ... }`, which should display something based on the current state of a model. If your favorite View library is React, then View is a plain-function component.

All these three parts are together called a `Block`. For example, let's say you have a page with a very complicated search form and a results list. In this case you will probably have three logical blocks: (1) Search form, (2) Results list and (3) Block that manage search form and results (parent for 1 and 2).

#### Search Form example
```js
// SearchForm.js
import { Cmd } from 'mangojuice-core';

export const createModel = () => ({
  query: ''
});
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
export const View = ({ model }) => (
  <div>
    <h2>Complicated Search Form</h2>
    <input value={model.query} onChange={Logic.SetQuery} /><br />
    <button onClick={Logic.Search}>Search</button>
  </div>
);
```
Module `SearchForm.js` is a `Block`. It exports `createModel`, `View` and `Logic`. Only this kind of modules can be called `Block` in MJS.

**`const createModel = () =>`** is a function (factory) that returns the initial state of the block.

**`name: 'SearchForm'`** defines a name for the logical block. Each logic object should have a name for easier debugging and namespacing commands.

**`@Cmd.update`** defines that decorated function is a function for updating a model. MJS implements the so called `command pattern`, and `Cmd` decorators help to convert plain function to a command creator with defined behaviour.

For instance, if you call `Logic.SetQuery(1,2,3)` it will return you a plain object (command), which contains original function, array of arguments `[1,2,3]` and some other internally used information, that defines that this is a command for updating a model.

If you are familiar with Redux, then you can think about it as an action creator tied with function that will actually handle the action.

**`ctx`** as first argument of each command is just an object with `model` field. So you can use it to define next state of a model, or to take some information to decide what command should be executed next.

**`@Cmd.nope`** is a no-op. We will see why this is useful a bit later. And there is some more command types in MJS core and we will meet them a bit later too.

**`const View = ({ model }) =>`** is just a pure-functional React component, which renders the form. MJS passes a `props` object  with the model.

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

**`Run.mount`** sets up a block you are passing in `app` field (object with `View`, `createModel` and `Logic`) and mounts it to the DOM using the specific View mounter instance.

**`new ReactMounter('#container')`** contains a logic for mapping a model to DOM changes via a View function. Mounter actually defines how View functions should be writtern, what they should return, what arguments they should accept, etc. Actual mounters are not a part of the MJS core. In a core you can find just an interface for a mounter. In the example above we are using React for writing Views and hence we are using ReactMounter.

#### Search Results example
```js
// SearchForm.js
import { Cmd, Task } from 'mangojuice-core';

export const createModel = () => ({
  results: [],
  query: '',
  loading: false,
  error: ''
});
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
export const View = ({ model }) => (
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <div key={i}>{x}</div>)}
  </div>
)
```
**`@Cmd.batch`** is a command type aimed to execute other commands. Commands of this type should decide what should be done next and in waht order. Returned value can be an array, a command or null/undefined.

**`@Cmd.execLatest`**. There is also `@Cmd.execEvery`. It is a command for executing an async function. A command of this type should return a `Task` object, which defines what async function should be executed and what is success/fail handler commands. Success command will be executed with value returned by async function, and fail command will be executed with error object throwed by async function. Success and fail commands are optional (will be executed a no-op command instead of not defined command). The task function gets the same arguments as the command function which created the task.

**`this.call(fetch, 'www.google.com/search')`** in the task. This thing inspired by `redux-saga` and needed to achive two goals: (1) it creates a task cancellation point and (2) it makes easier to test a task (you can pass some testing `call` func in a context which will mock results of `call`s). If some task marked as `execLatest`, then only one async fucnction can be executing at one point in time.

#### All together
```js
// Main.js
import { Cmd } from 'mangojuice-core';
import * as SearchForm from './SearchForm';
import * as SearchResults from './SearchResults';

export const createModel = () => ({
  form: SearchForm.createModel(),
  results: SearchResults.createModel()
});
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
    if (cmd.is(SearchForm.Logic.Search.Before)) {
      return SearchResults.Logic.Search(model.form.query).model(model.results);
    }
  }
};
export const View = ({ model }) => (
  <div>
    <SearchForm.View model={model.form} />
    <SearchResilts.View model={model.results} />
  </div>
)
```
This block contains the form and the results block and ties them together.

**`const createModel = () =>`** is making initial block's model as usual, but it also creates models for children blocks using their own `createModel` functions.

**`config({ nest })`** helps to define what logic should be binded to what model. We are saying that this block have two child blocks.

**`form: nest(this.HandleSearchForm(), SearchForm.Logic),`** not only defines that `SearchForm.Logic` will be binded to `form` model field, but also set a handler command that will be executed before and after each command from `SearchForm` block (and all nested blocks if they will be).

**`if (cmd.is(SearchForm.Logic.Search.Before))`** in handler catching `Search` command from `SearchForm` block before it is actually executed. There is also `SearchForm.Logic.Search.After` to handle command after execution. The handler returns a command of child block `SearchResults` with query string from `form` field binded to a child model `results`. That model binding is required because by default all commands returned by `Cmd.batch` executed in context of current model (in this case with model of `Main` block). But we wanted to run the command on `results` model.

**`nest(model.form, SearchForm.View)`** is showing View of `SearchForm` for model `form`.

As you can see, to nest one block to another you have to nest all three parts of a block separately: model, logic, view. It is a bit overhead, but it makes nesting very flexible. For example you can use Logic of one block and compelely replace View of this block to something more suitable in some concrete situation. Or you can create a model for a child block in some specific way.


#### Multiple counter problem (solved easily)
What if each result item should have some specific logic, like a counter? In MJS that is not a problem:
```js
// ResultsItem.js
import { Cmd } from 'mangojuice-core';

export const createModel = (text) => ({
  counter: 0,
  text
});
export const Logic = {
  name: 'ResultsItem',

  @Cmd.update
  Increment({ model }, amount) {
    return { counter: model.counter + amount };
  }
};
export const View = ({ model }) => (
  <div>
    {model.text}<br />
    <button onClick={Logic.Increment(1)}>+</button>
    {model.counter}
    <button onClick={Logic.Increment(-1)}>-</button>
  </div>
)
```

**`Logic.Increment(1)`** demonstrates how to execute a command with some argument.

```js
// SearchResults.js
...
import * as ResultsItem from './ResultsItem';

export const Logic = {
  config({ nest }) {
    return {
      children: {
        results: nest(null, ResultsItem.Logic)
      }
    }
  }
  ...
  @Cmd.update
  SetResultsList(ctx, results) {
    return {
      results: results.map(x => ResultsItem.createModel(x)),
      loading: false
    };
  },
  ...
}
export const View = ({ model, nest }) => (
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <ResultsItem.View model={x} />)}
  </div>
)
```
**`results: nest(null, ResultsItem.Logic)`** just like in `all together`, we are nesting each part of a block separately. Here we are nesting logic. So, the rule is – you can bind child logic to an array of models, and the logic will be binded to each item of an array.

**`results: results.map(x => ResultsItem.createModel(x))`** in `SetResultsList` command just creates a `ResultsItem` model for each result item. That is a nesting of a model.

**`<ResultsItem.View model={x} />`** in View nesting a View of our `ResultsItem` block for each result item.

## Going deeper (shared, subscribe, port)
What if you will have to add a user to your app? Obviously user model should be easily accessable from anywhere of the app, for example to check is user authorized or not, or to check role of the user. For these cases, when you need to have widely used model, MJS provides shared block.

As you probably already noticed, application in MJS is a tree of blocks. The key diffeerence of shared tree is that blocks from shared tree do not have a View. But anyway it is better to show how it looks like.

```js
// Shared.js
import { Cmd } from 'mangojuice-core';
import * as User from './User';

export const createModel = () => ({
  user: User.createModel(),
});
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

export const createModel = () => ({
  name: '',
  authorized: false
});
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

#### Usege of shared block
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
// Main.js
import * as User from './User';
...
export const View = ({ model, shared }) => (
  <div>
    {shared.user.authorized && <div>Hello, {shared.user.name}</div>}
    {!shared.user.authorized && (
      <button onClick={User.Logic.Login}>Login</button>
    )}
    <SearchForm.View model={model.form} />
    <SearchResilts.View model={model.results} />
  </div>
)
```
**`const View = ({ model, shared })`** now also have a `shared` field in props which is just a model of shared block.

#### App depends on Shared (and how to disable it)
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
Above we showed how to handle events from View. But complex applications could have to handle not only view events, but some more, like WebSocket messages, or pressing `esc` in window scope, or some interval. The good news is that MJS also provide a way to handle this kind of events.

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
**`port({ model, destroy, exec })`** is a special function of logic object, that is aimed to subscribe to some global events and execute commands. In above example we just made an interval for refreshing search results every 10 secs. Also we subscribed to a destroy Promise, which will be resolved when block will be removed.

## Conclusion
That is all about basics of MJS. It was inspired by many existing frameworks/languages that the author used for a while. So probably there is no something extremly new. MJS is all about defining scalable, flexible way of implementing logic of your app in MVC manner with help of Command Pattern and of the latest available ES6/ES7 features, like decorators or async/await.

## Documentation
TODO
