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

All these three parts are together called a `Block`.

For example, let's say you have a page with a very complicated search form and a results list. In this case you will probably have three logical Blocks: (1) Search form, (2) Results list and (3) Block that manage search form and results (parent for 1 and 2).

#### The App is three trees
The app in MJS represented as a tree. And each part of the block have completely separated tree. For instance, to nest Search form to the Main block you should nest the Seach form's model to the Main block's model, nest the Search form's logic to the Main block's logic and the Search form's view to the Main block's view.

#### The Logic is a commands factory
Logic consists of commands creators and `config` function which defines children Blocks, init commands, etc. When you call command creator it will return a command. Command is an object with all necessary information like type of a command, command's name, function that should be executed, array of arguments. In MJS defined three types of a command:

* `Cmd.update` – command for updating a model
* `Cmd.batch` – command for executing another commands
* `Cmd.execLatest/Cmd.execLatest` – command for executing async task

#### The Process put everything together
There is one thing that makes everything to work, called `Process`. It is an internal class and you won't interact with it directly. But you should understand that the instance of this class created for every Model of every Block of your app and it actually executes commands and it takes care of View updates when model of a Block changed. The instance of the Process initially created during the run of the up.

Now you have very basic understanding what MJS is and how it works. Let's implement the search page mentioned above to see MJS in action.

### Search Form Block
```js
// SearchForm.js
import React from 'mangojuice-react';
import { Cmd } from 'mangojuice-core';

export const createModel = () => ({
  query: '',
  count: 0
});
export const Logic = {
  name: 'SearchForm',

  computed() {
    return {
      count: () => this.model.query.length
    };
  },

  @Cmd.update
  SetQuery(e) {
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
    <button onClick={Logic.Search}>Search {model.count} chars</button>
  </div>
);
```
Module `SearchForm.js` is a `Block`. It exports `createModel`, `View` and `Logic`. Only this kind of modules can be called `Block` in MJS. Let's break down the code above and examine all the pieces in more detail.

**`const createModel = () =>`** is a function (factory) that returns the initial state of the block.

**`name: 'SearchForm'`** defines a name for the logical block. Each logic object should have a name for easier debugging and namespacing commands.

**`computed() {`** is a way to attach some computation to the model's fields. In the example we are computing amount of symbols in the search query.

**`@Cmd.update`** defines that the decorated function is a function for updating a model. MJS implements the so called `command pattern`, and `Cmd` decorators help to convert plain function to a command creator with defined behaviour.

For instance, if you call `Logic.SetQuery(1,2,3)` it will return you a plain object (command), which contains original function, array of arguments `[1,2,3]` and some other internally used information, that defines that this is a command for updating a model.

If you are familiar with Redux, then you can think about it as an action creator tied with function that will actually handle the action.

**`@Cmd.nope`** is a no-op. We will see why this is useful a bit later. And there is some more command types in MJS core and we will meet them a bit later too.

**`const View = ({ model }) =>`** is just a pure-functional React component, which renders the form. MJS passes a `props` object  with the model.

### Runing the Block
```js
// index.js
import { Run } from 'mangojuice-core';
import { Mounter } from 'mangojuice-react';
import * as SearchForm from './SearchForm.js';

Run.mount({
  app: SearchForm,
  mounter: new Mounter('#container')
});
```

**`Run.mount`** sets up a block you are passing in `app` field (object with `View`, `createModel` and `Logic`) and mounts it to the DOM using the specific View mounter instance.

**`new Mounter('#container')`** contains a logic for mapping a model to DOM changes via a View function. Mounter actually defines how View functions should be writtern, what they should return, what arguments they should accept, etc. Actual mounters are not a part of the MJS core. In a core you can find just an interface for a mounter. In the example above we are using React for writing Views and hence we are using Mounter.

### Search Results Block
```js
// SearchResults.js
import React from 'mangojuice-react';
import { Cmd, Task } from 'mangojuice-core';

export const createModel = () => ({
  results: [],
  query: '',
  loading: false,
  error: ''
});
export const Tasks = {
  async findResults() {
    const res = await this.call(fetch, 'www.google.com/search');
    return res.items;
  }
};
export const Logic = {
  name: 'SearchResults',

  @Cmd.batch
  Search(query) {
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
  InitSearch(query) {
    return { query, loading: true };
  },

  @Cmd.update
  SetResultsList(results) {
    return {
      results,
      loading: false
    };
  },

  @Cmd.update
  HandleSearchFail(err) {
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
**`@Cmd.batch`** is a command type aimed to execute other commands. `batch` commands should decide what will be done next and in what order. Returned value can be an array, a command or null/undefined.

**`@Cmd.execLatest`**. There is also `@Cmd.execEvery`. It is a command for executing an async function. A command of this type should return a `Task` object, which defines what async function should be executed, and also the success and fail handler commands. The success command will be executed with a value returned by async function, and the fail command will be executed with an error object thrown by the async function. The success and fail commands are optional (a no-op will be executed if there is no defined handler). A task function gets the same arguments as the command function which created the task.

**`this.call(fetch, 'www.google.com/search')`** is the task. This was inspired by `redux-saga` and needed to achive two goals:

* it creates a task cancellation point and
* it makes easier to test a task (you can pass some testing `call` func in a context which will mock results of `call`s).

If some task marked as `execLatest`, then only one async fucnction can be executing at one point in time. So, if you will execute the task while another one already executing, then exucuting task will be canceled and the new one will be started.

### All together – Main Block
```js
// Main.js
import React from 'mangojuice-react';
import { Cmd } from 'mangojuice-core';
import * as SearchForm from './SearchForm';
import * as SearchResults from './SearchResults';

export const createModel = () => ({
  form: SearchForm.createModel(),
  results: SearchResults.createModel()
});
export const Logic = {
  name: 'Main',

  children() {
    return {
      form: this.nest(SearchForm.Logic).handler(this.HandleSearchForm),
      results: this.nest(SearchResults.Logic),
    };
  },

  @Cmd.batch
  HandleSearchForm(cmd) {
    if (cmd.is(SearchForm.Logic.Search.Before)) {
      return SearchResults.Logic.Search(model.form.query).model(this.model.results);
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
The main block contains the Form and Results blocks and ties them together.

**`const createModel = () =>`** as usual makes the initial block's model, but it also creates models for children blocks using their own `createModel` functions.

**`children()`** helps to define what logic should be associated with what model. In the example above we are saying that the block have two child logical blocks.

**`form: nest(SearchForm.Logic).handler(this.HandleSearchForm),`** not only defines that `SearchForm.Logic` will be associated with the `form` model's field, but also set a handler command that will be executed before and after each command from `SearchForm` block. The handler will be also called for every nested block of the `SearchForm` and so on.

**`if (cmd.is(SearchForm.Logic.Search.Before))`** catches `Search` command from `SearchForm` block before the execution. There is also `SearchForm.Logic.Search.After` to handle the command after execution.

**`SearchResults.Logic.Search(model.form.query).model(model.results)`** creates a command associated with some exact model. It means that the command will be executed with some exact model passed in a first argument. By default all commands returned by some command of the `Main` block are associated with `Main`'s model. But in the example we want to trigger a command of a child block, and `.model(model.results)` helps to do it.

**`<SearchForm.View model={model.form} />`** shows View of `SearchForm` for a model `form`.

As you can see, to nest one block to another you have to nest all three parts of a block separately: Model, Logic, View. It is a bit of overhead, but it makes nesting very flexible. For example, you can use the Logic of one block and completely replace a View of this block to something more suitable in some concrete situation. Or you can create a model for a child block in some specific way.


### Multiple counter problem
What if each item should have some specific logic, like a counter? In MJS that is not a problem. Let's create a separate Block for result item with counter logic and then use it in `SearchResults`:
```js
// ResultsItem.js
import React from 'mangojuice-react';
import { Cmd } from 'mangojuice-core';

export const createModel = (text) => ({
  counter: 0,
  text
});
export const Logic = {
  name: 'ResultsItem',

  @Cmd.update
  Increment(amount) {
    return { counter: this.model.counter + amount };
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

**`Logic.Increment(1)`** demonstrates how you can bind a command with arguments.

```js
// SearchResults.js
...
import * as ResultsItem from './ResultsItem';

export const Logic = {
  children() {
    return {
      results: this.nest(ResultsItem.Logic)
    };
  }
  ...
  @Cmd.update
  SetResultsList(results) {
    return {
      results: results.map(x => ResultsItem.createModel(x)),
      loading: false
    };
  },
  ...
}
export const View = ({ model }) => (
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <ResultsItem.View model={x} />)}
  </div>
)
```
**`results: this.nest(ResultsItem.Logic)`** associates a logic with `results` model's field. But `results` is an array. In this case logic will be associated with each object of an array.

**`results: results.map(x => ResultsItem.createModel(x))`** in `SetResultsList` command just creates a `ResultsItem` model for each result item.

**`<ResultsItem.View model={x} />`** in the View shows View of `ResultsItem` block for each result item.

As you can see, MJS understands two types of child model: object and array. If child model is an object then the Logic will be associated with this object. If an array – with each element of the arra. MJS do not support primitives as child model. If child model becomes `null` then Logic for the child will be destroyed.

## Going deeper
What if you would need to add a user to your app? Obviously the user model should be easily accessable from anywhere in the app. For example to check if the user is authorized or not, or to check a role of the user. For these cases, when you need to have a widely used model, MJS provides the so called `Shared Block`.

As you probably already noticed, an application in MJS is a tree of blocks. The key diffeerence of a shared tree is that blocks from a shared tree do not have a View.

```js
// Shared.js
import { Cmd } from 'mangojuice-core';
import * as User from './User';

export const createModel = () => ({
  user: User.createModel(),
});
export const Logic = {
  name: 'Shared',
  children() {
    return {
      user: this.nest(User.Logic).singleton(),
    };
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

**`this.nest(User.Logic).singleton()`** makes `User.Logic` logic as "singleton" in scope of your app. It means that all commands form the `User.Logic` will be automatically binded to the `shared.user` model. So, if you will want to execute the `User.Logic.Login` commands from anywhere in the app, then you will just need to execute `User.Logic.Login` instead of `User.Logic.Login().model(shared.user)`

Shared block's Logic is singleton by default. So, all commands from your shared block can be executed without `.model(shared)` part.

### Usege of shared block
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

**`shared: Shared`** adds a shared block tree to the application.

```js
// Main.js
import * as User from './User';

export const Logic = {
  ...
  computed() {
    const { shared, depends } = this;
    return {
      userAuthorized: depends(shared.user).compute(() => shared.user.authorized),
      userName: depends(shared.user).compute(() => shared.user.name),
      user: depends(shared.user).compute(() => shared.user),
    };
  },
};

export const View = ({ model }) => (
  <div>
    {model.userAuthorized && <div>Hello, {model.userName}</div>}
    {!model.userAuthorized && (
      <button onClick={User.Logic.Login}>Login</button>
    )}
    <SearchForm.View model={model.form} />
    <SearchResults.View model={model.results} />
  </div>
)
```

**`computed()`** here you can see two new things provided to the `computed` function – shared and depends. In MJS defined very strict rule – View renders only one Model and updates only when the model updated. It means that we can't use `shared` model directly in the View. But with `computed` we can get something from `shared` and **subscribe** to changes in used models. In the example we are defining two new computed fields `userAuthorized` and `userName` which are computed from `shared.user` model. Also, by `depends` we are defining that this computed fields should be recomputed when given model will be changed. So, everytime when `shared.user` changed, then `Main` model also will be changed and the view of `Main` will be rerendered.

**`user: depends(shared.user).compute(() => shared.user)`** alternitabely to define two separate computed fields you can just grab a full `shared.user` model object and used in the View as part of the Model.

### Dealing with the real world
We showed above how to handle events from a View. But complex applications could have to handle not only view events, but some more, like WebSocket messages, or presses to `esc` in the window scope, or execute someting in the interval. The good news is that MJS also provides a way to handle this kind of events.

```js
// SearchResults.js
import { Utils } from 'mangojuice-core';
...
export const Logic = {
  ...
  port() {
    // For reducing `this`
    const { model, destroy, exec, shared } = this;

    Utils.handleModelChanges(shared.user, destroy, () => {
      // Do something when shared.user changed
    });

    const timer = setInterval(() => {
      exec(this.Search(model.query));
    }, 10000);

    destroy.then(() => clearInterval(timer));
  }
  ...
}
```
**`port()`** is a special function of logic object, that is aimed to subscribe to some global events. In the example we just made an interval for refreshing the search results every 10 secs.

**`destroy.then(() => clearInterval(timer));`** subscribes to the destroy Promise, which will be resolved when the block is removed. For example when model of the `SearchResults` will be removed – set to `null` – in `Main` block.

**`Utils.handleModelChanges`** helps to subscribe to shared model changes. In the handler you can check new state of the model and exec some commands.

## Conclusion
These are the basics of MJS. It was inspired by many existing frameworks/languages that the author used for a while. So probably there is not anything extremely new. MJS is all about defining a scalable, flexible way of implementing logic of your app in following the MVC pattern with the help of the Command Pattern and of the latest available ES6/ES7 features, like decorators or async/await.

## API Reference
TODO
