# MangoJuice

> The missing `Model-Controller` part for your favorite `View` library.

* **Highly scalable** because of strongly decoupled Model, View and Controller, and good definition of logical Block of your application
* **Forces you to write good decomposed code**, which is easy to scale, test and debug.
* **Fully-featured core**, no need to add any middlewares to do just regular things
* **View library-agnostic**
* **Support for server-rendering**(if your View library also supports it, of course)
* **Lightweight** (zero dependencies, around **5kb minified gzipped**)
* **Easy to learn and fun to use**

## Installation
```bash
npm install mangojuice-core  # general set of tools
npm install mangojuice-react # using React as view rendering
npm install babel-plugin-transform-decorators-legacy
```
MangoJuice relies on decorators, so you should add decorators transformer to your babel configuration.

## Live example
You can play with the search app explained in this README here:

[![Edit multipage](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/mangojuicejs/mangojuice-example-app/tree/master/)

## Quick start
MangoJuice (MJ) consists of three main parts:
* **Model** – plain function `const createModel = () => ({ ... })`, which defines the initial model state of your logical block.
* **Logic** - `class MyLogic { ... };` with a set of command factories
* **View** – plain function `const View = ({ model }, { Logic }) => { ... }`, which should display something based on the current state of a model. If your favorite View library is React, then View is a plain-function component.

All these three parts are together called `Block`.

For example, let's say you have a page with a very complicated search form and a results list. In this case you will probably have three logical Blocks: (1) Search form, (2) Results list and (3) Block that manage search form and results (parent for 1 and 2).

But before we will show some example code, let's learn a bit more theory about MJ to have a better understanding what is going on!

#### The App is "three trees"
The app in MJ represented as a tree. And each part of the block have completely separated tree. For instance, to nest Search form to the Main block you should nest the Seach form's model to the Main block's model, nest the Search form's logic to the Main block's logic and the Search form's view to the Main block's view.

#### The Logic class is a commands factory
MJ implements a so called `Command pattern`. The main idea of this pattern is that logical operation is not executed instantly as you call it, instead you create an object called `Command` which defines what function should be executed with what arguments and pass it to a "processor" which will take care of the execution.
Logic class in MJ is just a set of command factories (functions which returns a `Command` object). To convert a regular class method to a command factory you should decorate it with `@cmd` decorator.
There is three type of commands in MJ, differentiated by the type of returned value:

* command for updating a model – should return a plain "update" object
* command for executing another commands – should return a command or an array of commands
* command for async tasks – should return a special Task object

#### The Process put everything together
There is one thing that makes everything to work, called `Process`. It is an internal class and you won't interact with it directly. But you should understand that the instance of this class created for every Model of every Block of your app and it actually executes commands and it takes care of View updates when model of a Block changed. The instance of the Process initially created during the run of the up.

Now you have very basic understanding what MJ is and how it works. Let's implement the search page mentioned above to see MJ in action.

### Search Form Block
```js
// SearchForm.js
import React from 'mangojuice-react';
import { cmd } from 'mangojuice-core';

class SearchForm {
  computed() {
    return {
      count: () => this.model.query.length
    };
  }
  @cmd SetQuery(e) {
    return { query: e.target.value };
  }
  @cmd Search() {
  }
}

export const Logic = SearchForm;
export const createModel = () => ({
  query: '',
  count: 0
});
export const View = ({ model }, { Logic }) => (
  <div>
    <h2>Complicated Search Form</h2>
    <input value={model.query} onChange={Logic.SetQuery} /><br />
    <button onClick={Logic.Search}>Search {model.count} chars</button>
  </div>
);
```
Module `SearchForm.js` is a `Block`. It exports `createModel`, `View` and `Logic`. Only this kind of modules can be called `Block` in MJ. Let's break down the code above and examine all the pieces in more detail.

**`const createModel = () =>`** is a function (factory) that returns the initial state of the block.

**`computed() {`** is a way to attach some computation to the model's fields. In the example we are computing amount of symbols in the search query.

**`@cmd`** converts decorated function to a command factory. So, if you will call the decorated function like `this.SetQuery(1,2,3)` you will get a `Command` instance with `[1,2,3]` arguments inside and original `SetQuery` function as function that shuold be executed.

In the example we have two commands: `SetQuery` and `Search`. `SetQuery` is a command which updates a model, because it returns a plain object. `Search` returns nothing and hence do nothing. But it is still useful for reacting on the execution of this command in parent blocks, we will see later.

**`const View = ({ model }, { Logic }) =>`** is just a pure-functional React component, which renders the form. MJ passes a `props` object  with the model and `context` object with a `Logic` class instance.

### Runing the Block
```js
// index.js
import { run, mount } from 'mangojuice-core';
import { Mounter } from 'mangojuice-react';
import * as SearchForm from './SearchForm.js';

mount(new Mounter('#container'), run(SearchForm));
```

**`run`** accept a Block as a first arguments. It creates a model using `createModel` function of the block, create an instance of `Logic` class and tie model and logic together. It returns an object with `proc` – `Process` instance, `model` with created model and `run` – Promise which will be resolved when the block will be fully initialized.

**`mount`** accept a Mounter instance as a first argument and the result of `run` as a second argument. It renders a `View` of a block used in `run` to render a model.

**`new Mounter('#container')`** contains a logic for mapping a model to DOM changes via a View function. Mounter actually defines how View functions should be writtern, what they should return, what arguments they should accept, etc. Actual mounters are not a part of the MJ core. In a core you can find just an interface for a mounter. In the example above we are using React for writing Views and hence we are using Mounter.

### Search Results Block
```js
// SearchResults.js
import React from 'mangojuice-react';
import { cmd, task } from 'mangojuice-core';

export const Tasks = {
  async findResults() {
    const { result, error } = await this.call(fetch, 'www.google.com/search');
    if (error) {
      throw new Error('Search was failed to execute');
    }
    return result.items;
  }
};
class SearchResults {
  @cmd Search(query) {
    return [
      this.InitSearch(query),
      this.DoSearch()
    ];
  }
  @cmd DoSearch() {
    return task(Tasks.findResults)
      .success(this.SetResultsList)
      .fail(this.HandleSearchFail);
  }
  @cmd InitSearch(query) {
    return { query, loading: true };
  }
  @cmd SetResultsList(results) {
    return {
      results,
      loading: false
    };
  }
  @cmd HandleSearchFail(err) {
    return {
      error: 'Something weird happened',
      loading: false
    };
  }
}
export const Logic = SearchResults;
export const createModel = () => ({
  results: [],
  query: '',
  loading: false,
  error: ''
});
export const View = ({ model }, { Logic }) => (
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <div key={i}>{x}</div>)}
  </div>
)
```
**`@cmd Search(query)`** is an example of command which decide what should be executed next. It returns and array of commands. These commands will be executed by a processor in the defined order.

**`@cmd DoSearch()`** is an example of command which defines what async task should be executed. The command returns a `Task` object, which defines what async function should be executed, and also the success and fail handler commands. The success command will be executed with a value returned by async function, and the fail command will be executed with an error object thrown by the async function. The success and fail commands are optional (a no-op will be executed if there is no defined handler). A task function gets the same arguments as the command function which created the task (be default). You can override arguments by `.args(a,b,c)` function of a `Task`.

By default task is a "single thread". It means that only one async fucnction can be executing at one point in time for one model. So, if you will execute the task while another one already executing, then the exucuting task will be canceled and the new one will be started.

To make a task "multi-thread" you just need to call `.multithread()` of `Task`. With this, if you will call a task command 10 times, it will be executed 10 times in parallel.

**`this.call(fetch, 'www.google.com/search')`** in the task executes `fetch` with provided arguments list. You can call `fetch` directly, but `this.call` is doing some very useful things:

* it handles errors with Go lang way, so you do not need to wrap it with try/catch, just check the `error` value in the returned object
* it defines a task cancellation point, so you will cancel a task while the request is in progress, then the request will be cancelled and that task won't be executed further `fetch` function.

### All together – Main Block
```js
// Main.js
import React from 'mangojuice-react';
import { cmd, logicOf } from 'mangojuice-core';
import * as SearchForm from './SearchForm';
import * as SearchResults from './SearchResults';

class Main {
  children() {
    return {
      form: SearchForm.Logic,
      results: SearchResults.Logic
    };
  }
  hubAfter(cmd) {
    if (cmd.is(logicOf(this.model.form).Search)) {
      return logicOf(this.model.results).Search(this.model.form.query);
    }
  }
};
export const Logic = Main;
export const createModel = () => ({
  form: SearchForm.createModel(),
  results: SearchResults.createModel()
});
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

**`hubAfter(cmd)`** is a special function you can define in the logic class, which executed with every command from every children logic **after** the command will be executed. And it is extremely useful for handling child logic in the parrent one. There is also `hubBefore` for catching commands **before** execution. The function should return a command or a list of commands which should be executed next.

**`if (cmd.is(logicOf(this.model.form).Search)) {`** in the example we are catching a command `Search` of `SearchForm` logic to execute a `Search` command of `SearchResults` logic. `SearchResults` and `SearchForm` known nothing about each other, which make them completely separated. True scalability.

**`<SearchForm.View model={model.form} />`** shows View of `SearchForm` for a model `form`.

As you can see, to nest one block to another you have to nest all three parts of a block separately: Model, Logic, View. It is a bit of overhead, but it makes nesting very flexible. For example, you can use the Logic of one block and completely replace a View of this block to something more suitable in some concrete situation. Or you can create a model for a child block in some specific way.


### Multiple counter problem
What if each item should have some specific logic, like a counter? In MJ that is not a problem. Let's create a separate Block for result item with counter logic and then use it in `SearchResults`:
```js
// ResultItem.js
import React from 'mangojuice-react';
import { cmd } from 'mangojuice-core';

class ResultItem {
  @cmd Increment(amount) {
    return { counter: this.model.counter + amount };
  }
};
export const Logic = ResultItem
export const createModel = (text) => ({
  counter: 0,
  text
});
export const View = ({ model }, { Logic }) => (
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
import * as ResultItem from './ResultItem';

class SearchResults = {
  children() {
    return {
      results: ResultItem.Logic
    };
  }
  ...
  @cmd SetResultsList(results) {
    return {
      results: results.map(x => ResultItem.createModel(x)),
      loading: false
    };
  }
  ...
}
export const View = ({ model }) => (
  <div>
    {model.loading && <div>Loading...</div>}
    {model.error && <div>{model.error}</div>}
    {model.results.map((x, i) => <ResultItem.View model={x} />)}
  </div>
)
```
**`results: ResultItem.Logic`** associates a logic with `results` model's field. But `results` is an array. In this case logic will be associated with each object of an array.

**`results: results.map(x => ResultItem.createModel(x))`** in `SetResultsList` command just creates a `ResultItem` model for each result item.

**`<ResultItem.View model={x} />`** in the View shows View of `ResultItem` block for each result item.

As you can see, MJ understands two types of child model: object and array. If child model is an object then the Logic will be associated with this object. If an array – with each element of the array. MJ do not support primitives as child model. If child model becomes `null` then Logic for the child will be destroyed.

## Going deeper
What if you would need to add a user to your app? Obviously the user model should be easily accessable from anywhere in the app. For example to check if the user is authorized or not, or to check a role of the user. For these cases, when you need to have a widely used model, MJ provides the so called `shared` model. Shared model could be any object, but if your `shared` object will be a model of MJ block, then you will get some benifits. For example model changes obeserving, or commands handling.

As you probably already know, an application in MJ is a tree of blocks. The key diffeerence of a shared tree is that blocks from a shared tree do not have a View. Let's cerate a Shared block for storing a user.

```js
// Shared.js
import { cmd } from 'mangojuice-core';
import * as User from './User';

class Shared {
  children() {
    return {
      user: User.Logic
    };
  }
};
export const Logic = Shared;
export const createModel = () => ({
  user: User.createModel()
});

// User.js
import { cmd } from 'mangojuice-core';

class User {
  @cmd Login() {
    return {
      authorized: true,
      name: 'Test User'
    }
  }
}
export const Logic = User;
export const createModel = () => ({
  name: '',
  authorized: false
});
```

You should already understand what is going on above, isn't it? No? Ok. In the example above we defined two Blocks: `Shared` and `User`. `User` block nested to a `Shared` block. `User` logic have command `Login` for updating a user's model. It is making a user to be "logged in" by setting `authorized` field to true and `name` of logged in user. `User` logic is a bit simplified, in the real world `Login` would probably return a task which will go to the server and get authorized user object, ect.

### Usege of shared block
```js
// index.js
...
import * as Shared from './Shared';

const sharedRun = run(Shared);
const appRun = run(Main, { shared: sharedRun.model });
mount(new Mounter('#container'), appRun);
```

**`const sharedRun = run(Shared)`** we are running `Shared` block, which as you know creates a model, creates logic instance and returns run results – model, process instance.

**`const appRun = run(Main, { shared: sharedRun.model })`** then we are running app main block but with one addition – we are providing a `shared` model. Now, in any logic of the app tree you will be able to access the shared model by `this.shared`.

```js
// Main.js
import { depends, cmd, logicOf, handleAfter } from 'mangojuice-core';

class Main {
  ...
  computed() {
    return {
      user: depends(this.shared.user).compute(() => this.shared.user)
    };
  }
  @cmd Login() {
    return logicOf(this.shared.user).Login();
  }
};
...
export const View = ({ model }, { Logic }) => (
  <div>
    {model.user.authorized && <div>Hello, {model.user.name}</div>}
    {!model.user.authorized && (
      <button onClick={Logic.Login}>Login</button>
    )}
    <SearchForm.View model={model.form} />
    <SearchResults.View model={model.results} />
  </div>
)
```

In MJ defined some very strict rules:
* View can render(own) only one model
* View updated only when the rendered model (without child models) updated.

These rules means, that you can't access `shared` model in the View. Also it means that the View won't update if shared model changed. And that is where `computed()` part of the logic starts to be extremely useful.

**`user: depends(this.shared.user)`** in `computed` defines that `user` field of the model depends on `this.shared.user` model. It means that when `this.shared.model` will be updated the `model.user` will be also updated and it will make the View of `Main` block to be updated. Sweet.

You can define more than one dependent models in `depends` function as next arguments. You can even define child model as a dependency. And it might be useful, because sometimes parent View should show some part of child models and because of rule one above, the View of `Main` won't be updated when, for example, child model of `SearchForm` will be updated.

### Dealing with the real world
We showed above how to handle events from a View. But complex applications could have to handle not only view events, but some more, like WebSocket messages, or presses to `esc` in the window scope, or execute someting in the interval. The good news is that MJ also provides a way to handle this kind of events.

```js
// SearchResults.js
...
class SearchResults {
  ...
  port(exec, destroyed) {
    const timer = setInterval(() => {
      exec(this.Search(this.model.query));
    }, 10000);

    const stopHandler = handleAfter(this.shared.user, (cmd) => {
      // it is like `hubAfter` but invoked only for "own" commands,
      // not for commands from children logics. You can react on command
      // here however you want, most comman case – run another command
    });

    destroyed.then(() => clearInterval(timer));
    destroyed.then(stopHandler);
  }
  ...
}
```
**`port(exec, destroyed)`** is a special function of logic object, that is aimed to subscribe to some global events. In the example we just made an interval for refreshing the search results every 10 secs.

**`destroyed.then(() => clearInterval(timer));`** subscribes to the destroy Promise, which will be resolved when the block is destroyed. For example when model of the `SearchResults` will be removed – set to `null` – in parent `Main` block.

## Conclusion
These are the basics of MJ. It was inspired by many existing frameworks/languages that the author used for a while. So probably there is not anything extremely new. MJ is all about defining a scalable, flexible way of implementing logic of your app in following the MVC pattern with the help of the Command Pattern and of the latest available ES6/ES7 features, like decorators or async/await. Enjoy!

## API Reference
TODO
