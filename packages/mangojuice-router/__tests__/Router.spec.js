import { child, cmd, logicOf, handleLogicOf } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import createMemoryHistory from "history/createMemoryHistory";
import Router from "mangojuice-router";


const createSharedBlock = (rootRoutes, historyOpts = {}) => {
  return {
    createModel: () => ({
      router: Router.createModel()
    }),
    Logic: class SharedBlock {
      children() {
        return {
          router: child(Router.Logic, {
            routes: rootRoutes,
            createHistory: createMemoryHistory.bind(null, historyOpts)
          })
        };
      }
      port({ exec, destroy }) {
        handleLogicOf(this.model.router, destroy, () => {
          exec(this.HandleRouter);
        });
      }
      @cmd HandleRouter() {}
    }
  }
}

describe("Router basic usage cases", () => {
  const NewsRoutes = {
    All: Router.route('/'),
    Category: Router.route('/:category'),
  }
  const MainRoutes = {
    Articles: Router.route('/articles', null, { default: true }),
    News: Router.route('/news', NewsRoutes),
  }
  const DefaultRoutes = {
    Root: Router.route('/', null, { default: true }),
  }

  it("should activate default non root route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
  });

  it("should recognize nested route on startup", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '123' });
  });

  it("should recognize not found route at root", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/some_page' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeTruthy();
  });

  it("should recognize not found route at nested level", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/category/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeFalsy();
    expect(Router.isNotFound(app.model.router, NewsRoutes)).toBeTruthy();
  });

  it("should be able to change the route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    await app.proc.exec(logicOf(app.model.router).Push(NewsRoutes.Category({ category: '321' })));

    expect(Router.isChanged(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isChanged(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(Router.isLeft(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '321' });
  });

  it("should provide a way to create a link", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const route = NewsRoutes.Category({ category: '321' });
    const cmd = logicOf(app.model.router).Push(route);
    const link = Router.link(app.model.router, route);

    expect(link).toEqual({ onClick: cmd, href: '/news/321/' });
  });

  it("should provide a way to create a link with command creator", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const route = NewsRoutes.All();
    const cmd = logicOf(app.model.router).Push(route);
    const link = Router.link(app.model.router, route);

    expect(link).toEqual({ onClick: cmd, href: '/news/' });
  });

  it("should keep search query on default route redirection", async () => {
    const SharedBlock = createSharedBlock(DefaultRoutes, { initialEntries: [ '/?utm_campaign=tbbe' ] });
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, DefaultRoutes.Root)).toBeTruthy();
    expect(app.model.router.query).toEqual({ utm_campaign: 'tbbe' });
  });

  it("should preventDefault on push if provided", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const event = { preventDefault: jest.fn() };

    await app.proc.exec(logicOf(app.model.router).Push(NewsRoutes.Category({ category: '321' }), event));

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("should preventDefault on replace if provided", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const event = { preventDefault: jest.fn() };

    await app.proc.exec(logicOf(app.model.router).Replace(NewsRoutes.Category({ category: '321' }), event));

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("should push new item to browser history", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).meta.history;

    await app.proc.exec(logicOf(app.model.router).Push(NewsRoutes.Category({ category: '321' }, {a: '123'})));

    expect(history.length).toEqual(2);
    expect(history.entries[1].pathname).toEqual('/news/321/');
    expect(history.entries[1].search).toEqual('?a=123');
  });

  it("should replace last item in browser history", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).meta.history;

    await app.proc.exec(logicOf(app.model.router).Replace(NewsRoutes.Category({ category: '321' }, {a: '123'})));

    expect(history.length).toEqual(1);
    expect(history.entries[0].pathname).toEqual('/news/321/');
    expect(history.entries[0].search).toEqual('?a=123');
  });

  it("should provide a way to navigate only query with keeping existing by default", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).meta.history;

    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ a: '123' })));
    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ b: '321' })));
    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ c: '111' })));

    expect(history.length).toEqual(4);
    expect(history.entries[3].pathname).toEqual('/articles');
    expect(history.entries[3].search).toEqual('?a=123&b=321&c=111');
  });

  it("should provide a way replace query with new one", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).meta.history;

    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ a: '123' })));
    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ b: '321' }, false)));
    await app.proc.exec(logicOf(app.model.router).Push(Router.Query({ c: '111' })));

    expect(history.length).toEqual(4);
    expect(history.entries[3].pathname).toEqual('/articles');
    expect(history.entries[3].search).toEqual('?b=321&c=111');
  });

  it("should allow only unique params in patterns", async () => {
    const WrongRoutes = {
      Articles: Router.route('/articles/:id'),
      News: Router.route('/news/:id'),
    }
    const SharedBlock = createSharedBlock(WrongRoutes);
    await expect(runWithTracking({ app: SharedBlock })).rejects.toBeDefined();
  });

  it("should track params uniqueness in children", async () => {
    const WrongChildreRoutes = {
      Latest: Router.route('/latest/:id'),
    }
    const WrongRoutes = {
      Articles: Router.route('/articles/:id'),
      News: Router.route('/news/:newsId', WrongChildreRoutes),
    }
    const SharedBlock = createSharedBlock(WrongRoutes);
    await expect(runWithTracking({ app: SharedBlock })).rejects.toBeDefined();
  });
});
